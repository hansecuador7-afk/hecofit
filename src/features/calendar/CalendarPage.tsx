import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  CalendarCheck2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useRestDays, useWorkoutsWithDetails } from '@/hooks/useHecoData';
import { makeRestDay } from '@/features/profile/backup';
import { deleteRestDay, saveRestDay } from '@/services/sync';
import { WORKOUT_STATUS_LABELS } from '@/lib/constants';
import {
  dateKey,
  formatDate,
  formatLongDate,
  formatMonthYear,
  formatRelativeDay,
  formatTime,
  WEEK_OPTIONS,
} from '@/lib/dates';
import { getErrorMessage } from '@/lib/errors';
import { getDurationSeconds, isFinished, workoutDate } from '@/lib/metrics';
import { cn, formatDuration, formatNumber } from '@/lib/utils';
import type { RestDay, WorkoutDetail, WorkoutStatus } from '@/types/models';

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const STATUS_DOT: Record<WorkoutStatus, string> = {
  scheduled: 'bg-muted',
  in_progress: 'bg-accent animate-pulse',
  paused: 'bg-warning',
  finished: 'bg-success',
  cancelled: 'bg-danger',
};

function workoutDayKey(workout: WorkoutDetail): string {
  if (workout.status === 'scheduled' && workout.scheduledAt) return dateKey(workout.scheduledAt);
  return dateKey(workoutDate(workout));
}

export default function CalendarPage() {
  const workouts = useWorkoutsWithDetails();
  const restDays = useRestDays();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedKey, setSelectedKey] = useState(() => dateKey(new Date()));
  const [restTarget, setRestTarget] = useState<RestDay | null>(null);
  const [restBusy, setRestBusy] = useState(false);

  const workoutsByDay = useMemo(() => {
    const map = new Map<string, WorkoutDetail[]>();
    for (const workout of workouts) {
      const key = workoutDayKey(workout);
      const list = map.get(key) ?? [];
      list.push(workout);
      map.set(key, list);
    }
    return map;
  }, [workouts]);

  const restByDay = useMemo(() => new Map(restDays.map((rest) => [rest.date, rest])), [restDays]);

  const monthCells = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), WEEK_OPTIONS);
    const end = endOfWeek(endOfMonth(month), WEEK_OPTIONS);
    return eachDayOfInterval({ start, end });
  }, [month]);

  const monthWorkouts = useMemo(
    () =>
      workouts.filter((workout) => {
        const date = new Date(`${workoutDayKey(workout)}T12:00:00`);
        return isSameMonth(date, month) && workout.status !== 'cancelled';
      }),
    [workouts, month],
  );

  const monthFinished = monthWorkouts.filter(isFinished);
  const monthVolume = monthFinished.reduce(
    (total, workout) =>
      total +
      workout.exercises
        .flatMap((exercise) => exercise.sets)
        .filter((set) => set.isCompleted && set.setType !== 'warmup' && set.setType !== 'approximation')
        .reduce(
          (sum, set) =>
            sum + (set.weightUnit === 'lb' ? set.weight * 0.45359237 : set.weight) * set.reps,
          0,
        ),
    0,
  );
  const monthRestDays = restDays.filter((rest) => isSameMonth(new Date(`${rest.date}T12:00:00`), month));
  const selectedDate = new Date(`${selectedKey}T12:00:00`);
  const selectedWorkouts = workoutsByDay.get(selectedKey) ?? [];
  const selectedRest = restByDay.get(selectedKey) ?? null;
  const selectedFinished = selectedWorkouts.filter(isFinished);
  const selectedVolume = selectedFinished.reduce(
    (total, workout) =>
      total +
      workout.exercises
        .flatMap((exercise) => exercise.sets)
        .filter((set) => set.isCompleted && set.setType !== 'warmup' && set.setType !== 'approximation')
        .reduce(
          (sum, set) =>
            sum + (set.weightUnit === 'lb' ? set.weight * 0.45359237 : set.weight) * set.reps,
          0,
        ),
    0,
  );

  const upcoming = useMemo(
    () =>
      workouts
        .filter((workout) => workout.status === 'scheduled' && workout.scheduledAt)
        .filter((workout) => new Date(workout.scheduledAt ?? '').getTime() >= Date.now())
        .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''))
        .slice(0, 5),
    [workouts],
  );

  const goToday = () => {
    const today = new Date();
    setMonth(startOfMonth(today));
    setSelectedKey(dateKey(today));
  };

  const handleToggleRest = async () => {
    if (selectedRest) {
      setRestTarget(selectedRest);
      return;
    }
    setRestBusy(true);
    try {
      await saveRestDay(makeRestDay(selectedKey));
      toast.success('Día marcado como descanso');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setRestBusy(false);
    }
  };

  const confirmRemoveRest = async () => {
    if (!restTarget) return;
    setRestBusy(true);
    try {
      await deleteRestDay(restTarget.id);
      toast.success('Descanso eliminado');
      setRestTarget(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setRestBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Planificación"
        title="Calendario"
        description="Revisa qué días has entrenado, qué tienes programado y marca tus días de descanso."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/workouts">
                <Dumbbell className="h-4 w-4" /> Entrenamientos
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/workouts/new?date=${selectedKey}`}>
                <Plus className="h-4 w-4" /> Programar sesión
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <CalendarCheck2 className="h-4 w-4" />
            </div>
            <div>
              <p className="tabular text-xl font-semibold">{monthFinished.length}</p>
              <p className="text-[11px] text-muted">sesiones este mes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="tabular text-xl font-semibold">{formatNumber(monthVolume)} kg</p>
              <p className="text-[11px] text-muted">volumen efectivo</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <Clock3 className="h-4 w-4" />
            </div>
            <div>
              <p className="tabular text-xl font-semibold">
                {formatDuration(
                  monthFinished.reduce((total, workout) => total + getDurationSeconds(workout), 0),
                  'short',
                )}
              </p>
              <p className="text-[11px] text-muted">tiempo entrenado</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-400">
              <Moon className="h-4 w-4" />
            </div>
            <div>
              <p className="tabular text-xl font-semibold">{monthRestDays.length}</p>
              <p className="text-[11px] text-muted">días de descanso</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Mes anterior"
                onClick={() => setMonth((current) => subMonths(current, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="min-w-[150px] text-center text-base">
                {formatMonthYear(month)}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Mes siguiente"
                onClick={() => setMonth((current) => addMonths(current, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="secondary" size="sm" onClick={goToday}>
              <RotateCcw className="h-3.5 w-3.5" /> Hoy
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 pb-1">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted"
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((date) => {
                const key = dateKey(date);
                const dayWorkouts = workoutsByDay.get(key) ?? [];
                const rest = restByDay.get(key);
                const isSelected = key === selectedKey;
                const isToday = key === dateKey(new Date());
                const hasFinished = dayWorkouts.some(isFinished);
                const hasScheduled = dayWorkouts.some((workout) => workout.status === 'scheduled');
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedKey(key)}
                    aria-label={`${formatLongDate(date)}${dayWorkouts.length ? `, ${dayWorkouts.length} entrenamientos` : ''}`}
                    aria-pressed={isSelected}
                    className={cn(
                      'relative flex min-h-[62px] flex-col items-center justify-start rounded-xl border p-1.5 text-center transition-colors sm:min-h-[76px]',
                      isSameMonth(date, month)
                        ? 'border-border/60 bg-surface/20 hover:border-border-strong'
                        : 'border-transparent bg-transparent text-muted/40 hover:bg-surface/20',
                      isSelected && 'border-accent/50 bg-accent/[0.08] ring-1 ring-accent/25',
                      isToday && !isSelected && 'border-accent/20',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold',
                        isToday && 'bg-accent text-accent-foreground',
                        isSelected && !isToday && 'bg-surface-hover text-foreground',
                      )}
                    >
                      {date.getDate()}
                    </span>
                    <div className="mt-auto flex items-center justify-center gap-0.5 pt-1">
                      {rest && <Moon className="h-2.5 w-2.5 text-sky-400" />}
                      {dayWorkouts.slice(0, 3).map((workout) => (
                        <span
                          key={workout.id}
                          className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[workout.status])}
                          title={workout.name}
                        />
                      ))}
                      {dayWorkouts.length > 3 && (
                        <span className="text-[8px] font-semibold text-muted">+{dayWorkouts.length - 3}</span>
                      )}
                    </div>
                    {hasScheduled && !hasFinished && (
                      <span className="mt-0.5 hidden text-[8px] font-medium uppercase tracking-wide text-muted sm:block">
                        plan
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border/60 pt-3 text-[10px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Finalizada
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" /> En curso
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-muted" /> Programada
              </span>
              <span className="flex items-center gap-1.5">
                <Moon className="h-3 w-3 text-sky-400" /> Descanso
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{formatDate(selectedDate, "EEEE d 'de' MMMM")}</CardTitle>
                <p className="mt-0.5 text-[11px] text-muted">{formatRelativeDay(selectedDate)}</p>
              </div>
              <Badge variant={selectedRest ? 'info' : selectedWorkouts.length > 0 ? 'success' : 'secondary'}>
                {selectedRest
                  ? 'Descanso'
                  : selectedWorkouts.length > 0
                    ? `${selectedWorkouts.length} sesión${selectedWorkouts.length === 1 ? '' : 'es'}`
                    : 'Libre'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {selectedWorkouts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-3 py-6 text-center">
                  <CalendarDays className="mx-auto h-6 w-6 text-muted/50" />
                  <p className="mt-2 text-xs font-medium">Sin entrenamientos este día</p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    Programa una sesión o marca el día como descanso.
                  </p>
                </div>
              ) : (
                selectedWorkouts.map((workout) => (
                  <Link
                    key={workout.id}
                    to={
                      workout.status === 'finished' || workout.status === 'cancelled'
                        ? `/history/${workout.id}`
                        : `/workouts/${workout.id}`
                    }
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface/30 p-3 transition-colors hover:border-accent/30 hover:bg-surface/60"
                  >
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        workout.status === 'finished'
                          ? 'bg-success/10 text-success'
                          : workout.status === 'scheduled'
                            ? 'bg-surface text-muted'
                            : 'bg-accent/10 text-accent',
                      )}
                    >
                      <Dumbbell className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{workout.name}</p>
                      <p className="text-[10px] text-muted">
                        {WORKOUT_STATUS_LABELS[workout.status]}
                        {workout.scheduledAt && workout.status === 'scheduled'
                          ? ` · ${formatTime(workout.scheduledAt)}`
                          : workout.startedAt
                            ? ` · ${formatTime(workout.startedAt)}`
                            : ''}
                      </p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                  </Link>
                ))
              )}

              {selectedFinished.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-surface/20 px-3 py-2 text-[11px]">
                  <span className="text-muted">Volumen del día: </span>
                  <span className="tabular font-semibold">{formatNumber(selectedVolume)} kg</span>
                </div>
              )}

              <div className="grid gap-2 pt-1 sm:grid-cols-2">
                <Button asChild size="sm" variant="secondary">
                  <Link to={`/workouts/new?date=${selectedKey}`}>
                    <Plus className="h-3.5 w-3.5" /> Programar sesión
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant={selectedRest ? 'outline' : 'secondary'}
                  loading={restBusy}
                  onClick={() => void handleToggleRest()}
                >
                  {selectedRest ? (
                    <>
                      <Sun className="h-3.5 w-3.5" /> Quitar descanso
                    </>
                  ) : (
                    <>
                      <Moon className="h-3.5 w-3.5" /> Marcar descanso
                    </>
                  )}
                </Button>
              </div>
              {selectedRest?.notes && (
                <p className="rounded-lg bg-sky-400/5 px-3 py-2 text-[11px] leading-relaxed text-muted">
                  {selectedRest.notes}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Próximas sesiones</CardTitle>
              <Badge variant="secondary">{upcoming.length}</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              {upcoming.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-3 py-5 text-center text-[11px] text-muted">
                  No tienes entrenamientos programados.
                </p>
              ) : (
                <ul className="space-y-2">
                  {upcoming.map((workout) => (
                    <li key={workout.id}>
                      <Link
                        to={`/workouts/${workout.id}`}
                        className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-surface/50"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-[10px] font-bold text-accent">
                          {new Date(workout.scheduledAt ?? '').getDate()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{workout.name}</p>
                          <p className="text-[10px] text-muted">{formatDate(workout.scheduledAt)}</p>
                        </div>
                        <span className="text-[10px] text-muted">{formatTime(workout.scheduledAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {workouts.length === 0 && (
        <EmptyState
          compact
          icon={CalendarDays}
          title="Tu calendario está vacío"
          description="Cuando registres o programes entrenamientos aparecerán aquí. También puedes marcar días de descanso."
          action={
            <Button asChild size="sm">
              <Link to="/workouts/new">
                <Plus className="h-4 w-4" /> Crear entrenamiento
              </Link>
            </Button>
          }
        />
      )}

      <ConfirmDialog
        open={Boolean(restTarget)}
        onOpenChange={(open) => !open && setRestTarget(null)}
        title="Quitar día de descanso"
        description="El día volverá a contar como día libre sin descanso registrado. Los entrenamientos de ese día no se modifican."
        confirmLabel="Quitar descanso"
        destructive
        loading={restBusy}
        onConfirm={confirmRemoveRest}
      />
    </div>
  );
}
