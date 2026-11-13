import {
  Activity,
  ArrowRight,
  CalendarCheck2,
  Clock3,
  Dumbbell,
  Flame,
  Layers,
  Play,
  Plus,
  Sparkles,
  TimerReset,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth/AuthProvider';
import { ElapsedTime } from '@/components/layout/elapsed-time';
import {
  useActiveWorkout,
  usePlans,
  usePlanDetail,
  useWorkoutsWithDetails,
} from '@/hooks/useHecoData';
import { CHART_COLORS, MUSCLE_COLORS } from '@/lib/constants';
import { formatDate, formatDateTime } from '@/lib/dates';
import {
  buildMuscleDistribution,
  buildWeeklyActivity,
  computeExerciseRecords,
  computeSummary,
  isFinished,
  workoutDate,
} from '@/lib/metrics';
import { formatDuration, formatNumber } from '@/lib/utils';

const tooltipStyle = {
  backgroundColor: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  fontSize: '12px',
  color: 'var(--foreground)',
} as const;

export default function DashboardPage() {
  const { profile } = useAuth();
  const workouts = useWorkoutsWithDetails();
  const plans = usePlans();
  const activeWorkout = useActiveWorkout();
  const activePlan = plans.find((plan) => plan.isActive) ?? plans[0] ?? null;
  const activePlanDetail = usePlanDetail(activePlan?.id);

  const summary = computeSummary(workouts, activePlan?.id ?? null);
  const weekly = buildWeeklyActivity(workouts, 8);
  const muscles = buildMuscleDistribution(workouts);
  const finished = workouts
    .filter(isFinished)
    .sort((a, b) => workoutDate(b).getTime() - workoutDate(a).getTime());
  const recent = finished.slice(0, 5);
  const records = computeExerciseRecords(workouts)
    .filter((record) => record.maxWeight)
    .sort((a, b) => (b.maxWeight?.achievedAt ?? '').localeCompare(a.maxWeight?.achievedAt ?? ''))
    .slice(0, 4);

  const firstName = (profile?.displayName ?? '').split(' ')[0] || 'atleta';
  const nextWorkout = summary.nextWorkout;
  const hasData = summary.workouts > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Dashboard"
        title={`Hola, ${firstName}`}
        description="Tu actividad real, tus rutinas y tus próximos pasos en un solo vistazo."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/routines">
                <Layers className="h-4 w-4" /> Rutinas
              </Link>
            </Button>
            <Button asChild>
              <Link to={activeWorkout ? `/workouts/${activeWorkout.id}` : '/workouts/new'}>
                {activeWorkout ? <TimerReset className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {activeWorkout ? 'Continuar sesión' : 'Empezar entrenamiento'}
              </Link>
            </Button>
          </>
        }
      />

      {activeWorkout ? (
        <Card className="glow-accent card-sheen relative overflow-hidden border-accent/25 bg-[linear-gradient(120deg,rgba(255,107,53,0.14),rgba(255,107,53,0.02)_55%,transparent)]">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-[0_10px_30px_-12px_rgba(255,107,53,0.9)]">
                <Flame className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                    {activeWorkout.status === 'paused' ? 'Sesión en pausa' : 'Sesión en curso'}
                  </p>
                </div>
                <p className="mt-1 font-display text-xl font-semibold">{activeWorkout.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  Iniciada {formatDateTime(activeWorkout.startedAt)} ·{' '}
                  <ElapsedTime
                    startedAt={activeWorkout.startedAt ?? activeWorkout.createdAt}
                    className="tabular font-semibold text-foreground"
                  />
                </p>
              </div>
            </div>
            <Button asChild size="lg">
              <Link to={`/workouts/${activeWorkout.id}`}>
                Abrir sesión <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Entrenamientos"
          value={formatNumber(summary.workouts)}
          hint={`${summary.weekWorkouts} esta semana · ${summary.monthWorkouts} este mes`}
          icon={Dumbbell}
          accent="accent"
        />
        <StatCard
          label="Tiempo entrenando"
          value={formatDuration(summary.totalSeconds, 'short')}
          hint={`Media por sesión: ${formatDuration(summary.averageSeconds, 'short')}`}
          icon={Clock3}
          accent="info"
        />
        <StatCard
          label="Volumen efectivo"
          value={`${formatNumber(summary.totalVolumeKg)} kg`}
          hint={`${formatNumber(summary.totalSets)} series · ${formatNumber(summary.totalReps)} reps`}
          icon={TrendingUp}
          accent="success"
        />
        <StatCard
          label="Racha semanal"
          value={`${summary.streakWeeks} sem`}
          hint={`Mejor racha: ${summary.longestStreakWeeks} semanas`}
          icon={Flame}
          accent="warning"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Actividad semanal</CardTitle>
              <p className="mt-0.5 text-xs text-muted">Volumen efectivo de las últimas 8 semanas</p>
            </div>
            <Badge variant="secondary">
              <Activity className="h-3 w-3" /> kg totales
            </Badge>
          </CardHeader>
          <CardContent>
            {weekly.every((point) => point.volumeKg === 0) ? (
              <EmptyState
                compact
                icon={Activity}
                title="Todavía no hay actividad"
                description="Finaliza tu primer entrenamiento para empezar a construir tu gráfico de volumen."
                action={
                  <Button asChild size="sm">
                    <Link to="/workouts/new">
                      <Plus className="h-4 w-4" /> Registrar sesión
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="h-[230px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: 'var(--muted)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'var(--muted)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value: number) =>
                        value >= 1000 ? `${Math.round(value / 1000)}t` : String(value)
                      }
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,107,53,0.06)' }}
                      contentStyle={tooltipStyle}
                      formatter={(value) => [`${formatNumber(Number(value ?? 0))} kg`, 'Volumen']}
                    />
                    <Bar dataKey="volumeKg" radius={[7, 7, 0, 0]} fill={CHART_COLORS.accent} maxBarSize={38} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Grupos musculares</CardTitle>
              <p className="mt-0.5 text-xs text-muted">Series efectivas por grupo</p>
            </div>
            <Trophy className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            {muscles.length === 0 ? (
              <EmptyState
                compact
                icon={Dumbbell}
                title="Sin series registradas"
                description="Cuando completes series verás aquí el reparto por grupo muscular."
              />
            ) : (
              <div className="space-y-3">
                {muscles.slice(0, 6).map((muscle) => {
                  const max = Math.max(...muscles.map((item) => item.sets));
                  return (
                    <div key={muscle.muscle}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{muscle.label}</span>
                        <span className="tabular text-muted">{muscle.sets} series</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-hover">
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{
                            width: `${Math.max(4, (muscle.sets / max) * 100)}%`,
                            backgroundColor: MUSCLE_COLORS[muscle.muscle],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Últimas sesiones</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/history">
                Ver historial <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {!hasData ? (
              <EmptyState
                compact
                icon={CalendarCheck2}
                title="Tu historial empieza hoy"
                description="Crea un entrenamiento libre o inicia un día de tu rutina. Aquí aparecerán todas tus sesiones."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button asChild size="sm">
                      <Link to="/workouts/new">
                        <Plus className="h-4 w-4" /> Entrenamiento libre
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="secondary">
                      <Link to="/routines">Crear rutina</Link>
                    </Button>
                  </div>
                }
              />
            ) : (
              <ul className="divide-y divide-border/70">
                {recent.map((workout) => {
                  const sets = workout.exercises.reduce((total, item) => total + item.sets.length, 0);
                  return (
                    <li key={workout.id}>
                      <Link
                        to={`/history/${workout.id}`}
                        className="flex items-center gap-3 py-3 transition-colors hover:opacity-80"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-accent">
                          <Dumbbell className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{workout.name}</p>
                          <p className="text-[11px] text-muted">
                            {formatDate(workoutDate(workout))} · {workout.exercises.length} ejercicios ·{' '}
                            {sets} series
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="tabular text-sm font-semibold">
                            {formatDuration(
                              workout.durationSeconds ||
                                Math.max(
                                  0,
                                  Math.round(
                                    (new Date(workout.finishedAt ?? workout.updatedAt).getTime() -
                                      new Date(workout.startedAt ?? workout.createdAt).getTime()) /
                                      1000,
                                  ),
                                ),
                              'short',
                            )}
                          </p>
                          <p className="text-[10px] text-muted">duración</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{activePlan ? 'Rutina activa' : 'Próximo entrenamiento'}</CardTitle>
              <Layers className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent className="pt-0">
              {activePlan && activePlanDetail ? (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{activePlanDetail.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {activePlanDetail.days.length} días configurados
                      </p>
                    </div>
                    <Badge variant="success">Activa</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {activePlanDetail.days.slice(0, 3).map((day) => (
                      <Link
                        key={day.id}
                        to={`/workouts/new?plan=${activePlanDetail.id}&day=${day.id}`}
                        className="flex items-center gap-2.5 rounded-xl border border-border bg-surface/40 px-3 py-2.5 transition-colors hover:border-accent/30 hover:bg-surface"
                      >
                        <Play className="h-3.5 w-3.5 text-accent" />
                        <span className="flex-1 truncate text-xs font-medium">{day.name}</span>
                        <span className="text-[10px] text-muted">
                          {day.exercises.length} ejercicios
                        </span>
                      </Link>
                    ))}
                  </div>
                  <Button asChild variant="ghost" size="sm" className="mt-2 w-full">
                    <Link to={`/routines/${activePlanDetail.id}`}>Editar rutina</Link>
                  </Button>
                </div>
              ) : nextWorkout ? (
                <div className="rounded-xl border border-border bg-surface/40 p-4">
                  <p className="text-sm font-semibold">{nextWorkout.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDateTime(nextWorkout.scheduledAt)}
                  </p>
                  <Button asChild size="sm" className="mt-3 w-full">
                    <Link to={`/workouts/${nextWorkout.id}`}>Abrir programado</Link>
                  </Button>
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={Sparkles}
                  title="Sin rutina activa"
                  description="Organiza tus días de entrenamiento y arrastra tus ejercicios favoritos."
                  action={
                    <Button asChild size="sm">
                      <Link to="/routines">
                        <Plus className="h-4 w-4" /> Crear rutina
                      </Link>
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Récords recientes</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/records">Ver todos</Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {records.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
                  Completa series con peso para generar tus primeros récords.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {records.map((record) => (
                    <li key={record.key} className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning">
                        <Trophy className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{record.name}</p>
                        <p className="text-[10px] text-muted">
                          {formatDate(record.maxWeight?.achievedAt ?? null)}
                        </p>
                      </div>
                      <span className="tabular text-xs font-semibold text-warning">
                        {formatNumber(record.maxWeight?.weight ?? 0, 1)} {record.maxWeight?.unit}
                        <span className="ml-1 text-[10px] font-normal text-muted">
                          × {record.maxWeight?.reps}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {!hasData && workouts.length === 0 && plans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <Sparkles className="h-5 w-5 text-accent" />
            <p className="text-sm font-semibold">Bienvenido a HECOFIT</p>
            <p className="max-w-md text-xs leading-relaxed text-muted">
              Este panel solo muestra datos reales. Empieza registrando un entrenamiento libre o
              creando una rutina con tus días y ejercicios.
            </p>
          </CardContent>
        </Card>
      ) : null}

    </div>
  );
}
