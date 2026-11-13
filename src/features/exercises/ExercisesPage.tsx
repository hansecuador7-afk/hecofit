import {
  Dumbbell,
  Heart,
  Library,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomExerciseDialog } from '@/features/exercises/CustomExerciseDialog';
import { toggleExerciseFavorite } from '@/features/exercises/exerciseService';
import { useActiveWorkout, useExercises, useFavorites } from '@/hooks/useHecoData';
import { DIFFICULTY_LABELS, EQUIPMENT_LABELS, MUSCLE_LABELS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import { addExerciseToWorkout } from '@/features/workouts/workoutService';
import { deleteCustomExercise } from '@/services/sync';
import { cn } from '@/lib/utils';
import {
  EQUIPMENT,
  MUSCLE_GROUPS,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from '@/types/models';

type SourceFilter = 'all' | 'global' | 'custom';

export default function ExercisesPage() {
  const exercises = useExercises();
  const favorites = useFavorites();
  const activeWorkout = useActiveWorkout();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all');
  const [equipment, setEquipment] = useState<Equipment | 'all'>('all');
  const [source, setSource] = useState<SourceFilter>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);

  const favoriteIds = useMemo(
    () =>
      new Set(
        favorites.flatMap((favorite) =>
          favorite.exerciseId
            ? [favorite.exerciseId]
            : favorite.userExerciseId
              ? [favorite.userExerciseId]
              : [],
        ),
      ),
    [favorites],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return exercises.filter((exercise) => {
      if (source !== 'all' && exercise.source !== source) return false;
      if (muscle !== 'all' && exercise.primaryMuscle !== muscle) return false;
      if (equipment !== 'all' && exercise.equipment !== equipment) return false;
      if (favoritesOnly && !favoriteIds.has(exercise.id)) return false;
      if (!normalized) return true;
      return (
        exercise.name.toLowerCase().includes(normalized) ||
        exercise.description.toLowerCase().includes(normalized) ||
        exercise.instructions.toLowerCase().includes(normalized)
      );
    });
  }, [exercises, query, muscle, equipment, source, favoritesOnly, favoriteIds]);

  const handleFavorite = async (exercise: Exercise) => {
    try {
      const added = await toggleExerciseFavorite(exercise);
      toast.success(added ? 'Añadido a favoritos' : 'Eliminado de favoritos');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleAddToActive = async (exercise: Exercise) => {
    if (!activeWorkout) {
      navigate('/workouts/new');
      return;
    }
    setAdding(true);
    try {
      await addExerciseToWorkout(activeWorkout.id, exercise);
      toast.success(`${exercise.name} añadido a ${activeWorkout.name}`);
      setSelected(null);
      navigate(`/workouts/${activeWorkout.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCustomExercise(deleteTarget.id);
      toast.success('Ejercicio personalizado eliminado');
      setDeleteTarget(null);
      setSelected(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const customCount = exercises.filter((exercise) => exercise.source === 'custom').length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Biblioteca"
        title="Ejercicios"
        description={`${exercises.length} ejercicios disponibles · ${customCount} personalizados. Catálogo global de solo lectura.`}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Crear ejercicio
          </Button>
        }
      />

      <div className="rounded-2xl border border-border bg-panel p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar ejercicio, descripción o instrucciones…"
              className="pl-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Select
              value={muscle}
              onChange={(event) => setMuscle(event.target.value as MuscleGroup | 'all')}
              aria-label="Filtrar por músculo"
            >
              <option value="all">Todos los músculos</option>
              {MUSCLE_GROUPS.map((item) => (
                <option key={item} value={item}>
                  {MUSCLE_LABELS[item]}
                </option>
              ))}
            </Select>
            <Select
              value={equipment}
              onChange={(event) => setEquipment(event.target.value as Equipment | 'all')}
              aria-label="Filtrar por equipamiento"
            >
              <option value="all">Todo el equipamiento</option>
              {EQUIPMENT.map((item) => (
                <option key={item} value={item}>
                  {EQUIPMENT_LABELS[item]}
                </option>
              ))}
            </Select>
            <Button
              variant={favoritesOnly ? 'default' : 'secondary'}
              onClick={() => setFavoritesOnly((value) => !value)}
              className="col-span-2 sm:col-span-1"
            >
              <Star className={cn('h-4 w-4', favoritesOnly && 'fill-current')} /> Favoritos
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={source} onValueChange={(value) => setSource(value as SourceFilter)}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="global">Catálogo</TabsTrigger>
              <TabsTrigger value="custom">Mis ejercicios</TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-[11px] text-muted">
            {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {exercises.length === 0 ? (
        <EmptyState
          icon={Library}
          title="La biblioteca está vacía"
          description="No se encontraron ejercicios en el catálogo local. Crea tu primer ejercicio personalizado."
          action={
            <Button onClick={() => setEditorOpen(true)}>
              <Plus className="h-4 w-4" /> Crear ejercicio
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          compact
          icon={Search}
          title="Sin coincidencias"
          description="Prueba con otro nombre, cambia los filtros o crea un ejercicio personalizado."
          action={
            <Button variant="secondary" onClick={() => setEditorOpen(true)}>
              <Plus className="h-4 w-4" /> Crear ejercicio
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((exercise) => {
            const isFavorite = favoriteIds.has(exercise.id);
            return (
              <div
                key={exercise.id}
                className="group flex flex-col rounded-2xl border border-border/80 bg-panel p-4 transition-colors hover:border-border-strong"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Dumbbell className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{exercise.name}</p>
                      <p className="text-[11px] text-muted">
                        {MUSCLE_LABELS[exercise.primaryMuscle]}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleFavorite(exercise)}
                    aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-surface',
                      isFavorite ? 'text-warning' : 'text-muted/50',
                    )}
                  >
                    <Star className={cn('h-4 w-4', isFavorite && 'fill-current')} />
                  </button>
                </div>

                <p className="mt-3 line-clamp-2 min-h-[32px] text-[11px] leading-relaxed text-muted">
                  {exercise.description || 'Sin descripción.'}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="secondary">
                    <Wrench className="h-3 w-3" /> {EQUIPMENT_LABELS[exercise.equipment]}
                  </Badge>
                  {exercise.difficulty && (
                    <Badge variant="outline">{DIFFICULTY_LABELS[exercise.difficulty]}</Badge>
                  )}
                  {exercise.source === 'custom' && <Badge variant="info">Propio</Badge>}
                </div>

                <div className="mt-auto flex items-center gap-2 pt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelected(exercise)}
                  >
                    Ver detalle
                  </Button>
                  {exercise.source === 'custom' && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar ejercicio"
                        onClick={() => {
                          setEditing(exercise);
                          setEditorOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Eliminar ejercicio"
                        onClick={() => setDeleteTarget(exercise)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-danger" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent size="lg">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle>{selected.name}</DialogTitle>
                    <DialogDescription>
                      {MUSCLE_LABELS[selected.primaryMuscle]} ·{' '}
                      {EQUIPMENT_LABELS[selected.equipment]}
                      {selected.difficulty ? ` · ${DIFFICULTY_LABELS[selected.difficulty]}` : ''}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {selected.description && (
                <p className="text-sm leading-relaxed text-muted">{selected.description}</p>
              )}

              {selected.secondaryMuscles.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Músculos secundarios
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selected.secondaryMuscles.map((muscle) => (
                      <Badge key={muscle} variant="secondary">
                        {MUSCLE_LABELS[muscle]}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Instrucciones
                </p>
                <p className="mt-1.5 whitespace-pre-line rounded-xl border border-border bg-surface/40 p-3 text-xs leading-relaxed text-foreground/90">
                  {selected.instructions || 'Este ejercicio no tiene instrucciones detalladas.'}
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button
                  className="flex-1"
                  loading={adding}
                  onClick={() => void handleAddToActive(selected)}
                >
                  <Heart className="h-4 w-4" />
                  {activeWorkout ? `Añadir a ${activeWorkout.name}` : 'Iniciar entrenamiento'}
                </Button>
                {selected.source === 'custom' && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditing(selected);
                        setSelected(null);
                        setEditorOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDeleteTarget(selected);
                        setSelected(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CustomExerciseDialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditing(null);
        }}
        exercise={editing}
        onSaved={() => setEditing(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar ejercicio personalizado"
        description="Se eliminará de tu biblioteca. Las sesiones históricas conservarán el nombre y las series registradas."
        confirmLabel="Eliminar ejercicio"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
