import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CircleCheck,
  Clock3,
  Copy,
  Dumbbell,
  Flag,
  ListPlus,
  MoreVertical,
  Pause,
  Play,
  Plus,
  StickyNote,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox, Input, Label, Select, Textarea } from '@/components/ui/input';
import { PageLoader } from '@/components/shared/loading-screen';
import { ExercisePickerDialog } from '@/features/exercises/ExercisePickerDialog';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  addExerciseToWorkout,
  addSet,
  cancelWorkoutSession,
  deleteSet,
  duplicateSet,
  finishWorkoutSession,
  getElapsedSeconds,
  moveExercise,
  moveSet,
  pauseWorkoutSession,
  removeExercise,
  resumeWorkoutSession,
  startWorkoutSession,
  updateExerciseNotes,
  updateSet,
  updateWorkoutDetails,
} from '@/features/workouts/workoutService';
import { useWorkoutDetail } from '@/hooks/useHecoData';
import { REST_PRESETS, SET_TYPE_LABELS, WORKOUT_STATUS_LABELS } from '@/lib/constants';
import { formatDateTime } from '@/lib/dates';
import { getErrorMessage } from '@/lib/errors';
import { cn, formatNumber, formatTimer } from '@/lib/utils';
import { setVolumeKg } from '@/lib/metrics';
import { useRestTimerStore } from '@/stores/restTimerStore';
import type {
  SetType,
  WeightUnit,
  WorkoutExerciseWithSets,
  WorkoutSet,
} from '@/types/models';

export default function WorkoutSessionPage() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const workout = useWorkoutDetail(workoutId);
  const { settings } = useAuth();
  const navigate = useNavigate();
  const startRest = useRestTimerStore((state) => state.start);
  const skipRest = useRestTimerStore((state) => state.skip);

  const [, setTick] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [removeExerciseTarget, setRemoveExerciseTarget] = useState<WorkoutExerciseWithSets | null>(null);
  const [noteExercise, setNoteExercise] = useState<WorkoutExerciseWithSets | null>(null);
  const [exerciseNoteDraft, setExerciseNoteDraft] = useState('');
  const [setNote, setSetNote] = useState<{ exercise: WorkoutExerciseWithSets; item: WorkoutSet } | null>(
    null,
  );
  const [setNoteDraft, setSetNoteDraft] = useState('');
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialisedNotes = useRef(false);

  const readOnly = workout?.status === 'finished' || workout?.status === 'cancelled';

  useEffect(() => {
    if (workout?.status !== 'in_progress') return;
    const interval = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [workout?.status]);

  useEffect(() => {
    if (!workout) return;
    if (!initialisedNotes.current) {
      setNotesDraft(workout.notes);
      initialisedNotes.current = true;
    }
  }, [workout]);

  useEffect(() => {
    if (!workout || readOnly || !initialisedNotes.current) return;
    if (notesDraft === workout.notes) return;
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      setNotesSaving(true);
      void updateWorkoutDetails(workout.id, { notes: notesDraft })
        .catch((error) => toast.error(getErrorMessage(error)))
        .finally(() => setNotesSaving(false));
    }, 900);
    return () => {
      if (notesTimer.current) clearTimeout(notesTimer.current);
    };
  }, [notesDraft, workout, readOnly]);

  const totals = useMemo(() => {
    if (!workout) return { sets: 0, completed: 0, volumeKg: 0, exercises: 0 };
    const allSets = workout.exercises.flatMap((exercise) => exercise.sets);
    return {
      sets: allSets.length,
      completed: allSets.filter((set) => set.isCompleted).length,
      volumeKg: allSets.reduce((total, set) => total + setVolumeKg(set), 0),
      exercises: workout.exercises.length,
    };
  }, [workout]);

  if (workout === undefined) return <PageLoader />;

  if (workout === null) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Entrenamiento no encontrado"
        description="Puede que se haya eliminado o que pertenezca a otra cuenta."
        action={
          <Button asChild>
            <Link to="/workouts">Volver a entrenamientos</Link>
          </Button>
        }
      />
    );
  }

  const elapsed = workout.status === 'paused' ? workout.durationSeconds : getElapsedSeconds(workout);

  const run = async (action: () => Promise<void>, success?: string) => {
    setActionLoading(true);
    try {
      await action();
      if (success) toast.success(success);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddExercise = async (exercise: Parameters<typeof addExerciseToWorkout>[1]) => {
    await addExerciseToWorkout(workout.id, exercise, {
      defaultSetCount: 3,
      defaultUnit: settings?.weightUnit ?? 'kg',
      restSeconds: settings?.restSeconds ?? 90,
    });
    toast.success(`${exercise.name} añadido a la sesión`);
  };

  const handleCompleteSet = async (exercise: WorkoutExerciseWithSets, set: WorkoutSet) => {
    const next = !set.isCompleted;
    await updateSet(workout.id, exercise.id, set.id, { isCompleted: next });
    if (next && settings?.autoRest !== false) {
      startRest(set.restSeconds || settings?.restSeconds || 90, exercise.nameSnapshot);
    }
  };

  const handleFinish = async () => {
    await run(async () => {
      await finishWorkoutSession(workout.id);
      skipRest();
      setFinishOpen(false);
      toast.success('Entrenamiento finalizado. Buen trabajo.');
      navigate(`/history/${workout.id}`);
    });
  };

  const handleCancel = async () => {
    await run(async () => {
      await cancelWorkoutSession(workout.id);
      setCancelOpen(false);
      toast.success('Entrenamiento cancelado');
      navigate('/workouts');
    });
  };

  const statusVariant =
    workout.status === 'finished'
      ? 'success'
      : workout.status === 'paused'
        ? 'warning'
        : workout.status === 'cancelled'
          ? 'danger'
          : workout.status === 'scheduled'
            ? 'secondary'
            : 'default';

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/workouts">
            <ArrowLeft className="h-4 w-4" /> Entrenamientos
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {workout.status === 'scheduled' && (
            <Button
              loading={actionLoading}
              onClick={() => void run(() => startWorkoutSession(workout.id), 'Sesión iniciada')}
            >
              <Play className="h-4 w-4" /> Iniciar sesión
            </Button>
          )}
          {workout.status === 'in_progress' && (
            <Button
              variant="secondary"
              loading={actionLoading}
              onClick={() => void run(() => pauseWorkoutSession(workout.id), 'Sesión en pausa')}
            >
              <Pause className="h-4 w-4" /> Pausar
            </Button>
          )}
          {workout.status === 'paused' && (
            <Button
              loading={actionLoading}
              onClick={() => void run(() => resumeWorkoutSession(workout.id), 'Sesión reanudada')}
            >
              <Play className="h-4 w-4" /> Reanudar
            </Button>
          )}
          {!readOnly && (
            <Button
              variant="success"
              onClick={() => setFinishOpen(true)}
              disabled={workout.status === 'scheduled'}
              title={workout.status === 'scheduled' ? 'Inicia la sesión antes de finalizarla' : undefined}
            >
              <Flag className="h-4 w-4" /> Finalizar
            </Button>
          )}
          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Más acciones">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    setNameDraft(workout.name);
                    setNameOpen(true);
                  }}
                >
                  <Dumbbell className="h-4 w-4" /> Renombrar sesión
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPickerOpen(true)}>
                  <ListPlus className="h-4 w-4" /> Añadir ejercicio
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => setCancelOpen(true)}>
                  <X className="h-4 w-4" /> Cancelar entrenamiento
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-panel p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant}>{WORKOUT_STATUS_LABELS[workout.status]}</Badge>
              {workout.planName && <Badge variant="secondary">Rutina · {workout.planName}</Badge>}
            </div>
            <h1 className="mt-2.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {workout.name}
            </h1>
            <p className="mt-1 text-xs text-muted">
              {workout.startedAt
                ? `Iniciada ${formatDateTime(workout.startedAt)}`
                : workout.scheduledAt
                  ? `Programada ${formatDateTime(workout.scheduledAt)}`
                  : 'Sin iniciar'}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Tiempo de sesión
            </p>
            <p className="tabular font-display text-3xl font-semibold text-accent">
              {formatTimer(elapsed)}
            </p>
            <p className="text-[10px] text-muted">
              {workout.status === 'paused'
                ? 'Cronómetro en pausa'
                : workout.status === 'finished'
                  ? 'Duración final'
                  : workout.status === 'scheduled'
                    ? 'Empieza al iniciar'
                    : 'En directo'}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Ejercicios', value: `${totals.exercises}` },
            { label: 'Series', value: `${totals.completed}/${totals.sets}` },
            { label: 'Volumen efectivo', value: `${formatNumber(totals.volumeKg)} kg` },
            {
              label: 'Progreso',
              value: totals.sets > 0 ? `${Math.round((totals.completed / totals.sets) * 100)}%` : '0%',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-border/70 bg-surface/40 px-3 py-2.5 text-center"
            >
              <p className="tabular text-sm font-semibold">{item.value}</p>
              <p className="text-[10px] text-muted">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_0.8fr]">
        <div className="space-y-3">
          {workout.exercises.length === 0 ? (
            <EmptyState
              icon={Dumbbell}
              title="Esta sesión todavía no tiene ejercicios"
              description={
                readOnly
                  ? 'No se registraron ejercicios en esta sesión.'
                  : 'Añade tu primer ejercicio para empezar a registrar series.'
              }
              action={
                !readOnly ? (
                  <Button onClick={() => setPickerOpen(true)}>
                    <Plus className="h-4 w-4" /> Añadir ejercicio
                  </Button>
                ) : undefined
              }
            />
          ) : (
            workout.exercises.map((exercise, exerciseIndex) => (
              <Card key={exercise.id} className="overflow-hidden">
                <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-sm font-bold text-accent">
                      {String(exerciseIndex + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-[15px]">{exercise.nameSnapshot}</CardTitle>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary">{exercise.sets.length} series</Badge>
                        {exercise.notes && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                            <StickyNote className="h-3 w-3" /> Nota
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {!readOnly && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Mover ejercicio arriba"
                          disabled={exerciseIndex === 0}
                          onClick={() => void run(() => moveExercise(workout.id, exercise.id, -1))}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Mover ejercicio abajo"
                          disabled={exerciseIndex === workout.exercises.length - 1}
                          onClick={() => void run(() => moveExercise(workout.id, exercise.id, 1))}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label="Acciones del ejercicio">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => {
                                setExerciseNoteDraft(exercise.notes);
                                setNoteExercise(exercise);
                              }}
                            >
                              <StickyNote className="h-4 w-4" /> Nota del ejercicio
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setPickerOpen(true)}>
                              <Plus className="h-4 w-4" /> Añadir otro ejercicio
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              destructive
                              onSelect={() => setRemoveExerciseTarget(exercise)}
                            >
                              <Trash2 className="h-4 w-4" /> Quitar de la sesión
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-1">
                  {exercise.notes && (
                    <p className="mb-2 rounded-lg bg-surface/50 px-3 py-2 text-[11px] leading-relaxed text-muted">
                      {exercise.notes}
                    </p>
                  )}

                  <div className="hidden grid-cols-[28px_minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_70px_36px_32px] gap-2 px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted sm:grid">
                    <span>#</span>
                    <span>Peso</span>
                    <span>Reps</span>
                    <span>Tipo</span>
                    <span>Descanso</span>
                    <span className="text-center">Hecha</span>
                    <span />
                  </div>

                  <div className="space-y-1.5">
                    {exercise.sets.map((set, setIndex) => (
                      <SetRow
                        key={set.id}
                        workoutId={workout.id}
                        exercise={exercise}
                        set={set}
                        index={setIndex}
                        last={setIndex === exercise.sets.length - 1}
                        readOnly={Boolean(readOnly)}
                        onToggleComplete={() => void handleCompleteSet(exercise, set)}
                        onStartRest={() =>
                          startRest(set.restSeconds || 90, exercise.nameSnapshot)
                        }
                        onOpenNote={() => {
                          setSetNoteDraft(set.notes);
                          setSetNote({ exercise, item: set });
                        }}
                        onError={(message) => toast.error(message)}
                      />
                    ))}
                  </div>

                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full border border-dashed border-border"
                      onClick={() =>
                        void run(() =>
                          addSet(workout.id, exercise.id, {
                            unit: settings?.weightUnit ?? 'kg',
                            restSeconds: settings?.restSeconds ?? 90,
                          }),
                        )
                      }
                    >
                      <Plus className="h-3.5 w-3.5" /> Añadir serie
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}

          {!readOnly && workout.exercises.length > 0 && (
            <Button variant="secondary" className="w-full" onClick={() => setPickerOpen(true)}>
              <ListPlus className="h-4 w-4" /> Añadir otro ejercicio
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-accent" /> Descanso rápido
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="grid grid-cols-5 gap-1.5">
                {REST_PRESETS.slice(0, 10).map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() => startRest(seconds)}
                    className="rounded-lg border border-border bg-surface/50 py-2 text-[11px] font-semibold text-muted transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    {seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-muted">
                {settings?.autoRest !== false
                  ? 'El descanso se inicia automáticamente al completar una serie.'
                  : 'Inicia el descanso manualmente desde aquí o desde cada serie.'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-accent" /> Notas de la sesión
                {notesSaving && <span className="text-[10px] font-normal text-muted">Guardando…</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <Textarea
                rows={5}
                value={notesDraft}
                readOnly={readOnly}
                onChange={(event) => setNotesDraft(event.target.value)}
                placeholder="¿Cómo ha ido? Sensaciones, cargas a subir, molestias…"
              />
              <p className="mt-1 text-[10px] text-muted">
                {readOnly ? 'Sesión cerrada' : 'Se guarda automáticamente mientras escribes.'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-accent" /> Resumen de sesión
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Duración</span>
                <span className="tabular font-semibold">{formatTimer(elapsed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Series completadas</span>
                <span className="tabular font-semibold">
                  {totals.completed} de {totals.sets}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Volumen efectivo</span>
                <span className="tabular font-semibold">{formatNumber(totals.volumeKg)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Ejercicios</span>
                <span className="tabular font-semibold">{totals.exercises}</span>
              </div>
              {readOnly && (
                <Button asChild variant="secondary" size="sm" className="mt-2 w-full">
                  <Link to={`/history/${workout.id}`}>Ver en historial</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ExercisePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleAddExercise}
      />

      <ConfirmDialog
        open={finishOpen}
        onOpenChange={setFinishOpen}
        title="Finalizar entrenamiento"
        description={
          totals.completed === 0
            ? 'No has marcado ninguna serie como completada. Puedes finalizar igualmente y editarlo más tarde desde el historial.'
            : `Se guardarán ${totals.completed} series completadas y ${formatNumber(totals.volumeKg)} kg de volumen efectivo. Después podrás consultar y editar la sesión en el historial.`
        }
        confirmLabel="Finalizar sesión"
        loading={actionLoading}
        onConfirm={handleFinish}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar entrenamiento"
        description="La sesión se marcará como cancelada y no contará en tus estadísticas. Los datos se conservarán en el historial."
        confirmLabel="Sí, cancelar"
        destructive
        loading={actionLoading}
        onConfirm={handleCancel}
      />

      <ConfirmDialog
        open={Boolean(removeExerciseTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveExerciseTarget(null);
        }}
        title="Quitar ejercicio"
        description={`Se eliminarán ${removeExerciseTarget?.sets.length ?? 0} series de ${
          removeExerciseTarget?.nameSnapshot ?? 'este ejercicio'
        } en esta sesión.`}
        confirmLabel="Quitar ejercicio"
        destructive
        loading={actionLoading}
        onConfirm={() => {
          if (!removeExerciseTarget) return;
          void run(async () => {
            await removeExercise(workout.id, removeExerciseTarget.id);
            setRemoveExerciseTarget(null);
          }, 'Ejercicio eliminado de la sesión');
        }}
      />

      <Dialog open={nameOpen} onOpenChange={setNameOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Renombrar entrenamiento</DialogTitle>
            <DialogDescription>Este nombre aparecerá en tu historial y estadísticas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="workout-name">Nombre</Label>
            <Input
              id="workout-name"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              maxLength={80}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setNameOpen(false)}>
              Cancelar
            </Button>
            <Button
              loading={actionLoading}
              onClick={() =>
                void run(async () => {
                  await updateWorkoutDetails(workout.id, { name: nameDraft });
                  setNameOpen(false);
                }, 'Nombre actualizado')
              }
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(noteExercise)}
        onOpenChange={(open) => {
          if (!open) setNoteExercise(null);
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Nota del ejercicio</DialogTitle>
            <DialogDescription>{noteExercise?.nameSnapshot}</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={exerciseNoteDraft}
            onChange={(event) => setExerciseNoteDraft(event.target.value)}
            placeholder="Técnica, ajustes de máquina, sensaciones…"
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setNoteExercise(null)}>
              Cancelar
            </Button>
            <Button
              loading={actionLoading}
              onClick={() => {
                if (!noteExercise) return;
                void run(async () => {
                  await updateExerciseNotes(workout.id, noteExercise.id, exerciseNoteDraft);
                  setNoteExercise(null);
                }, 'Nota guardada');
              }}
            >
              Guardar nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(setNote)}
        onOpenChange={(open) => {
          if (!open) setSetNote(null);
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Nota de la serie</DialogTitle>
            <DialogDescription>
              {setNote?.exercise.nameSnapshot} · serie {setNote?.item.setNumber}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={setNoteDraft}
            onChange={(event) => setSetNoteDraft(event.target.value)}
            placeholder="Ej. última repetición asistida, dolor leve…"
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSetNote(null)}>
              Cancelar
            </Button>
            <Button
              loading={actionLoading}
              onClick={() => {
                if (!setNote) return;
                void run(async () => {
                  await updateSet(workout.id, setNote.exercise.id, setNote.item.id, {
                    notes: setNoteDraft,
                  });
                  setSetNote(null);
                }, 'Nota guardada');
              }}
            >
              Guardar nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SetRow({
  workoutId,
  exercise,
  set,
  index,
  last,
  readOnly,
  onToggleComplete,
  onStartRest,
  onOpenNote,
  onError,
}: {
  workoutId: string;
  exercise: WorkoutExerciseWithSets;
  set: WorkoutSet;
  index: number;
  last: boolean;
  readOnly: boolean;
  onToggleComplete: () => void;
  onStartRest: () => void;
  onOpenNote: () => void;
  onError: (message: string) => void;
}) {
  const saveNumber = async (field: 'weight' | 'reps', raw: string) => {
    const value = Number.parseFloat(raw.replace(',', '.'));
    if (!Number.isFinite(value) || value < 0) {
      onError('Introduce un número válido.');
      return;
    }
    const normalized =
      field === 'reps' ? Math.min(1000, Math.round(value)) : Math.min(2000, value);
    if (normalized === set[field]) return;
    try {
      await updateSet(workoutId, exercise.id, set.id, { [field]: normalized });
    } catch (error) {
      onError(getErrorMessage(error));
    }
  };

  const saveRest = async (raw: string) => {
    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value) || value < 0) return;
    try {
      await updateSet(workoutId, exercise.id, set.id, { restSeconds: Math.min(900, value) });
    } catch (error) {
      onError(getErrorMessage(error));
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border px-2 py-2 transition-colors sm:grid sm:grid-cols-[28px_minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_70px_36px_32px] sm:items-center sm:gap-2',
        set.isCompleted
          ? 'border-success/25 bg-success/[0.04]'
          : 'border-border/60 bg-surface/20',
      )}
    >
      <div className="flex items-center justify-between sm:block">
        <span
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold',
            set.isCompleted ? 'bg-success/15 text-success' : 'bg-surface text-muted',
          )}
        >
          {set.isCompleted ? <Check className="h-3 w-3" /> : set.setNumber}
        </span>
        <span className="text-[10px] font-medium text-muted sm:hidden">
          {set.isCompleted ? 'Completada' : `Serie ${index + 1}`}
        </span>
        <div className="flex items-center gap-1 sm:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onStartRest}
            aria-label="Iniciar descanso"
          >
            <Timer className="h-3.5 w-3.5" />
          </Button>
          {!readOnly && (
            <Button variant="ghost" size="icon-sm" onClick={onOpenNote} aria-label="Nota de la serie">
              <StickyNote className={cn('h-3.5 w-3.5', set.notes && 'text-warning')} />
            </Button>
          )}
          <Checkbox
            checked={set.isCompleted}
            disabled={readOnly}
            onChange={onToggleComplete}
            aria-label={`Marcar serie ${set.setNumber} como completada`}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1 sm:mt-0">
        <Input
          key={`w-${set.id}`}
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0"
          max="2000"
          defaultValue={set.weight}
          disabled={readOnly}
          onBlur={(event) => void saveNumber('weight', event.target.value)}
          aria-label={`Peso de la serie ${set.setNumber}`}
          className="h-9 min-w-0 px-2 text-center text-xs tabular"
        />
        <Select
          value={set.weightUnit}
          disabled={readOnly}
          onChange={(event) =>
            void updateSet(workoutId, exercise.id, set.id, {
              weightUnit: event.target.value as WeightUnit,
            }).catch((error) => onError(getErrorMessage(error)))
          }
          aria-label="Unidad de peso"
          className="h-9 w-[58px] shrink-0 px-1.5 text-[11px]"
        >
          <option value="kg">kg</option>
          <option value="lb">lb</option>
        </Select>
      </div>

      <div className="mt-1.5 flex items-center gap-2 sm:mt-0">
        <Input
          key={`r-${set.id}`}
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          max="1000"
          defaultValue={set.reps}
          disabled={readOnly}
          onBlur={(event) => void saveNumber('reps', event.target.value)}
          aria-label={`Repeticiones de la serie ${set.setNumber}`}
          className="h-9 min-w-0 flex-1 px-2 text-center text-xs tabular"
        />
        <span className="text-[10px] text-muted sm:hidden">reps</span>
      </div>

      <div className="mt-1.5 sm:mt-0">
        <Select
          value={set.setType}
          disabled={readOnly}
          onChange={(event) =>
            void updateSet(workoutId, exercise.id, set.id, {
              setType: event.target.value as SetType,
            }).catch((error) => onError(getErrorMessage(error)))
          }
          aria-label="Tipo de serie"
          className="h-9 px-2 text-[11px]"
        >
          {Object.entries(SET_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-1.5 flex items-center gap-1 sm:mt-0">
        <Input
          key={`s-${set.id}`}
          type="number"
          inputMode="numeric"
          step="5"
          min="0"
          max="900"
          defaultValue={set.restSeconds}
          disabled={readOnly}
          onBlur={(event) => void saveRest(event.target.value)}
          aria-label={`Descanso de la serie ${set.setNumber}`}
          className="h-9 min-w-0 px-1.5 text-center text-[11px] tabular"
        />
        <span className="text-[10px] text-muted">s</span>
      </div>

      <div className="hidden justify-center sm:flex">
        <Checkbox
          checked={set.isCompleted}
          disabled={readOnly}
          onChange={onToggleComplete}
          aria-label={`Marcar serie ${set.setNumber} como completada`}
        />
      </div>

      {!readOnly ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Acciones de la serie ${set.setNumber}`}>
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onStartRest}>
              <Timer className="h-4 w-4" /> Iniciar descanso
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onOpenNote}>
              <StickyNote className="h-4 w-4" /> {set.notes ? 'Editar nota' : 'Añadir nota'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                void duplicateSet(workoutId, exercise.id, set.id).catch((error) =>
                  onError(getErrorMessage(error)),
                )
              }
            >
              <Copy className="h-4 w-4" /> Duplicar serie
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={last}
              onSelect={() =>
                void moveSet(workoutId, exercise.id, set.id, 1).catch((error) =>
                  onError(getErrorMessage(error)),
                )
              }
            >
              <ArrowDown className="h-4 w-4" /> Bajar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onSelect={() =>
                void deleteSet(workoutId, exercise.id, set.id).catch((error) =>
                  onError(getErrorMessage(error)),
                )
              }
            >
              <Trash2 className="h-4 w-4" /> Eliminar serie
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <CircleCheck
          className={cn('mx-auto hidden h-4 w-4 sm:block', set.isCompleted ? 'text-success' : 'text-muted/40')}
        />
      )}
    </div>
  );
}
