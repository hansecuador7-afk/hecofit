import {
  ArrowDownUp,
  ArrowLeft,
  CalendarClock,
  Copy,
  Download,
  Dumbbell,
  Flag,
  Layers,
  Pencil,
  Play,
  StickyNote,
  Timer,
  Trash2,
  Trophy,
  Weight,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/empty-state';
import { PageLoader } from '@/components/shared/loading-screen';
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
import { Input, Label, Textarea } from '@/components/ui/input';
import { useWorkoutDetail } from '@/hooks/useHecoData';
import { exportWorkoutCsv } from '@/features/profile/backup';
import { duplicateWorkout, startWorkoutSession, updateWorkoutDetails } from '@/features/workouts/workoutService';
import { deleteWorkout } from '@/services/sync';
import { SET_TYPE_LABELS, WORKOUT_STATUS_LABELS } from '@/lib/constants';
import { formatDate, formatDateTime, formatLongDate, formatTime } from '@/lib/dates';
import { getErrorMessage } from '@/lib/errors';
import {
  estimateOneRepMaxKg,
  getDurationSeconds,
  isWorkingSet,
  setVolumeKg,
  workoutDate,
} from '@/lib/metrics';
import { cn, formatDuration, formatNumber, formatWeight, toKg } from '@/lib/utils';
import type { WorkoutStatus } from '@/types/models';

const STATUS_VARIANT: Record<
  WorkoutStatus,
  'default' | 'success' | 'warning' | 'secondary' | 'danger'
> = {
  scheduled: 'secondary',
  in_progress: 'default',
  paused: 'warning',
  finished: 'success',
  cancelled: 'danger',
};

export default function HistoryDetailPage() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const workout = useWorkoutDetail(workoutId);
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [startOpen, setStartOpen] = useState(false);

  if (workout === undefined) return <PageLoader />;

  if (workout === null) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Entrenamiento no encontrado"
        description="Puede que se haya eliminado o que pertenezca a otra cuenta."
        action={
          <Button asChild>
            <Link to="/history">Volver al historial</Link>
          </Button>
        }
      />
    );
  }

  const allSets = workout.exercises.flatMap((exercise) => exercise.sets);
  const completed = allSets.filter((set) => set.isCompleted);
  const working = completed.filter(isWorkingSet);
  const volume = working.reduce((total, set) => total + setVolumeKg(set), 0);
  const reps = working.reduce((total, set) => total + set.reps, 0);
  const bestE1rm = working.reduce<{ value: number; weight: number; reps: number; unit: string } | null>(
    (best, set) => {
      const value = estimateOneRepMaxKg(set);
      if (value === null) return best;
      if (!best || value > best.value) {
        return { value, weight: set.weight, reps: set.reps, unit: set.weightUnit };
      }
      return best;
    },
    null,
  );
  const heaviest = working.reduce<{ weight: number; unit: string; reps: number } | null>(
    (best, set) => {
      if (set.weight <= 0) return best;
      if (!best || toKg(set.weight, set.weightUnit) > toKg(best.weight, best.unit as 'kg' | 'lb')) {
        return { weight: set.weight, unit: set.weightUnit, reps: set.reps };
      }
      return best;
    },
    null,
  );

  const openEdit = () => {
    setNameDraft(workout.name);
    setNotesDraft(workout.notes);
    setEditOpen(true);
  };

  const handleSaveInfo = async () => {
    if (nameDraft.trim().length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    setBusy(true);
    try {
      await updateWorkoutDetails(workout.id, {
        name: nameDraft,
        notes: notesDraft,
      });
      toast.success('Sesión actualizada');
      setEditOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicate = async () => {
    setBusy(true);
    try {
      const copy = await duplicateWorkout(workout.id);
      toast.success('Entrenamiento duplicado como programado');
      navigate(`/workouts/${copy.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteWorkout(workout.id);
      toast.success('Entrenamiento eliminado');
      navigate('/history', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleStart = async () => {
    setBusy(true);
    try {
      await startWorkoutSession(workout.id);
      toast.success('Sesión iniciada');
      navigate(`/workouts/${workout.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/history">
            <ArrowLeft className="h-4 w-4" /> Historial
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {workout.status === 'scheduled' && (
            <Button onClick={() => setStartOpen(true)}>
              <Play className="h-4 w-4" /> Iniciar sesión
            </Button>
          )}
          {(workout.status === 'in_progress' || workout.status === 'paused') && (
            <Button asChild>
              <Link to={`/workouts/${workout.id}`}>
                <Play className="h-4 w-4" /> Continuar sesión
              </Link>
            </Button>
          )}
          {workout.status === 'finished' && (
            <Button asChild variant="secondary">
              <Link to={`/history/compare?a=${workout.id}`}>
                <ArrowDownUp className="h-4 w-4" /> Comparar
              </Link>
            </Button>
          )}
          <Button variant="secondary" onClick={() => exportWorkoutCsv(workout)}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="secondary" loading={busy} onClick={() => void handleDuplicate()}>
            <Copy className="h-4 w-4" /> Repetir
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Editar sesión" onClick={openEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Eliminar sesión"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-panel p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_VARIANT[workout.status]}>{WORKOUT_STATUS_LABELS[workout.status]}</Badge>
              {workout.planName && (
                <Badge variant="secondary">
                  <Layers className="h-3 w-3" /> {workout.planName}
                </Badge>
              )}
              {workout.notes && (
                <Badge variant="outline">
                  <StickyNote className="h-3 w-3" /> Con notas
                </Badge>
              )}
            </div>
            <h1 className="mt-2.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {workout.name}
            </h1>
            <p className="mt-1 text-xs text-muted">
              {formatLongDate(workoutDate(workout))}
              {workout.startedAt ? ` · iniciada a las ${formatTime(workout.startedAt)}` : ''}
              {workout.finishedAt ? ` · finalizada a las ${formatTime(workout.finishedAt)}` : ''}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                label: 'Duración',
                value: formatDuration(getDurationSeconds(workout), 'short'),
                icon: Timer,
              },
              { label: 'Volumen', value: `${formatNumber(volume)} kg`, icon: Weight },
              { label: 'Series', value: `${working.length}`, icon: Dumbbell },
              { label: 'Reps', value: formatNumber(reps), icon: Flag },
            ].map((item) => (
              <div
                key={item.label}
                className="min-w-[86px] rounded-xl border border-border/70 bg-surface/40 px-3 py-2.5 text-center"
              >
                <item.icon className="mx-auto h-3.5 w-3.5 text-accent" />
                <p className="tabular mt-1 text-sm font-semibold">{item.value}</p>
                <p className="text-[10px] text-muted">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-surface/25 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted">Mejor serie</p>
            <p className="mt-1 text-sm font-semibold">
              {heaviest
                ? `${formatWeight(heaviest.weight, heaviest.unit, 1)} × ${heaviest.reps}`
                : 'Sin peso registrado'}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-surface/25 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted">1RM estimado</p>
            <p className="mt-1 text-sm font-semibold">
              {bestE1rm
                ? `${formatNumber(bestE1rm.value, 1)} kg (${formatWeight(bestE1rm.weight, bestE1rm.unit, 1)} × ${bestE1rm.reps})`
                : 'Sin datos suficientes'}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-surface/25 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted">Ejercicios</p>
            <p className="mt-1 text-sm font-semibold">
              {workout.exercises.length} · {completed.length} series completadas
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_0.8fr]">
        <div className="space-y-3">
          {workout.exercises.length === 0 ? (
            <EmptyState
              compact
              icon={Dumbbell}
              title="Sin ejercicios registrados"
              description="Esta sesión se cerró sin añadir ejercicios. Puedes duplicarla para empezar de nuevo."
              action={
                <Button size="sm" onClick={() => void handleDuplicate()}>
                  <Copy className="h-4 w-4" /> Repetir entrenamiento
                </Button>
              }
            />
          ) : (
            workout.exercises.map((exercise, exerciseIndex) => {
              const exerciseSets = exercise.sets;
              const exerciseVolume = exerciseSets.reduce((total, set) => total + setVolumeKg(set), 0);
              const exerciseCompleted = exerciseSets.filter((set) => set.isCompleted).length;
              const exerciseBest = exerciseSets.reduce<number>((best, set) => {
                if (!isWorkingSet(set) || set.weight <= 0) return best;
                return Math.max(best, toKg(set.weight, set.weightUnit));
              }, 0);
              return (
                <Card key={exercise.id}>
                  <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-xs font-bold text-accent">
                        {String(exerciseIndex + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <CardTitle className="text-[15px]">{exercise.nameSnapshot}</CardTitle>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {exerciseCompleted} series completadas · {formatNumber(exerciseVolume)} kg
                          {exerciseBest > 0 ? ` · mejor carga ${formatNumber(exerciseBest, 1)} kg` : ''}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-1">
                    {exercise.notes && (
                      <p className="mb-2 rounded-lg bg-surface/40 px-3 py-2 text-[11px] leading-relaxed text-muted">
                        {exercise.notes}
                      </p>
                    )}
                    {exerciseSets.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted">
                        Sin series registradas.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] text-left text-xs">
                          <thead>
                            <tr className="text-[10px] uppercase tracking-wider text-muted">
                              <th className="pb-2 pl-1 font-semibold">Serie</th>
                              <th className="pb-2 font-semibold">Tipo</th>
                              <th className="pb-2 text-center font-semibold">Peso</th>
                              <th className="pb-2 text-center font-semibold">Reps</th>
                              <th className="pb-2 text-center font-semibold">Descanso</th>
                              <th className="pb-2 text-center font-semibold">Estado</th>
                              <th className="pb-2 pr-1 text-right font-semibold">Volumen</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {exerciseSets.map((set) => (
                              <tr key={set.id} className={cn(!set.isCompleted && 'opacity-55')}>
                                <td className="py-2 pl-1 font-semibold text-muted">{set.setNumber}</td>
                                <td className="py-2">
                                  <span className="text-[11px] text-muted">
                                    {SET_TYPE_LABELS[set.setType]}
                                  </span>
                                </td>
                                <td className="tabular py-2 text-center font-medium">
                                  {formatWeight(set.weight, set.weightUnit, 1)}
                                </td>
                                <td className="tabular py-2 text-center">{set.reps}</td>
                                <td className="tabular py-2 text-center text-muted">{set.restSeconds}s</td>
                                <td className="py-2 text-center">
                                  {set.isCompleted ? (
                                    <Badge variant="success" className="px-1.5 py-0 text-[9px]">
                                      Hecha
                                    </Badge>
                                  ) : (
                                    <span className="text-[10px] text-muted">Pendiente</span>
                                  )}
                                </td>
                                <td className="tabular py-2 pr-1 text-right font-medium">
                                  {formatNumber(setVolumeKg(set))} kg
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {exerciseSets.some((set) => set.notes) && (
                      <div className="mt-2 space-y-1">
                        {exerciseSets
                          .filter((set) => set.notes)
                          .map((set) => (
                            <p key={set.id} className="text-[10px] text-muted">
                              <span className="font-semibold text-foreground/70">Serie {set.setNumber}:</span>{' '}
                              {set.notes}
                            </p>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-accent" /> Notas de la sesión
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workout.notes ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                  {workout.notes}
                </p>
              ) : (
                <p className="rounded-xl border border-dashed border-border px-3 py-5 text-center text-[11px] text-muted">
                  No hay notas en esta sesión.
                </p>
              )}
              <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={openEdit}>
                <Pencil className="h-3.5 w-3.5" /> Editar nombre y notas
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-accent" /> Datos de la sesión
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-muted">Fecha</span>
                <span className="text-right font-medium">{formatDate(workoutDate(workout))}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted">Creada</span>
                <span className="text-right font-medium">{formatDateTime(workout.createdAt)}</span>
              </div>
              {workout.startedAt && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted">Inicio</span>
                  <span className="text-right font-medium">{formatDateTime(workout.startedAt)}</span>
                </div>
              )}
              {workout.finishedAt && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted">Fin</span>
                  <span className="text-right font-medium">{formatDateTime(workout.finishedAt)}</span>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <span className="text-muted">Duración</span>
                <span className="text-right font-medium">
                  {formatDuration(getDurationSeconds(workout), 'medium')}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted">Volumen efectivo</span>
                <span className="text-right font-medium">{formatNumber(volume)} kg</span>
              </div>
            </CardContent>
          </Card>

          {workout.status === 'finished' && (
            <Card className="border-warning/20 bg-warning/[0.03]">
              <CardContent className="flex items-start gap-3 p-4">
                <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <div>
                  <p className="text-sm font-semibold">Compara esta sesión</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                    Elige otra sesión del historial para ver la evolución de volumen, series y cargas.
                  </p>
                  <Button asChild size="sm" variant="secondary" className="mt-2.5">
                    <Link to={`/history/compare?a=${workout.id}`}>
                      <ArrowDownUp className="h-3.5 w-3.5" /> Abrir comparador
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Editar sesión</DialogTitle>
            <DialogDescription>
              Cambia el nombre o las notas. Las series y métricas no se modifican desde aquí.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="history-name">Nombre</Label>
              <Input
                id="history-name"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="history-notes">Notas</Label>
              <Textarea
                id="history-notes"
                rows={5}
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                maxLength={1500}
                placeholder="Sensaciones, cargas, molestias…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button loading={busy} onClick={() => void handleSaveInfo()}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={startOpen}
        onOpenChange={setStartOpen}
        title="Iniciar sesión programada"
        description="El cronómetro empezará ahora y podrás registrar series en esta misma sesión."
        confirmLabel="Iniciar ahora"
        loading={busy}
        onConfirm={handleStart}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar entrenamiento"
        description="Se eliminarán la sesión, sus ejercicios y todas sus series. Esta acción no se puede deshacer."
        confirmLabel="Eliminar definitivamente"
        destructive
        loading={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
