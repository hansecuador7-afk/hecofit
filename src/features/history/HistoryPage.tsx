import {
  ArrowDownUp,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Dumbbell,
  History,
  Search,
  Scale,
  Timer,
  Trash2,
  Trophy,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox, Input, Select } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkoutsWithDetails } from '@/hooks/useHecoData';
import { exportWorkoutsCsv } from '@/features/profile/backup';
import { duplicateWorkout } from '@/features/workouts/workoutService';
import { deleteWorkout } from '@/services/sync';
import { HISTORY_PAGE_SIZE, WORKOUT_STATUS_LABELS } from '@/lib/constants';
import { formatDate, formatDateTime, formatRelativeDay } from '@/lib/dates';
import { getErrorMessage } from '@/lib/errors';
import { getDurationSeconds, setVolumeKg, workoutDate } from '@/lib/metrics';
import { cn, formatDuration, formatNumber } from '@/lib/utils';
import type { WorkoutDetail, WorkoutStatus } from '@/types/models';

type StatusFilter = 'finished' | 'scheduled' | 'cancelled' | 'all';
type SortOption = 'recent' | 'oldest' | 'volume' | 'duration';

const STATUS_STYLE: Record<
  WorkoutStatus,
  { variant: 'default' | 'success' | 'warning' | 'secondary' | 'danger'; label: string }
> = {
  scheduled: { variant: 'secondary', label: WORKOUT_STATUS_LABELS.scheduled },
  in_progress: { variant: 'default', label: WORKOUT_STATUS_LABELS.in_progress },
  paused: { variant: 'warning', label: WORKOUT_STATUS_LABELS.paused },
  finished: { variant: 'success', label: WORKOUT_STATUS_LABELS.finished },
  cancelled: { variant: 'danger', label: WORKOUT_STATUS_LABELS.cancelled },
};

function workoutVolume(workout: WorkoutDetail): number {
  return workout.exercises
    .flatMap((exercise) => exercise.sets)
    .reduce((total, set) => total + setVolumeKg(set), 0);
}

function workoutSetCount(workout: WorkoutDetail): number {
  return workout.exercises
    .flatMap((exercise) => exercise.sets)
    .filter((set) => set.isCompleted).length;
}

export default function HistoryPage() {
  const workouts = useWorkoutsWithDetails();
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusFilter>('finished');
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<'all' | '30' | '90' | '365'>('all');
  const [sort, setSort] = useState<SortOption>('recent');
  const [page, setPage] = useState(1);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutDetail | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const cutoff =
      period === 'all' ? null : Date.now() - Number(period) * 24 * 60 * 60 * 1000;
    const list = workouts.filter((workout) => {
      if (workout.status === 'in_progress' || workout.status === 'paused') return false;
      if (status !== 'all' && workout.status !== status) return false;
      if (cutoff !== null && workoutDate(workout).getTime() < cutoff) return false;
      if (!normalized) return true;
      return (
        workout.name.toLowerCase().includes(normalized) ||
        workout.notes.toLowerCase().includes(normalized) ||
        workout.exercises.some((exercise) => exercise.nameSnapshot.toLowerCase().includes(normalized))
      );
    });
    return list.sort((a, b) => {
      if (sort === 'oldest') return workoutDate(a).getTime() - workoutDate(b).getTime();
      if (sort === 'volume') return workoutVolume(b) - workoutVolume(a);
      if (sort === 'duration') return getDurationSeconds(b) - getDurationSeconds(a);
      return workoutDate(b).getTime() - workoutDate(a).getTime();
    });
  }, [workouts, status, query, period, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * HISTORY_PAGE_SIZE, currentPage * HISTORY_PAGE_SIZE);

  const finishedFiltered = filtered.filter((workout) => workout.status === 'finished');
  const totalVolume = finishedFiltered.reduce((total, workout) => total + workoutVolume(workout), 0);
  const totalSeconds = finishedFiltered.reduce(
    (total, workout) => total + getDurationSeconds(workout),
    0,
  );
  const totalSets = finishedFiltered.reduce((total, workout) => total + workoutSetCount(workout), 0);

  const toggleCompare = (id: string) => {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 2) return [current[1]!, id];
      return [...current, id];
    });
  };

  const handleDuplicate = async (workout: WorkoutDetail) => {
    setBusyId(workout.id);
    try {
      const copy = await duplicateWorkout(workout.id);
      toast.success('Entrenamiento duplicado como programado');
      navigate(`/workouts/${copy.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteWorkout(deleteTarget.id);
      toast.success('Entrenamiento eliminado del historial');
      setDeleteTarget(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Análisis"
        title="Historial"
        description="Consulta todas tus sesiones, filtra por fecha o estado, compara entrenamientos y exporta tus datos."
        actions={
          <>
            <Button
              variant="secondary"
              disabled={finishedFiltered.length === 0}
              onClick={() => exportWorkoutsCsv(finishedFiltered)}
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button
              disabled={compareIds.length !== 2}
              onClick={() => navigate(`/history/compare?a=${compareIds[0]}&b=${compareIds[1]}`)}
            >
              <ArrowDownUp className="h-4 w-4" /> Comparar ({compareIds.length}/2)
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <History className="h-4 w-4" />
            </div>
            <div>
              <p className="tabular text-xl font-semibold">{finishedFiltered.length}</p>
              <p className="text-[11px] text-muted">sesiones finalizadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <p className="tabular text-xl font-semibold">{formatNumber(totalVolume)} kg</p>
              <p className="text-[11px] text-muted">volumen efectivo</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <Timer className="h-4 w-4" />
            </div>
            <div>
              <p className="tabular text-xl font-semibold">{formatDuration(totalSeconds, 'short')}</p>
              <p className="text-[11px] text-muted">tiempo total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-400">
              <Dumbbell className="h-4 w-4" />
            </div>
            <div>
              <p className="tabular text-xl font-semibold">{formatNumber(totalSets)}</p>
              <p className="text-[11px] text-muted">series completadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border border-border bg-panel p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por sesión, nota o ejercicio…"
              className="pl-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[160px_170px]">
            <Select
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value as typeof period);
                setPage(1);
              }}
              aria-label="Filtrar por fecha"
            >
              <option value="all">Todo el historial</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
              <option value="365">Último año</option>
            </Select>
            <Select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              aria-label="Ordenar historial"
            >
              <option value="recent">Más recientes</option>
              <option value="oldest">Más antiguos</option>
              <option value="volume">Más volumen</option>
              <option value="duration">Más duración</option>
            </Select>
          </div>
        </div>
        <div className="mt-3">
          <Tabs
            value={status}
            onValueChange={(value) => {
              setStatus(value as StatusFilter);
              setPage(1);
            }}
          >
            <TabsList>
              <TabsTrigger value="finished">Finalizadas</TabsTrigger>
              <TabsTrigger value="scheduled">Programadas</TabsTrigger>
              <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
              <TabsTrigger value="all">Todas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {workouts.length === 0 ? (
        <EmptyState
          icon={History}
          title="Todavía no hay historial"
          description="Cuando finalices tu primer entrenamiento aparecerá aquí con sus series, volumen y duración."
          action={
            <Button asChild>
              <Link to="/workouts/new">
                <Dumbbell className="h-4 w-4" /> Empezar entrenamiento
              </Link>
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          compact
          icon={Search}
          title="Sin resultados"
          description="No hay sesiones que coincidan con los filtros actuales. Prueba a ampliar el periodo o cambiar el estado."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setStatus('all');
                setPeriod('all');
                setQuery('');
              }}
            >
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <>
          <div className="space-y-2.5">
            {visible.map((workout) => {
              const style = STATUS_STYLE[workout.status];
              const volume = workoutVolume(workout);
              const completedSets = workoutSetCount(workout);
              const canCompare = workout.status === 'finished';
              const selected = compareIds.includes(workout.id);
              return (
                <Card
                  key={workout.id}
                  className={cn(
                    'transition-colors hover:border-border-strong',
                    selected && 'border-accent/40 bg-accent/[0.03]',
                  )}
                >
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    {canCompare ? (
                      <Checkbox
                        checked={selected}
                        onChange={() => toggleCompare(workout.id)}
                        aria-label={`Seleccionar ${workout.name} para comparar`}
                      />
                    ) : (
                      <span className="hidden w-5 sm:block" />
                    )}

                    <Link
                      to={`/history/${workout.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <div
                        className={cn(
                          'flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border text-center',
                          workout.status === 'finished'
                            ? 'border-success/20 bg-success/[0.07] text-success'
                            : workout.status === 'cancelled'
                              ? 'border-danger/20 bg-danger/[0.06] text-danger'
                              : 'border-border bg-surface text-muted',
                        )}
                      >
                        <span className="text-[9px] font-semibold uppercase leading-none">
                          {formatDate(workoutDate(workout), 'MMM')}
                        </span>
                        <span className="tabular text-base font-bold leading-tight">
                          {formatDate(workoutDate(workout), 'd')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-display text-base font-semibold">{workout.name}</h3>
                          <Badge variant={style.variant}>{style.label}</Badge>
                          {workout.planName && (
                            <Badge variant="secondary" className="hidden sm:inline-flex">
                              {workout.planName}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {formatRelativeDay(workoutDate(workout))} · {formatDateTime(workoutDate(workout))}
                          {workout.notes ? ' · con notas' : ''}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted">
                          <span>{workout.exercises.length} ejercicios</span>
                          <span>{completedSets} series completadas</span>
                          <span>{formatDuration(getDurationSeconds(workout), 'short')}</span>
                          {workout.status === 'finished' && (
                            <span className="font-semibold text-foreground/80">
                              {formatNumber(volume)} kg
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>

                    <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/history/${workout.id}`}>Ver detalle</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Duplicar entrenamiento"
                        disabled={busyId === workout.id}
                        onClick={() => void handleDuplicate(workout)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Eliminar entrenamiento"
                        onClick={() => setDeleteTarget(workout)}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-border bg-panel px-4 py-2.5">
              <p className="text-[11px] text-muted">
                Página {currentPage} de {totalPages} · {filtered.length} sesiones
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Página anterior"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Página siguiente"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {compareIds.length > 0 && (
        <div className="sticky bottom-20 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-accent/30 bg-panel/95 p-3 shadow-xl backdrop-blur lg:bottom-4">
          <div className="flex items-center gap-2 text-xs">
            <Trophy className="h-4 w-4 text-accent" />
            <span className="font-semibold">Comparador</span>
            <span className="text-muted">
              {compareIds.length === 1 ? 'Selecciona una segunda sesión' : 'Dos sesiones listas'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCompareIds([])}>
              Limpiar
            </Button>
            <Button
              size="sm"
              disabled={compareIds.length !== 2}
              onClick={() => navigate(`/history/compare?a=${compareIds[0]}&b=${compareIds[1]}`)}
            >
              Comparar ahora
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar del historial"
        description={`Se eliminará «${deleteTarget?.name ?? 'esta sesión'}» con sus ejercicios y series. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar definitivamente"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
