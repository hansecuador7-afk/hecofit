import {
  ArrowUpRight,
  CalendarDays,
  Crown,
  Dumbbell,
  Flame,
  Medal,
  Repeat2,
  Search,
  Scale,
  Target,
  TrendingUp,
  Trophy,
  Weight,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { useWorkoutsWithDetails } from '@/hooks/useHecoData';
import { MUSCLE_LABELS } from '@/lib/constants';
import { formatDate, formatRelativeDay } from '@/lib/dates';
import {
  buildSessionVolumeRecords,
  computeExerciseRecords,
  isFinished,
  type ExerciseRecord,
} from '@/lib/metrics';
import { cn, formatDuration, formatNumber, formatWeight } from '@/lib/utils';
import { MUSCLE_GROUPS, type MuscleGroup } from '@/types/models';

function RecordStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-surface/30 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted">
        <Icon className="h-3.5 w-3.5 text-accent" /> {label}
      </div>
      <p className="tabular mt-1 text-base font-semibold">{value}</p>
      <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{hint}</p>
    </div>
  );
}

function RecordCard({ record }: { record: ExerciseRecord }) {
  return (
    <Card className="transition-colors hover:border-border-strong">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-display text-base font-semibold">{record.name}</h3>
              <Badge variant="secondary">{MUSCLE_LABELS[record.primaryMuscle]}</Badge>
            </div>
            <p className="mt-0.5 text-[11px] text-muted">
              {record.sessionCount} sesiones · {record.totalSets} series ·{' '}
              {formatNumber(record.totalVolumeKg)} kg acumulados
            </p>
          </div>
          {record.lastTrainedAt && (
            <span className="shrink-0 text-[10px] text-muted">
              {formatRelativeDay(record.lastTrainedAt)}
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <RecordStat
            icon={Weight}
            label="Carga máxima"
            value={
              record.maxWeight
                ? formatWeight(record.maxWeight.weight, record.maxWeight.unit, 1)
                : '—'
            }
            hint={
              record.maxWeight
                ? `${record.maxWeight.reps} reps · ${formatDate(record.maxWeight.achievedAt)}`
                : 'Sin series con peso'
            }
          />
          <RecordStat
            icon={Trophy}
            label="1RM estimado"
            value={
              record.bestE1rm ? `${formatNumber(record.bestE1rm.valueKg, 1)} kg` : '—'
            }
            hint={
              record.bestE1rm
                ? `${formatWeight(record.bestE1rm.weight, record.bestE1rm.unit, 1)} × ${record.bestE1rm.reps}`
                : 'Necesita 1–12 reps con peso'
            }
          />
          <RecordStat
            icon={Scale}
            label="Mejor serie"
            value={
              record.bestSetVolume
                ? `${formatNumber(record.bestSetVolume.volumeKg)} kg`
                : '—'
            }
            hint={
              record.bestSetVolume
                ? `${formatWeight(record.bestSetVolume.weight, record.bestSetVolume.unit, 1)} × ${record.bestSetVolume.reps} reps`
                : 'Sin volumen registrado'
            }
          />
          <RecordStat
            icon={Repeat2}
            label="Más repeticiones"
            value={record.maxReps ? `${record.maxReps.reps} reps` : '—'}
            hint={
              record.maxReps
                ? `${formatWeight(record.maxReps.weight, record.maxReps.unit, 1)} · ${formatDate(record.maxReps.achievedAt)}`
                : 'Sin repeticiones registradas'
            }
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {record.maxWeight && (
            <Button asChild variant="ghost" size="sm">
              <Link to={`/history/${record.maxWeight.workoutId}`}>
                <CalendarDays className="h-3.5 w-3.5" /> Ver sesión del récord
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link to={`/progress?exercise=${encodeURIComponent(record.key)}`}>
              <TrendingUp className="h-3.5 w-3.5" /> Ver progreso
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RecordsPage() {
  const workouts = useWorkoutsWithDetails();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all');
  const initialExercise = searchParams.get('exercise') ?? '';

  const finished = useMemo(() => workouts.filter(isFinished), [workouts]);
  const records = useMemo(() => computeExerciseRecords(finished), [finished]);
  const sessionRecords = useMemo(() => buildSessionVolumeRecords(finished).slice(0, 5), [finished]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const list = records.filter((record) => {
      if (muscle !== 'all' && record.primaryMuscle !== muscle) return false;
      if (!normalized) return true;
      return record.name.toLowerCase().includes(normalized);
    });
    if (initialExercise) {
      list.sort((a, b) => {
        if (a.key === initialExercise) return -1;
        if (b.key === initialExercise) return 1;
        return b.totalSets - a.totalSets;
      });
    }
    return list;
  }, [records, query, muscle, initialExercise]);

  const bestE1rm = useMemo(
    () =>
      records.reduce<ExerciseRecord | null>((best, record) => {
        if (!record.bestE1rm) return best;
        if (!best?.bestE1rm || record.bestE1rm.valueKg > best.bestE1rm.valueKg) return record;
        return best;
      }, null),
    [records],
  );
  const heaviest = useMemo(
    () =>
      records.reduce<ExerciseRecord | null>((best, record) => {
        if (!record.maxWeight) return best;
        if (!best?.maxWeight || record.maxWeight.weightKg > best.maxWeight.weightKg) return record;
        return best;
      }, null),
    [records],
  );
  const mostTrained = useMemo(
    () =>
      records.reduce<ExerciseRecord | null>(
        (best, record) => (!best || record.sessionCount > best.sessionCount ? record : best),
        null,
      ),
    [records],
  );
  const bestSession = sessionRecords[0] ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Análisis"
        title="Récords"
        description="Tus mejores marcas calculadas con las series efectivas de tus entrenamientos finalizados."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/progress">
                <TrendingUp className="h-4 w-4" /> Progreso
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

      {finished.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Todavía no hay récords"
          description="Los récords se calculan automáticamente cuando finalizas entrenamientos con series registradas. No hay datos inventados."
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
              label="Mejor 1RM estimado"
              value={
                bestE1rm?.bestE1rm
                  ? `${formatNumber(bestE1rm.bestE1rm.valueKg, 1)} kg`
                  : '—'
              }
              hint={bestE1rm?.name ?? 'Sin datos suficientes'}
              icon={Crown}
              accent="warning"
              footer={
                bestE1rm?.bestE1rm ? (
                  <Link
                    to={`/progress?exercise=${encodeURIComponent(bestE1rm.key)}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                  >
                    Ver evolución <ArrowUpRight className="h-3 w-3" />
                  </Link>
                ) : undefined
              }
            />
            <StatCard
              label="Carga más alta"
              value={
                heaviest?.maxWeight
                  ? formatWeight(heaviest.maxWeight.weight, heaviest.maxWeight.unit, 1)
                  : '—'
              }
              hint={heaviest?.name ?? 'Sin series con peso'}
              icon={Weight}
              accent="success"
            />
            <StatCard
              label="Ejercicio más entrenado"
              value={mostTrained ? `${mostTrained.sessionCount}` : '—'}
              hint={mostTrained ? `${mostTrained.name} · sesiones` : 'Sin datos'}
              icon={Flame}
              accent="accent"
            />
            <StatCard
              label="Mejor sesión por volumen"
              value={bestSession ? `${formatNumber(bestSession.volumeKg)} kg` : '—'}
              hint={bestSession ? bestSession.name : 'Sin sesiones finalizadas'}
              icon={Medal}
              accent="violet"
              footer={
                bestSession ? (
                  <Link
                    to={`/history/${bestSession.workoutId}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                  >
                    Ver sesión <ArrowUpRight className="h-3 w-3" />
                  </Link>
                ) : undefined
              }
            />
          </div>

          <div className="rounded-2xl border border-border bg-panel p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar ejercicio…"
                  className="pl-10"
                />
              </div>
              <Select
                value={muscle}
                onChange={(event) => setMuscle(event.target.value as MuscleGroup | 'all')}
                aria-label="Filtrar por músculo"
                className="lg:w-[200px]"
              >
                <option value="all">Todos los músculos</option>
                {MUSCLE_GROUPS.map((item) => (
                  <option key={item} value={item}>
                    {MUSCLE_LABELS[item]}
                  </option>
                ))}
              </Select>
            </div>
            {initialExercise && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-accent">
                <Target className="h-3.5 w-3.5" />
                Mostrando primero el ejercicio seleccionado desde Progreso.
              </p>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              compact
              icon={Search}
              title="Sin récords que coincidan"
              description="Prueba con otro nombre de ejercicio o cambia el filtro muscular."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('');
                    setMuscle('all');
                  }}
                >
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {filtered.map((record) => (
                <div
                  key={record.key}
                  className={cn(
                    initialExercise === record.key && 'rounded-2xl ring-1 ring-accent/40',
                  )}
                >
                  <RecordCard record={record} />
                </div>
              ))}
            </div>
          )}

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                    <Trophy className="h-4 w-4 text-warning" /> Mejores sesiones por volumen
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Top 5 de sesiones finalizadas, ordenadas por volumen efectivo
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/history">Historial</Link>
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                {sessionRecords.map((session, index) => (
                  <Link
                    key={session.workoutId}
                    to={`/history/${session.workoutId}`}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface/20 p-2.5 transition-colors hover:border-accent/30 hover:bg-surface/50"
                  >
                    <span
                      className={cn(
                        'tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold',
                        index === 0 ? 'bg-warning/15 text-warning' : 'bg-surface text-muted',
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{session.name}</p>
                      <p className="text-[10px] text-muted">
                        {formatDate(session.date)} · {session.sets} series ·{' '}
                        {formatDuration(session.durationSeconds, 'short')}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-xs font-semibold">
                      {formatNumber(session.volumeKg)} kg
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
