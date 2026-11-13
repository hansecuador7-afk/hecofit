import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowDownUp,
  Dumbbell,
  Minus,
  RefreshCw,
  Scale,
  Timer,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import { useWorkoutsWithDetails } from '@/hooks/useHecoData';
import { CHART_COLORS, MUSCLE_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/dates';
import {
  estimateOneRepMaxKg,
  exerciseKeyOf,
  getDurationSeconds,
  isWorkingSet,
  setVolumeKg,
  workoutDate,
} from '@/lib/metrics';
import { cn, formatDuration, formatNumber, toKg } from '@/lib/utils';
import type { MuscleGroup, WorkoutDetail } from '@/types/models';

interface WorkoutAggregate {
  workout: WorkoutDetail;
  volume: number;
  sets: number;
  reps: number;
  exercises: number;
  duration: number;
  bestE1rm: number;
  maxWeight: number;
}

interface ExerciseComparison {
  key: string;
  name: string;
  muscle: MuscleGroup;
  aSets: number;
  bSets: number;
  aVolume: number;
  bVolume: number;
  aMax: number;
  bMax: number;
}

const tooltipStyle = {
  backgroundColor: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  fontSize: '12px',
  color: 'var(--foreground)',
} as const;

function aggregate(workout: WorkoutDetail): WorkoutAggregate {
  const working = workout.exercises.flatMap((exercise) => exercise.sets).filter(isWorkingSet);
  return {
    workout,
    volume: working.reduce((total, set) => total + setVolumeKg(set), 0),
    sets: working.length,
    reps: working.reduce((total, set) => total + set.reps, 0),
    exercises: workout.exercises.length,
    duration: getDurationSeconds(workout),
    bestE1rm: working.reduce((best, set) => Math.max(best, estimateOneRepMaxKg(set) ?? 0), 0),
    maxWeight: working.reduce((best, set) => Math.max(best, toKg(set.weight, set.weightUnit)), 0),
  };
}

function exerciseMap(workout: WorkoutDetail): Map<string, ExerciseComparison> {
  const map = new Map<string, ExerciseComparison>();
  for (const exercise of workout.exercises) {
    const key = exerciseKeyOf(exercise);
    const entry =
      map.get(key) ??
      {
        key,
        name: exercise.nameSnapshot,
        muscle: exercise.primaryMuscle,
        aSets: 0,
        bSets: 0,
        aVolume: 0,
        bVolume: 0,
        aMax: 0,
        bMax: 0,
      };
    for (const set of exercise.sets) {
      if (!isWorkingSet(set)) continue;
      entry.aSets += 1;
      entry.aVolume += setVolumeKg(set);
      entry.aMax = Math.max(entry.aMax, toKg(set.weight, set.weightUnit));
    }
    map.set(key, entry);
  }
  return map;
}

function Delta({
  current,
  previous,
  unit,
  invert = false,
}: {
  current: number;
  previous: number;
  unit: string;
  invert?: boolean;
}) {
  const diff = current - previous;
  const positive = invert ? diff < 0 : diff > 0;
  const negative = invert ? diff > 0 : diff < 0;
  const Icon = diff === 0 ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-semibold',
        diff === 0 ? 'text-muted' : positive ? 'text-success' : negative ? 'text-danger' : 'text-muted',
      )}
    >
      <Icon className="h-3 w-3" />
      {diff === 0 ? 'Igual' : `${diff > 0 ? '+' : ''}${formatNumber(diff, 1)} ${unit}`}
    </span>
  );
}

export default function ComparePage() {
  const workouts = useWorkoutsWithDetails();
  const [searchParams, setSearchParams] = useSearchParams();
  const idA = searchParams.get('a') ?? '';
  const idB = searchParams.get('b') ?? '';

  const finished = useMemo(
    () =>
      workouts
        .filter((workout) => workout.status === 'finished')
        .sort((a, b) => workoutDate(b).getTime() - workoutDate(a).getTime()),
    [workouts],
  );

  const workoutA = finished.find((workout) => workout.id === idA) ?? null;
  const workoutB = finished.find((workout) => workout.id === idB) ?? null;
  const aggregateA = workoutA ? aggregate(workoutA) : null;
  const aggregateB = workoutB ? aggregate(workoutB) : null;

  const comparison = useMemo(() => {
    if (!workoutA || !workoutB) return [];
    const mapA = exerciseMap(workoutA);
    const mapB = exerciseMap(workoutB);
    const keys = new Set([...mapA.keys(), ...mapB.keys()]);
    return [...keys]
      .map((key) => {
        const a = mapA.get(key);
        const b = mapB.get(key);
        return {
          key,
          name: a?.name ?? b?.name ?? 'Ejercicio',
          muscle: a?.muscle ?? b?.muscle ?? 'full_body',
          aSets: a?.aSets ?? 0,
          bSets: b?.bSets ?? 0,
          aVolume: a?.aVolume ?? 0,
          bVolume: b?.bVolume ?? 0,
          aMax: a?.aMax ?? 0,
          bMax: b?.bMax ?? 0,
        } satisfies ExerciseComparison;
      })
      .sort((a, b) => Math.max(b.aVolume, b.bVolume) - Math.max(a.aVolume, a.bVolume));
  }, [workoutA, workoutB]);

  const chartData = comparison
    .filter((item) => item.aVolume > 0 || item.bVolume > 0)
    .slice(0, 8)
    .map((item) => ({
      name: item.name.length > 16 ? `${item.name.slice(0, 15)}…` : item.name,
      a: Math.round(item.aVolume),
      b: Math.round(item.bVolume),
    }));

  const setParam = (key: 'a' | 'b', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const swap = () => {
    const next = new URLSearchParams();
    if (idB) next.set('a', idB);
    if (idA) next.set('b', idA);
    setSearchParams(next, { replace: true });
  };

  if (finished.length < 2) {
    return (
      <div className="space-y-5">
        <Button asChild variant="ghost" size="sm">
          <Link to="/history">
            <ArrowLeft className="h-4 w-4" /> Historial
          </Link>
        </Button>
        <EmptyState
          icon={ArrowDownUp}
          title="Necesitas al menos dos sesiones finalizadas"
          description="El comparador enfrenta dos entrenamientos reales para mostrar diferencias de volumen, series y cargas por ejercicio."
          action={
            <Button asChild>
              <Link to="/workouts/new">
                <Dumbbell className="h-4 w-4" /> Registrar entrenamiento
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/history">
            <ArrowLeft className="h-4 w-4" /> Historial
          </Link>
        </Button>
        <Button variant="secondary" size="sm" onClick={swap} disabled={!idA && !idB}>
          <RefreshCw className="h-3.5 w-3.5" /> Intercambiar A/B
        </Button>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Análisis</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Comparar entrenamientos
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          Elige dos sesiones finalizadas. Solo se cuentan series efectivas, sin calentamientos ni
          aproximaciones.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="default">Sesión A</Badge>
              {workoutA && <span className="text-[10px] text-muted">{formatDate(workoutDate(workoutA))}</span>}
            </div>
          </CardHeader>
          <CardContent>
            <Select
              value={idA}
              onChange={(event) => setParam('a', event.target.value)}
              aria-label="Primera sesión"
            >
              <option value="">Selecciona la primera sesión</option>
              {finished.map((workout) => (
                <option key={workout.id} value={workout.id} disabled={workout.id === idB}>
                  {formatDate(workoutDate(workout))} · {workout.name}
                </option>
              ))}
            </Select>
            {aggregateA ? (
              <div className="mt-3 space-y-2">
                <p className="truncate font-display text-lg font-semibold">{workoutA!.name}</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <span className="text-muted">Volumen</span>
                  <span className="tabular text-right font-semibold">
                    {formatNumber(aggregateA.volume)} kg
                  </span>
                  <span className="text-muted">Duración</span>
                  <span className="text-right font-semibold">
                    {formatDuration(aggregateA.duration, 'short')}
                  </span>
                  <span className="text-muted">Series efectivas</span>
                  <span className="tabular text-right font-semibold">{aggregateA.sets}</span>
                  <span className="text-muted">Repeticiones</span>
                  <span className="tabular text-right font-semibold">{formatNumber(aggregateA.reps)}</span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[11px] text-muted">Selecciona una sesión para ver su resumen.</p>
            )}
          </CardContent>
        </Card>

        <div className="hidden h-11 items-center justify-center lg:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-panel text-muted">
            <ArrowDownUp className="h-4 w-4" />
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="info">Sesión B</Badge>
              {workoutB && <span className="text-[10px] text-muted">{formatDate(workoutDate(workoutB))}</span>}
            </div>
          </CardHeader>
          <CardContent>
            <Select
              value={idB}
              onChange={(event) => setParam('b', event.target.value)}
              aria-label="Segunda sesión"
            >
              <option value="">Selecciona la segunda sesión</option>
              {finished.map((workout) => (
                <option key={workout.id} value={workout.id} disabled={workout.id === idA}>
                  {formatDate(workoutDate(workout))} · {workout.name}
                </option>
              ))}
            </Select>
            {aggregateB ? (
              <div className="mt-3 space-y-2">
                <p className="truncate font-display text-lg font-semibold">{workoutB!.name}</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <span className="text-muted">Volumen</span>
                  <span className="tabular text-right font-semibold">
                    {formatNumber(aggregateB.volume)} kg
                  </span>
                  <span className="text-muted">Duración</span>
                  <span className="text-right font-semibold">
                    {formatDuration(aggregateB.duration, 'short')}
                  </span>
                  <span className="text-muted">Series efectivas</span>
                  <span className="tabular text-right font-semibold">{aggregateB.sets}</span>
                  <span className="text-muted">Repeticiones</span>
                  <span className="tabular text-right font-semibold">{formatNumber(aggregateB.reps)}</span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[11px] text-muted">Selecciona una sesión para ver su resumen.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {!aggregateA || !aggregateB ? (
        <EmptyState
          compact
          icon={ArrowDownUp}
          title="Selecciona las dos sesiones"
          description="En cuanto elijas A y B verás la comparación de totales, ejercicios y cargas."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-muted">Volumen</p>
                  <Scale className="h-4 w-4 text-accent" />
                </div>
                <p className="tabular mt-2 font-display text-xl font-semibold">
                  {formatNumber(aggregateB.volume - aggregateA.volume > 0 ? aggregateB.volume : aggregateA.volume)}{' '}
                  kg
                </p>
                <div className="mt-1">
                  <Delta
                    current={aggregateB.volume}
                    previous={aggregateA.volume}
                    unit="kg"
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-muted">Series efectivas</p>
                  <Dumbbell className="h-4 w-4 text-success" />
                </div>
                <p className="tabular mt-2 font-display text-xl font-semibold">
                  {aggregateB.sets} vs {aggregateA.sets}
                </p>
                <div className="mt-1">
                  <Delta current={aggregateB.sets} previous={aggregateA.sets} unit="series" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-muted">1RM estimado</p>
                  <Trophy className="h-4 w-4 text-warning" />
                </div>
                <p className="tabular mt-2 font-display text-xl font-semibold">
                  {formatNumber(Math.max(aggregateA.bestE1rm, aggregateB.bestE1rm), 1)} kg
                </p>
                <div className="mt-1">
                  <Delta
                    current={aggregateB.bestE1rm}
                    previous={aggregateA.bestE1rm}
                    unit="kg"
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-muted">Duración</p>
                  <Timer className="h-4 w-4 text-sky-400" />
                </div>
                <p className="tabular mt-2 font-display text-xl font-semibold">
                  {formatDuration(aggregateB.duration, 'short')}
                </p>
                <div className="mt-1">
                  <Delta
                    current={aggregateB.duration}
                    previous={aggregateA.duration}
                    unit="s"
                    invert
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Volumen por ejercicio</CardTitle>
                  <p className="mt-0.5 text-xs text-muted">Serie A frente a serie B</p>
                </div>
                <TrendingUp className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <p className="py-10 text-center text-xs text-muted">
                    Ninguna de las dos sesiones tiene series efectivas con peso.
                  </p>
                ) : (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 8, right: 6, left: -12, bottom: 0 }}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: 'var(--muted)', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                          angle={-22}
                          textAnchor="end"
                          height={58}
                        />
                        <YAxis
                          tick={{ fill: 'var(--muted)', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value: number) =>
                            value >= 1000 ? `${Math.round(value / 1000)}t` : String(value)
                          }
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(255,107,53,0.05)' }}
                          contentStyle={tooltipStyle}
                          formatter={(value) => `${formatNumber(Number(value ?? 0))} kg`}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--muted)' }} />
                        <Bar
                          dataKey="a"
                          name="Sesión A"
                          fill={CHART_COLORS.muted}
                          radius={[5, 5, 0, 0]}
                          maxBarSize={26}
                        />
                        <Bar
                          dataKey="b"
                          name="Sesión B"
                          fill={CHART_COLORS.accent}
                          radius={[5, 5, 0, 0]}
                          maxBarSize={26}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Diferencias por ejercicio</CardTitle>
                <p className="text-xs text-muted">Ordenadas por volumen máximo de las dos sesiones</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {comparison.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted">Sin ejercicios comparables.</p>
                  ) : (
                    comparison.map((item) => {
                      const diff = item.bVolume - item.aVolume;
                      const max = Math.max(item.aVolume, item.bVolume, 1);
                      return (
                        <div key={item.key} className="rounded-xl border border-border/60 bg-surface/25 p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-semibold">{item.name}</p>
                            <span
                              className={cn(
                                'shrink-0 text-[10px] font-semibold',
                                diff > 0 ? 'text-success' : diff < 0 ? 'text-danger' : 'text-muted',
                              )}
                            >
                              {diff === 0 ? '=' : `${diff > 0 ? '+' : ''}${formatNumber(diff)} kg`}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-muted">
                            {MUSCLE_LABELS[item.muscle]} · A: {item.aSets} series /{' '}
                            {formatNumber(item.aVolume)} kg · B: {item.bSets} series /{' '}
                            {formatNumber(item.bVolume)} kg
                          </p>
                          <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-surface-hover">
                            <div
                              className="h-full bg-muted/70"
                              style={{ width: `${(item.aVolume / max) * 50}%` }}
                            />
                            <div
                              className="h-full bg-accent"
                              style={{ width: `${(item.bVolume / max) * 50}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-panel px-4 py-3">
            <p className="text-[11px] text-muted">
              A = {workoutA!.name} · B = {workoutB!.name}
            </p>
            <div className="flex gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to={`/history/${workoutA!.id}`}>
                  Ver A <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to={`/history/${workoutB!.id}`}>
                  Ver B <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
