import { addDays } from 'date-fns';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  Dumbbell,
  Flame,
  LineChart as LineChartIcon,
  Minus,
  Scale,
  Target,
  Timer,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
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
import { Input, Select } from '@/components/ui/input';
import { useWorkoutsWithDetails } from '@/hooks/useHecoData';
import { CHART_COLORS, MUSCLE_COLORS, MUSCLE_LABELS } from '@/lib/constants';
import { dateKey } from '@/lib/dates';
import {
  buildExerciseProgress,
  buildMuscleDistribution,
  buildTopExercises,
  buildWeeklyActivity,
  comparePeriods,
  computeExerciseRecords,
  computeWorkoutTotals,
  filterWorkoutsByRange,
  getExerciseOptions,
  getRangeBounds,
  isFinished,
  percentChange,
  PROGRESS_RANGE_OPTIONS,
  workoutsPerWeek,
  type ProgressRange,
} from '@/lib/metrics';
import { cn, formatDuration, formatNumber } from '@/lib/utils';

const tooltipStyle = {
  backgroundColor: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  fontSize: '12px',
  color: 'var(--foreground)',
} as const;

function DeltaBadge({ value, suffix = '%' }: { value: number | null; suffix?: string }) {
  if (value === null) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted">
        <Minus className="h-3 w-3" /> Sin periodo previo
      </span>
    );
  }
  const rounded = Math.round(value);
  if (rounded === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted">
        <Minus className="h-3 w-3" /> Sin cambios
      </span>
    );
  }
  const positive = rounded > 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-semibold',
        positive ? 'text-success' : 'text-danger',
      )}
    >
      <Icon className="h-3 w-3" />
      {positive ? '+' : ''}
      {rounded}
      {suffix} vs periodo anterior
    </span>
  );
}

export default function ProgressPage() {
  const workouts = useWorkoutsWithDetails();
  const [searchParams, setSearchParams] = useSearchParams();
  const [range, setRange] = useState<ProgressRange>(90);
  const [customStart, setCustomStart] = useState(() => dateKey(addDays(new Date(), -29)));
  const [customEnd, setCustomEnd] = useState(() => dateKey(new Date()));
  const [exerciseKey, setExerciseKey] = useState(searchParams.get('exercise') ?? '');

  const finished = useMemo(() => workouts.filter(isFinished), [workouts]);
  const exerciseOptions = useMemo(() => getExerciseOptions(finished), [finished]);

  useEffect(() => {
    if (!exerciseKey) return;
    if (exerciseOptions.some((option) => option.key === exerciseKey)) return;
    setExerciseKey('');
    const next = new URLSearchParams(searchParams);
    next.delete('exercise');
    setSearchParams(next, { replace: true });
  }, [exerciseKey, exerciseOptions, searchParams, setSearchParams]);

  const bounds = useMemo(
    () => getRangeBounds(range, customStart, customEnd),
    [range, customStart, customEnd],
  );
  const ranged = useMemo(() => filterWorkoutsByRange(workouts, bounds), [workouts, bounds]);
  const totals = useMemo(() => computeWorkoutTotals(ranged), [ranged]);
  const comparison = useMemo(() => comparePeriods(workouts, bounds), [workouts, bounds]);
  const weekly = useMemo(() => buildWeeklyActivity(ranged, 10), [ranged]);
  const muscles = useMemo(
    () => buildMuscleDistribution(ranged).filter((item) => item.sets > 0),
    [ranged],
  );
  const topExercises = useMemo(() => buildTopExercises(ranged, 6), [ranged]);
  const records = useMemo(() => computeExerciseRecords(ranged), [ranged]);

  const selectedOption = exerciseOptions.find((option) => option.key === exerciseKey) ?? null;
  const selectedRecord = records.find((record) => record.key === exerciseKey) ?? null;
  const progress = useMemo(
    () => (exerciseKey ? buildExerciseProgress(ranged, exerciseKey) : []),
    [ranged, exerciseKey],
  );

  const avgPerWeek = workoutsPerWeek(ranged, Math.max(1, Math.ceil(ranged.length / 3) || 4));
  const volumeChange = percentChange(comparison.current.totalVolumeKg, comparison.previous.totalVolumeKg);
  const workoutChange = percentChange(comparison.current.workouts, comparison.previous.workouts);
  const durationChange = percentChange(comparison.current.totalSeconds, comparison.previous.totalSeconds);
  const maxVolumePoint = weekly.reduce(
    (best, point) => (point.volumeKg > best.volumeKg ? point : best),
    weekly[0] ?? { key: '', label: '', workouts: 0, volumeKg: 0, durationSeconds: 0 },
  );

  const updateExercise = (value: string) => {
    setExerciseKey(value);
    const next = new URLSearchParams(searchParams);
    if (value) next.set('exercise', value);
    else next.delete('exercise');
    setSearchParams(next, { replace: true });
  };

  const chartData = progress.map((point) => ({
    label: point.label,
    volumeKg: Math.round(point.volumeKg),
    maxWeightKg: Math.round(point.maxWeightKg * 10) / 10,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Análisis"
        title="Progreso"
        description="Evolución real de tu volumen, cargas y constancia. Solo se incluyen series efectivas de sesiones finalizadas."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/records">
                <Trophy className="h-4 w-4" /> Récords
              </Link>
            </Button>
            <Button asChild>
              <Link to="/workouts/new">
                <Dumbbell className="h-4 w-4" /> Entrenar
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-panel p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-muted">
          <CalendarRange className="h-4 w-4 text-accent" />
          <span className="font-semibold text-foreground/80">Periodo analizado</span>
          <span>
            {dateKey(bounds.start)} — {dateKey(bounds.end)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(range)}
            onChange={(event) => {
              const value = event.target.value;
              setRange(value === 'custom' || value === 'all' ? value : (Number(value) as ProgressRange));
            }}
            aria-label="Rango de progreso"
            className="h-9 w-[150px] text-xs"
          >
            {PROGRESS_RANGE_OPTIONS.map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </Select>
          {range === 'custom' && (
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(event) => setCustomStart(event.target.value)}
                aria-label="Fecha inicial"
                className="h-9 w-[142px] text-xs"
              />
              <span className="text-xs text-muted">—</span>
              <Input
                type="date"
                value={customEnd}
                min={customStart}
                onChange={(event) => setCustomEnd(event.target.value)}
                aria-label="Fecha final"
                className="h-9 w-[142px] text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {finished.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Aún no hay progreso que analizar"
          description="Finaliza tu primer entrenamiento para empezar a ver volumen, cargas, constancia y récords calculados con tus datos reales."
          action={
            <Button asChild>
              <Link to="/workouts/new">
                <Dumbbell className="h-4 w-4" /> Registrar entrenamiento
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              label="Sesiones"
              value={formatNumber(totals.workouts)}
              hint={`${avgPerWeek.toFixed(1)} por semana`}
              icon={Activity}
              accent="accent"
              footer={<DeltaBadge value={workoutChange} />}
            />
            <StatCard
              label="Volumen efectivo"
              value={`${formatNumber(totals.totalVolumeKg)} kg`}
              hint={`${formatNumber(totals.totalSets)} series · ${formatNumber(totals.totalReps)} reps`}
              icon={Scale}
              accent="success"
              footer={<DeltaBadge value={volumeChange} />}
            />
            <StatCard
              label="Tiempo entrenado"
              value={formatDuration(totals.totalSeconds, 'short')}
              hint={`Media ${formatDuration(totals.averageSeconds, 'short')} por sesión`}
              icon={Timer}
              accent="warning"
              footer={<DeltaBadge value={durationChange} />}
            />
            <StatCard
              label="Mejor semana"
              value={`${formatNumber(maxVolumePoint.volumeKg)} kg`}
              hint={maxVolumePoint.label || 'Sin datos'}
              icon={Flame}
              accent="violet"
              footer={
                <span className="text-[11px] text-muted">
                  {maxVolumePoint.workouts} sesión{maxVolumePoint.workouts === 1 ? '' : 'es'} en esa semana
                </span>
              }
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-accent" /> Volumen semanal
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted">Series efectivas convertidas a kg</p>
                </div>
                <Badge variant="secondary">{weekly.length} semanas</Badge>
              </CardHeader>
              <CardContent>
                {weekly.every((point) => point.volumeKg === 0) ? (
                  <p className="py-16 text-center text-xs text-muted">
                    No hay volumen registrado en este periodo.
                  </p>
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weekly} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: 'var(--muted)', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
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
                          cursor={{ fill: 'rgba(255,107,53,0.06)' }}
                          contentStyle={tooltipStyle}
                          formatter={(value) => [`${formatNumber(Number(value ?? 0))} kg`, 'Volumen']}
                        />
                        <Bar
                          dataKey="volumeKg"
                          name="Volumen"
                          radius={[6, 6, 0, 0]}
                          fill={CHART_COLORS.accent}
                          maxBarSize={42}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-accent" /> Distribución muscular
                </CardTitle>
                <p className="text-xs text-muted">Series efectivas por grupo muscular</p>
              </CardHeader>
              <CardContent className="pt-0">
                {muscles.length === 0 ? (
                  <p className="py-10 text-center text-xs text-muted">Sin series en este periodo.</p>
                ) : (
                  <div className="space-y-2.5">
                    {muscles.slice(0, 8).map((item) => {
                      const max = Math.max(...muscles.map((muscle) => muscle.sets), 1);
                      return (
                        <div key={item.muscle}>
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-medium">{item.label}</span>
                            <span className="tabular text-muted">
                              {item.sets} series · {formatNumber(item.volumeKg)} kg
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-hover">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(item.sets / max) * 100}%`,
                                backgroundColor: MUSCLE_COLORS[item.muscle],
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

          <Card>
            <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LineChartIcon className="h-4 w-4 text-accent" /> Evolución por ejercicio
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted">
                  Carga máxima y volumen de cada sesión para el ejercicio elegido
                </p>
              </div>
              <Select
                value={exerciseKey}
                onChange={(event) => updateExercise(event.target.value)}
                aria-label="Elegir ejercicio"
                className="h-9 w-full text-xs sm:w-[260px]"
              >
                <option value="">Selecciona un ejercicio</option>
                {exerciseOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.name} · {MUSCLE_LABELS[option.muscle]}
                  </option>
                ))}
              </Select>
            </CardHeader>
            <CardContent>
              {!selectedOption ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
                  <LineChartIcon className="h-7 w-7 text-muted/50" />
                  <p className="mt-2 text-sm font-semibold">Elige un ejercicio</p>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">
                    Verás su progresión de carga y volumen sesión a sesión, además de sus récords en
                    el periodo seleccionado.
                  </p>
                </div>
              ) : chartData.length === 0 ? (
                <p className="py-12 text-center text-xs text-muted">
                  Este ejercicio no tiene registros en el periodo seleccionado.
                </p>
              ) : (
                <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: 'var(--muted)', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fill: 'var(--muted)', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value: number) =>
                            value >= 1000 ? `${Math.round(value / 1000)}t` : String(value)
                          }
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fill: 'var(--muted)', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(value, name) => [
                            `${formatNumber(Number(value ?? 0), name === 'Carga máxima' ? 1 : 0)} kg`,
                            String(name),
                          ]}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--muted)' }} />
                        <Bar
                          yAxisId="left"
                          dataKey="volumeKg"
                          name="Volumen"
                          fill={CHART_COLORS.accent}
                          radius={[5, 5, 0, 0]}
                          maxBarSize={32}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="maxWeightKg"
                          name="Carga máxima"
                          stroke={CHART_COLORS.success}
                          strokeWidth={2}
                          dot={{ r: 3, fill: CHART_COLORS.success }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-xl border border-border/70 bg-surface/30 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted">
                        Récord de carga · {selectedOption.name}
                      </p>
                      <p className="tabular mt-1 text-lg font-semibold">
                        {selectedRecord?.maxWeight
                          ? `${formatNumber(selectedRecord.maxWeight.weightKg, 1)} kg`
                          : 'Sin peso registrado'}
                      </p>
                      <p className="text-[10px] text-muted">
                        {selectedRecord?.maxWeight
                          ? `${selectedRecord.maxWeight.reps} reps · ${selectedRecord.sessionCount} sesiones`
                          : 'Añade peso a tus series para calcularlo'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-surface/30 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted">1RM estimado</p>
                      <p className="tabular mt-1 text-lg font-semibold">
                        {selectedRecord?.bestE1rm
                          ? `${formatNumber(selectedRecord.bestE1rm.valueKg, 1)} kg`
                          : 'Sin datos suficientes'}
                      </p>
                      <p className="text-[10px] text-muted">
                        Fórmula de Epley con series de 1 a 12 repeticiones
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-surface/30 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted">
                        Volumen total en el periodo
                      </p>
                      <p className="tabular mt-1 text-lg font-semibold">
                        {formatNumber(selectedRecord?.totalVolumeKg ?? 0)} kg
                      </p>
                      <p className="text-[10px] text-muted">
                        {selectedRecord?.totalSets ?? 0} series efectivas
                      </p>
                    </div>
                    <Button asChild variant="secondary" size="sm" className="w-full">
                      <Link to={`/records?exercise=${encodeURIComponent(exerciseKey)}`}>
                        <Trophy className="h-3.5 w-3.5" /> Ver todos los récords
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-accent" /> Ejercicios con más trabajo
                </CardTitle>
                <p className="text-xs text-muted">Ordenados por series efectivas del periodo</p>
              </CardHeader>
              <CardContent className="pt-0">
                {topExercises.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted">Sin ejercicios registrados.</p>
                ) : (
                  <div className="space-y-2">
                    {topExercises.map((item, index) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => updateExercise(item.key)}
                        className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-surface/20 p-2.5 text-left transition-colors hover:border-accent/30 hover:bg-surface/50"
                      >
                        <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface text-[11px] font-bold text-accent">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">{item.name}</p>
                          <p className="text-[10px] text-muted">
                            {MUSCLE_LABELS[item.primaryMuscle]} · {item.sessions} sesiones ·{' '}
                            {item.sets} series
                          </p>
                        </div>
                        <span className="tabular shrink-0 text-[11px] font-semibold">
                          {formatNumber(item.volumeKg)} kg
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-accent" /> Comparativa de periodos
                </CardTitle>
                <p className="text-xs text-muted">
                  Periodo actual frente al inmediatamente anterior de la misma duración
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: 'Sesiones',
                      current: comparison.current.workouts,
                      previous: comparison.previous.workouts,
                      format: (value: number) => formatNumber(value),
                    },
                    {
                      label: 'Volumen',
                      current: comparison.current.totalVolumeKg,
                      previous: comparison.previous.totalVolumeKg,
                      format: (value: number) => `${formatNumber(value)} kg`,
                    },
                    {
                      label: 'Duración',
                      current: comparison.current.totalSeconds,
                      previous: comparison.previous.totalSeconds,
                      format: (value: number) => formatDuration(value, 'short'),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-border/70 bg-surface/25 p-3 text-center"
                    >
                      <p className="text-[10px] uppercase tracking-wider text-muted">{item.label}</p>
                      <p className="tabular mt-1 text-base font-semibold">{item.format(item.current)}</p>
                      <p className="text-[10px] text-muted">antes: {item.format(item.previous)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl border border-border/70 bg-surface/25 p-3">
                  <p className="text-[11px] font-semibold">Lectura rápida</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    {comparison.current.workouts === 0
                      ? 'No hay sesiones finalizadas en este periodo. Amplía el rango o registra un entrenamiento.'
                      : comparison.previous.workouts === 0
                        ? `Has completado ${comparison.current.workouts} sesiones en este periodo. No hay un periodo anterior comparable todavía.`
                        : comparison.volumeDelta === 0
                          ? 'Tu volumen se mantiene igual que en el periodo anterior.'
                          : comparison.volumeDelta > 0
                            ? `Tu volumen ha subido ${formatNumber(comparison.volumeDelta)} kg respecto al periodo anterior.`
                            : `Tu volumen ha bajado ${formatNumber(Math.abs(comparison.volumeDelta))} kg respecto al periodo anterior.`}
                  </p>
                </div>
                <div className="mt-3 h-[140px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        {
                          name: 'Anterior',
                          volumen: Math.round(comparison.previous.totalVolumeKg),
                        },
                        {
                          name: 'Actual',
                          volumen: Math.round(comparison.current.totalVolumeKg),
                        },
                      ]}
                      margin={{ top: 6, right: 6, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="progress-comparison" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="name"
                        tick={{ fill: 'var(--muted)', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [`${formatNumber(Number(value ?? 0))} kg`, 'Volumen']}
                      />
                      <Area
                        type="monotone"
                        dataKey="volumen"
                        stroke={CHART_COLORS.accent}
                        strokeWidth={2}
                        fill="url(#progress-comparison)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
