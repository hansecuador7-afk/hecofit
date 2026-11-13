import {
  CalendarClock,
  Copy,
  Dumbbell,
  MoreVertical,
  Play,
  Plus,
  TimerReset,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActiveWorkout, useWorkoutSummaries } from '@/hooks/useHecoData';
import { WORKOUT_STATUS_LABELS } from '@/lib/constants';
import { formatDateTime, formatRelativeDay } from '@/lib/dates';
import { getErrorMessage } from '@/lib/errors';
import { deleteWorkout } from '@/services/sync';
import { duplicateWorkout, getElapsedSeconds } from '@/features/workouts/workoutService';
import { cn, formatDuration, formatNumber } from '@/lib/utils';
import type { WorkoutStatus } from '@/types/models';

type Filter = 'all' | 'active' | 'scheduled' | 'finished';

const STATUS_STYLES: Record<WorkoutStatus, { variant: 'default' | 'success' | 'warning' | 'secondary' | 'danger'; dot: string }> = {
  scheduled: { variant: 'secondary', dot: 'bg-muted' },
  in_progress: { variant: 'default', dot: 'bg-accent animate-pulse' },
  paused: { variant: 'warning', dot: 'bg-warning' },
  finished: { variant: 'success', dot: 'bg-success' },
  cancelled: { variant: 'danger', dot: 'bg-danger' },
};

export default function WorkoutsPage() {
  const summaries = useWorkoutSummaries();
  const activeWorkout = useActiveWorkout();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return summaries.filter(({ workout }) => {
      if (workout.status === 'cancelled') return filter === 'all' ? false : false;
      if (filter === 'active') return workout.status === 'in_progress' || workout.status === 'paused';
      if (filter === 'scheduled') return workout.status === 'scheduled';
      if (filter === 'finished') return workout.status === 'finished';
      return true;
    });
  }, [summaries, filter]);

  const duplicate = async (id: string) => {
    setBusyId(id);
    try {
      const copy = await duplicateWorkout(id);
      toast.success('Entrenamiento duplicado como programado');
      navigate(`/workouts/${copy.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteWorkout(deleteTarget);
      toast.success('Entrenamiento eliminado');
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
        eyebrow="Entrenamientos"
        title="Tus sesiones"
        description="Empieza una sesión libre, continúa la activa o revisa lo que ya has entrenado."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/calendar">
                <CalendarClock className="h-4 w-4" /> Calendario
              </Link>
            </Button>
            <Button asChild>
              <Link to="/workouts/new">
                <Plus className="h-4 w-4" /> Nuevo entrenamiento
              </Link>
            </Button>
          </>
        }
      />

      {activeWorkout ? (
        <Card className="border-accent/25 bg-accent/[0.05]">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <TimerReset className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                  {WORKOUT_STATUS_LABELS[activeWorkout.status]}
                </p>
                <p className="font-display text-base font-semibold">{activeWorkout.name}</p>
                <p className="tabular text-xs text-muted">
                  {formatDuration(getElapsedSeconds(activeWorkout), 'medium')} transcurridos
                </p>
              </div>
            </div>
            <Button asChild>
              <Link to={`/workouts/${activeWorkout.id}`}>
                <Play className="h-4 w-4" /> Continuar
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="active">En curso</TabsTrigger>
          <TabsTrigger value="scheduled">Programadas</TabsTrigger>
          <TabsTrigger value="finished">Finalizadas</TabsTrigger>
        </TabsList>
      </Tabs>

      {summaries.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Aún no hay entrenamientos"
          description="Registra tu primera sesión libre o crea una rutina para empezar con un plan estructurado."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/workouts/new">
                  <Plus className="h-4 w-4" /> Entrenamiento libre
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/routines">Crear rutina</Link>
              </Button>
            </div>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          compact
          icon={CalendarClock}
          title="Nada en esta categoría"
          description="Cambia el filtro o crea un entrenamiento nuevo."
          action={
            <Button asChild size="sm">
              <Link to="/workouts/new">
                <Plus className="h-4 w-4" /> Crear sesión
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ workout, exerciseCount, setCount, volumeKg }) => {
            const style = STATUS_STYLES[workout.status];
            const isActive = workout.status === 'in_progress' || workout.status === 'paused';
            return (
              <Card
                key={workout.id}
                className={cn(
                  'group transition-colors hover:border-border-strong',
                  isActive && 'border-accent/30',
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant={style.variant} className="gap-1.5">
                      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
                      {WORKOUT_STATUS_LABELS[workout.status]}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Acciones del entrenamiento"
                          disabled={busyId === workout.id}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => navigate(`/workouts/${workout.id}`)}>
                          <Dumbbell className="h-4 w-4" /> Abrir sesión
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void duplicate(workout.id)}>
                          <Copy className="h-4 w-4" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onSelect={() => setDeleteTarget(workout.id)}>
                          <Trash2 className="h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Link to={`/workouts/${workout.id}`} className="mt-3 block">
                    <h3 className="font-display text-lg font-semibold leading-tight transition-colors group-hover:text-accent">
                      {workout.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted">
                      {workout.scheduledAt && workout.status === 'scheduled'
                        ? `Programado · ${formatDateTime(workout.scheduledAt)}`
                        : `${formatRelativeDay(workout.startedAt ?? workout.createdAt)} · ${formatDateTime(
                            workout.startedAt ?? workout.createdAt,
                          )}`}
                    </p>
                  </Link>

                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border/70 bg-surface/40 p-2.5 text-center">
                    <div>
                      <p className="tabular text-sm font-semibold">{exerciseCount}</p>
                      <p className="text-[10px] text-muted">ejercicios</p>
                    </div>
                    <div className="border-x border-border/70">
                      <p className="tabular text-sm font-semibold">{setCount}</p>
                      <p className="text-[10px] text-muted">series</p>
                    </div>
                    <div>
                      <p className="tabular text-sm font-semibold">{formatNumber(volumeKg)}</p>
                      <p className="text-[10px] text-muted">kg volumen</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-muted">
                      {workout.durationSeconds > 0
                        ? formatDuration(workout.durationSeconds, 'short')
                        : isActive
                          ? 'En progreso'
                          : 'Sin duración'}
                    </span>
                    <Button asChild size="sm" variant={isActive ? 'default' : 'ghost'}>
                      <Link to={`/workouts/${workout.id}`}>
                        {isActive ? 'Continuar' : 'Abrir'}{' '}
                        <Play className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Eliminar entrenamiento"
        description="Se eliminarán la sesión, sus ejercicios y todas sus series. Esta acción no se puede deshacer."
        confirmLabel="Eliminar definitivamente"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
