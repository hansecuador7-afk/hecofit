import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dumbbell,
  Layers,
  NotebookPen,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  StickyNote,
  Tag,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldError, Input, Label, Select, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/features/auth/AuthProvider';
import { useExercises, useNotes, usePlans, useWorkouts } from '@/hooks/useHecoData';
import { MUSCLE_LABELS, QUICK_NOTES } from '@/lib/constants';
import { formatDateTime, formatRelativeDay } from '@/lib/dates';
import { getErrorMessage } from '@/lib/errors';
import { newId, nowIso } from '@/lib/utils';
import { deleteNote, saveNote } from '@/services/sync';
import type { Note, NoteType } from '@/types/models';

const NOTE_TYPES: Array<{ value: NoteType; label: string }> = [
  { value: 'general', label: 'General' },
  { value: 'workout', label: 'Entrenamiento' },
  { value: 'routine', label: 'Rutina' },
  { value: 'exercise', label: 'Ejercicio' },
];

const noteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'El título debe tener al menos 2 caracteres.')
    .max(100, 'El título es demasiado largo.'),
  body: z
    .string()
    .trim()
    .min(1, 'Escribe el contenido de la nota.')
    .max(5000, 'La nota es demasiado larga (máximo 5000 caracteres).'),
  noteType: z.enum(['general', 'workout', 'routine', 'exercise']),
  linkId: z.string(),
  pinned: z.boolean(),
});

type NoteFormValues = z.infer<typeof noteSchema>;

function noteTarget(note: Note): string | null {
  if (note.noteType === 'workout' && note.workoutId) return note.workoutId;
  if (note.noteType === 'routine' && note.planId) return note.planId;
  if (note.noteType === 'exercise') return note.exerciseId ?? note.userExerciseId;
  return null;
}

export default function NotesPage() {
  const notes = useNotes();
  const workouts = useWorkouts();
  const plans = usePlans();
  const exercises = useExercises();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<NoteType | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: '',
      body: '',
      noteType: 'general',
      linkId: '',
      pinned: false,
    },
  });

  const noteType = watch('noteType');
  const pinned = watch('pinned');

  const workoutMap = useMemo(
    () => new Map(workouts.map((workout) => [workout.id, workout])),
    [workouts],
  );
  const planMap = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);
  const exerciseMap = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return notes.filter((note) => {
      if (typeFilter !== 'all' && note.noteType !== typeFilter) return false;
      if (!normalized) return true;
      return (
        note.title.toLowerCase().includes(normalized) ||
        note.body.toLowerCase().includes(normalized)
      );
    });
  }, [notes, query, typeFilter]);

  const linkedLabel = (note: Note): string | null => {
    const target = noteTarget(note);
    if (!target) return null;
    if (note.noteType === 'workout') return workoutMap.get(target)?.name ?? 'Entrenamiento eliminado';
    if (note.noteType === 'routine') return planMap.get(target)?.name ?? 'Rutina eliminada';
    return exerciseMap.get(target)?.name ?? 'Ejercicio eliminado';
  };

  const openCreate = () => {
    setEditing(null);
    reset({ title: '', body: '', noteType: 'general', linkId: '', pinned: false });
    setDialogOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditing(note);
    const linkId =
      note.noteType === 'workout'
        ? note.workoutId ?? ''
        : note.noteType === 'routine'
          ? note.planId ?? ''
          : note.exerciseId
            ? `global:${note.exerciseId}`
            : note.userExerciseId
              ? `custom:${note.userExerciseId}`
              : '';
    reset({
      title: note.title,
      body: note.body,
      noteType: note.noteType,
      linkId,
      pinned: note.pinned,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: NoteFormValues) => {
    if (!user) {
      toast.error('No hay una sesión activa.');
      return;
    }
    setSaving(true);
    try {
      const timestamp = nowIso();
      const base: Note = {
        id: editing?.id ?? newId(),
        userId: user.id,
        title: values.title.trim(),
        body: values.body.trim(),
        noteType: values.noteType,
        workoutId: null,
        planId: null,
        exerciseId: null,
        userExerciseId: null,
        pinned: values.pinned,
        createdAt: editing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      };
      if (values.noteType === 'workout' && values.linkId) base.workoutId = values.linkId;
      if (values.noteType === 'routine' && values.linkId) base.planId = values.linkId;
      if (values.noteType === 'exercise' && values.linkId) {
        if (values.linkId.startsWith('global:')) base.exerciseId = values.linkId.slice(7);
        else if (values.linkId.startsWith('custom:')) base.userExerciseId = values.linkId.slice(7);
      }
      await saveNote(base);
      toast.success(editing ? 'Nota actualizada' : 'Nota creada');
      setDialogOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const togglePinned = async (note: Note) => {
    setBusy(true);
    try {
      await saveNote({ ...note, pinned: !note.pinned, updatedAt: nowIso() });
      toast.success(note.pinned ? 'Nota desfijada' : 'Nota fijada');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteNote(deleteTarget.id);
      toast.success('Nota eliminada');
      setDeleteTarget(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const linkOptions = () => {
    if (noteType === 'workout') {
      return workouts
        .slice()
        .sort((a, b) => (b.startedAt ?? b.createdAt).localeCompare(a.startedAt ?? a.createdAt))
        .map((workout) => (
          <option key={workout.id} value={workout.id}>
            {workout.name}
          </option>
        ));
    }
    if (noteType === 'routine') {
      return plans.map((plan) => (
        <option key={plan.id} value={plan.id}>
          {plan.name}
        </option>
      ));
    }
    if (noteType === 'exercise') {
      return exercises.map((exercise) => (
        <option
          key={exercise.id}
          value={exercise.source === 'global' ? `global:${exercise.id}` : `custom:${exercise.id}`}
        >
          {exercise.name} · {MUSCLE_LABELS[exercise.primaryMuscle]}
          {exercise.source === 'custom' ? ' (personalizado)' : ''}
        </option>
      ));
    }
    return [];
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Cuaderno"
        title="Notas"
        description="Guarda sensaciones, recordatorios técnicos y observaciones. Puedes vincularlas a sesiones, rutinas o ejercicios."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nueva nota
          </Button>
        }
      />

      {notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="Tu cuaderno está vacío"
          description="Escribe tu primera nota para recordar qué funcionó, qué cargas subir o cómo te sentiste en una sesión."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Crear primera nota
            </Button>
          }
        />
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-panel p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por título o contenido…"
                  className="pl-10"
                />
              </div>
              <Tabs
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as NoteType | 'all')}
              >
                <TabsList>
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  {NOTE_TYPES.map((type) => (
                    <TabsTrigger key={type.value} value={type.value}>
                      {type.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              compact
              icon={Search}
              title="Sin notas que coincidan"
              description="Cambia el filtro de tipo o prueba otra búsqueda."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('');
                    setTypeFilter('all');
                  }}
                >
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((note) => {
                const label = linkedLabel(note);
                return (
                  <Card
                    key={note.id}
                    className={
                      note.pinned ? 'border-accent/30 bg-accent/[0.025]' : undefined
                    }
                  >
                    <CardContent className="flex h-full flex-col p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={note.noteType === 'general' ? 'secondary' : 'default'}>
                            <Tag className="h-3 w-3" />
                            {NOTE_TYPES.find((type) => type.value === note.noteType)?.label ??
                              note.noteType}
                          </Badge>
                          {note.pinned && (
                            <Badge variant="warning">
                              <Pin className="h-3 w-3" /> Fijada
                            </Badge>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={note.pinned ? 'Desfijar nota' : 'Fijar nota'}
                            disabled={busy}
                            onClick={() => void togglePinned(note)}
                          >
                            {note.pinned ? (
                              <PinOff className="h-3.5 w-3.5" />
                            ) : (
                              <Pin className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Editar nota"
                            onClick={() => openEdit(note)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Eliminar nota"
                            onClick={() => setDeleteTarget(note)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-danger" />
                          </Button>
                        </div>
                      </div>

                      <h3 className="mt-2.5 font-display text-base font-semibold leading-snug">
                        {note.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-5 flex-1 whitespace-pre-line text-xs leading-relaxed text-muted">
                        {note.body}
                      </p>

                      {label && (
                        <div className="mt-3">
                          {note.noteType === 'workout' && note.workoutId ? (
                            <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                              <Link to={`/history/${note.workoutId}`}>
                                <Dumbbell className="h-3 w-3" /> {label}
                              </Link>
                            </Button>
                          ) : note.noteType === 'routine' && note.planId ? (
                            <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                              <Link to={`/routines/${note.planId}`}>
                                <Layers className="h-3 w-3" /> {label}
                              </Link>
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 text-[11px] text-muted">
                              <Dumbbell className="h-3 w-3" /> {label}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/50 pt-2 text-[10px] text-muted">
                        <span>{formatRelativeDay(note.updatedAt)}</span>
                        <span>{formatDateTime(note.updatedAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar nota' : 'Nueva nota'}</DialogTitle>
            <DialogDescription>
              Las notas se guardan en este dispositivo y se sincronizan con tu cuenta cuando la nube
              está configurada.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1.5">
              <Label htmlFor="note-title">Título</Label>
              <Input
                id="note-title"
                maxLength={100}
                placeholder="Ej. Subir carga en sentadilla"
                {...register('title')}
              />
              <FieldError>{errors.title?.message}</FieldError>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="note-type">Tipo</Label>
                <Select
                  id="note-type"
                  {...register('noteType', {
                    onChange: () => setValue('linkId', ''),
                  })}
                >
                  {NOTE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note-link">
                  {noteType === 'workout'
                    ? 'Sesión vinculada'
                    : noteType === 'routine'
                      ? 'Rutina vinculada'
                      : noteType === 'exercise'
                        ? 'Ejercicio vinculado'
                        : 'Vínculo'}
                </Label>
                <Select
                  id="note-link"
                  disabled={noteType === 'general'}
                  {...register('linkId')}
                >
                  <option value="">
                    {noteType === 'general' ? 'Sin vínculo' : 'Sin vínculo (opcional)'}
                  </option>
                  {linkOptions()}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note-body">Contenido</Label>
              <Textarea
                id="note-body"
                rows={6}
                maxLength={5000}
                placeholder="¿Qué quieres recordar de esta sesión, rutina o ejercicio?"
                {...register('body')}
              />
              <FieldError>{errors.body?.message}</FieldError>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {QUICK_NOTES.map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => {
                      const current = watch('body');
                      setValue('body', current ? `${current}\n${quick}` : quick, {
                        shouldValidate: true,
                      });
                    }}
                    className="rounded-full border border-border bg-surface/60 px-2.5 py-1 text-[10px] text-muted transition-colors hover:border-accent/30 hover:text-foreground"
                  >
                    + {quick}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-surface/25 px-3 py-2.5">
              <div>
                <p className="text-xs font-semibold">Fijar nota</p>
                <p className="text-[10px] text-muted">Aparecerá primero en tu cuaderno.</p>
              </div>
              <Switch checked={pinned} onCheckedChange={(checked) => setValue('pinned', checked)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                <NotebookPen className="h-4 w-4" />
                {editing ? 'Guardar cambios' : 'Crear nota'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar nota"
        description={`Se eliminará «${deleteTarget?.title ?? 'esta nota'}». Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar nota"
        destructive
        loading={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
