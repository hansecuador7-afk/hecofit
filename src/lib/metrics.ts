import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfDay,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { MUSCLE_LABELS, WEEKLY_STREAK_LOOKBACK } from '@/lib/constants';
import { dateKey, formatDate, toDate, WEEK_OPTIONS } from '@/lib/dates';
import { safeDivide, toKg } from '@/lib/utils';
import type {
  Exercise,
  MuscleGroup,
  SetType,
  WeightUnit,
  Workout,
  WorkoutDetail,
  WorkoutSet,
} from '@/types/models';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface WorkoutTotals {
  workouts: number;
  totalSeconds: number;
  averageSeconds: number;
  totalVolumeKg: number;
  totalSets: number;
  totalReps: number;
  exerciseCount: number;
}

export interface SummaryMetrics extends WorkoutTotals {
  weekWorkouts: number;
  monthWorkouts: number;
  streakWeeks: number;
  longestStreakWeeks: number;
  lastWorkout: Workout | null;
  nextWorkout: Workout | null;
  activePlanId: string | null;
}

export interface ActivityPoint {
  key: string;
  label: string;
  workouts: number;
  volumeKg: number;
  durationSeconds: number;
}

export interface MusclePoint {
  muscle: MuscleGroup;
  label: string;
  sets: number;
  volumeKg: number;
  sessions: number;
}

export interface TrackedSet {
  set: WorkoutSet;
  workout: Workout;
  exerciseKey: string;
  exerciseName: string;
  primaryMuscle: MuscleGroup;
  exerciseId: string | null;
  userExerciseId: string | null;
}

export interface ExerciseRecord {
  key: string;
  name: string;
  primaryMuscle: MuscleGroup;
  exerciseId: string | null;
  userExerciseId: string | null;
  sessionCount: number;
  totalSets: number;
  totalVolumeKg: number;
  lastTrainedAt: string | null;
  maxWeight: {
    weightKg: number;
    weight: number;
    unit: WeightUnit;
    reps: number;
    workoutId: string;
    achievedAt: string;
  } | null;
  bestE1rm: {
    valueKg: number;
    weight: number;
    unit: WeightUnit;
    reps: number;
    workoutId: string;
    achievedAt: string;
  } | null;
  bestSetVolume: {
    volumeKg: number;
    weight: number;
    unit: WeightUnit;
    reps: number;
    workoutId: string;
    achievedAt: string;
  } | null;
  maxReps: {
    reps: number;
    weight: number;
    unit: WeightUnit;
    workoutId: string;
    achievedAt: string;
  } | null;
}

export interface ExerciseProgressPoint {
  date: string;
  label: string;
  maxWeightKg: number;
  volumeKg: number;
  reps: number;
  sets: number;
}

export type ProgressRange = 7 | 30 | 90 | 180 | 365 | 'custom' | 'all';

export const PROGRESS_RANGE_OPTIONS: Array<{ value: ProgressRange; label: string }> = [
  { value: 7, label: '7 días' },
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
  { value: 180, label: '6 meses' },
  { value: 365, label: '1 año' },
  { value: 'custom', label: 'Personalizado' },
  { value: 'all', label: 'Todo' },
];

export function workoutDate(workout: Workout): Date {
  return (
    toDate(workout.startedAt) ??
    toDate(workout.finishedAt) ??
    toDate(workout.scheduledAt) ??
    toDate(workout.createdAt) ??
    new Date()
  );
}

export function isFinished(workout: Workout): boolean {
  return workout.status === 'finished';
}

export function getDurationSeconds(workout: Workout): number {
  if (workout.status === 'in_progress' && workout.startedAt) {
    const start = toDate(workout.startedAt);
    return start ? Math.max(0, Math.round((Date.now() - start.getTime()) / 1000)) : 0;
  }
  if (workout.durationSeconds > 0) return workout.durationSeconds;
  const start = toDate(workout.startedAt);
  const end = toDate(workout.finishedAt);
  if (start && end) return Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
  return 0;
}

/**
 * Las series de calentamiento y aproximación no forman parte del volumen
 * efectivo de entrenamiento, por lo que no se suman a las métricas.
 */
export function isWorkingSet(set: WorkoutSet): boolean {
  return set.isCompleted && set.setType !== 'warmup' && set.setType !== 'approximation';
}

export function exerciseKeyOf(item: {
  exerciseId: string | null;
  userExerciseId: string | null;
  nameSnapshot: string;
}): string {
  return item.exerciseId ?? item.userExerciseId ?? `name:${item.nameSnapshot.toLowerCase()}`;
}

export function setVolumeKg(set: WorkoutSet): number {
  if (!isWorkingSet(set) || set.reps <= 0) return 0;
  return toKg(set.weight, set.weightUnit) * set.reps;
}

export function estimateOneRepMaxKg(set: WorkoutSet): number | null {
  if (!set.isCompleted || set.reps <= 0 || set.weight <= 0 || set.reps > 12) return null;
  const weightKg = toKg(set.weight, set.weightUnit);
  return weightKg * (1 + set.reps / 30);
}

export function flattenTrackedSets(workouts: WorkoutDetail[]): TrackedSet[] {
  const tracked: TrackedSet[] = [];
  for (const workout of workouts) {
    if (!isFinished(workout)) continue;
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        tracked.push({
          set,
          workout,
          exerciseKey: exerciseKeyOf(exercise),
          exerciseName: exercise.nameSnapshot,
          primaryMuscle: exercise.primaryMuscle,
          exerciseId: exercise.exerciseId,
          userExerciseId: exercise.userExerciseId,
        });
      }
    }
  }
  return tracked;
}

export function flattenAllSets(workouts: WorkoutDetail[]): TrackedSet[] {
  const tracked: TrackedSet[] = [];
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        tracked.push({
          set,
          workout,
          exerciseKey: exerciseKeyOf(exercise),
          exerciseName: exercise.nameSnapshot,
          primaryMuscle: exercise.primaryMuscle,
          exerciseId: exercise.exerciseId,
          userExerciseId: exercise.userExerciseId,
        });
      }
    }
  }
  return tracked;
}

export function computeWorkoutTotals(workouts: WorkoutDetail[]): WorkoutTotals {
  const finished = workouts.filter(isFinished);
  let totalSeconds = 0;
  let totalVolumeKg = 0;
  let totalSets = 0;
  let totalReps = 0;
  let exerciseCount = 0;
  for (const workout of finished) {
    totalSeconds += getDurationSeconds(workout);
    for (const exercise of workout.exercises) {
      exerciseCount += 1;
      for (const set of exercise.sets) {
        if (!set.isCompleted) continue;
        totalSets += 1;
        if (!isWorkingSet(set)) continue;
        totalReps += set.reps;
        totalVolumeKg += setVolumeKg(set);
      }
    }
  }
  return {
    workouts: finished.length,
    totalSeconds,
    averageSeconds: Math.round(safeDivide(totalSeconds, finished.length)),
    totalVolumeKg,
    totalSets,
    totalReps,
    exerciseCount,
  };
}

export function computeWeeklyStreaks(workouts: WorkoutDetail[]): {
  current: number;
  longest: number;
} {
  const weeks = new Set<string>();
  for (const workout of workouts) {
    if (!isFinished(workout)) continue;
    weeks.add(dateKey(startOfWeek(workoutDate(workout), WEEK_OPTIONS)));
  }
  if (weeks.size === 0) return { current: 0, longest: 0 };

  const sorted = [...weeks].sort();
  let longest = 1;
  let run = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = new Date(`${sorted[index - 1]}T12:00:00`);
    const current = new Date(`${sorted[index]}T12:00:00`);
    if (differenceInCalendarDays(current, previous) === 7) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  let cursor = startOfWeek(new Date(), WEEK_OPTIONS);
  if (!weeks.has(dateKey(cursor))) {
    cursor = addWeeks(cursor, -1);
  }
  let currentStreak = 0;
  let guard = 0;
  while (weeks.has(dateKey(cursor)) && guard < WEEKLY_STREAK_LOOKBACK) {
    currentStreak += 1;
    cursor = addWeeks(cursor, -1);
    guard += 1;
  }
  return { current: currentStreak, longest };
}

export function computeSummary(
  workouts: WorkoutDetail[],
  activePlanId: string | null,
): SummaryMetrics {
  const totals = computeWorkoutTotals(workouts);
  const finished = workouts
    .filter(isFinished)
    .sort((a, b) => workoutDate(b).getTime() - workoutDate(a).getTime());
  const now = new Date();
  const weekStart = startOfWeek(now, WEEK_OPTIONS);
  const monthStart = startOfMonth(now);
  const streak = computeWeeklyStreaks(workouts);
  const upcoming = workouts
    .filter((workout) => {
      if (workout.status !== 'scheduled') return false;
      const date = toDate(workout.scheduledAt);
      return date ? date.getTime() >= now.getTime() : false;
    })
    .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''));

  return {
    ...totals,
    weekWorkouts: finished.filter((workout) => workoutDate(workout) >= weekStart).length,
    monthWorkouts: finished.filter((workout) => workoutDate(workout) >= monthStart).length,
    streakWeeks: streak.current,
    longestStreakWeeks: streak.longest,
    lastWorkout: finished[0] ?? null,
    nextWorkout: upcoming[0] ?? null,
    activePlanId,
  };
}

export function buildWeeklyActivity(workouts: WorkoutDetail[], weeks = 8): ActivityPoint[] {
  const currentWeek = startOfWeek(new Date(), WEEK_OPTIONS);
  const points: ActivityPoint[] = [];
  for (let index = weeks - 1; index >= 0; index -= 1) {
    const start = addWeeks(currentWeek, -index);
    const end = addDays(start, 7);
    const inWeek = workouts.filter((workout) => {
      if (!isFinished(workout)) return false;
      const date = workoutDate(workout);
      return date >= start && date < end;
    });
    const totals = computeWorkoutTotals(inWeek);
    points.push({
      key: dateKey(start),
      label: format(start, 'd MMM', { locale: es }),
      workouts: inWeek.length,
      volumeKg: totals.totalVolumeKg,
      durationSeconds: totals.totalSeconds,
    });
  }
  return points;
}

export function buildMonthlyActivity(workouts: WorkoutDetail[], months = 6): ActivityPoint[] {
  const now = new Date();
  const points: ActivityPoint[] = [];
  for (let index = months - 1; index >= 0; index -= 1) {
    const start = startOfMonth(addMonths(now, -index));
    const end = startOfMonth(addMonths(now, -index + 1));
    const inMonth = workouts.filter((workout) => {
      if (!isFinished(workout)) return false;
      const date = workoutDate(workout);
      return date >= start && date < end;
    });
    const totals = computeWorkoutTotals(inMonth);
    points.push({
      key: dateKey(start),
      label: format(start, 'MMM', { locale: es }).replace('.', ''),
      workouts: inMonth.length,
      volumeKg: totals.totalVolumeKg,
      durationSeconds: totals.totalSeconds,
    });
  }
  return points;
}

export function buildMuscleDistribution(workouts: WorkoutDetail[]): MusclePoint[] {
  const byMuscle = new Map<MuscleGroup, { sets: number; volumeKg: number; workoutIds: Set<string> }>();
  for (const workout of workouts) {
    if (!isFinished(workout)) continue;
    for (const exercise of workout.exercises) {
      const entry = byMuscle.get(exercise.primaryMuscle) ?? {
        sets: 0,
        volumeKg: 0,
        workoutIds: new Set<string>(),
      };
      for (const set of exercise.sets) {
        if (!set.isCompleted) continue;
        entry.sets += 1;
        entry.volumeKg += setVolumeKg(set);
        entry.workoutIds.add(workout.id);
      }
      byMuscle.set(exercise.primaryMuscle, entry);
    }
  }
  return [...byMuscle.entries()]
    .map(([muscle, value]) => ({
      muscle,
      label: MUSCLE_LABELS[muscle],
      sets: value.sets,
      volumeKg: value.volumeKg,
      sessions: value.workoutIds.size,
    }))
    .sort((a, b) => b.sets - a.sets);
}

export interface TopExercise {
  key: string;
  name: string;
  primaryMuscle: MuscleGroup;
  sessions: number;
  sets: number;
  volumeKg: number;
  lastTrainedAt: string;
}

export function buildTopExercises(workouts: WorkoutDetail[], limit = 8): TopExercise[] {
  const map = new Map<string, TopExercise & { workoutIds: Set<string> }>();
  for (const workout of workouts) {
    if (!isFinished(workout)) continue;
    for (const exercise of workout.exercises) {
      const key = exerciseKeyOf(exercise);
      const entry =
        map.get(key) ??
        {
          key,
          name: exercise.nameSnapshot,
          primaryMuscle: exercise.primaryMuscle,
          sessions: 0,
          sets: 0,
          volumeKg: 0,
          lastTrainedAt: '',
          workoutIds: new Set<string>(),
        };
      for (const set of exercise.sets) {
        if (!set.isCompleted) continue;
        entry.sets += 1;
        entry.volumeKg += setVolumeKg(set);
        entry.workoutIds.add(workout.id);
      }
      const date = dateKey(workoutDate(workout));
      if (date > entry.lastTrainedAt) entry.lastTrainedAt = date;
      map.set(key, entry);
    }
  }
  return [...map.values()]
    .map(({ workoutIds, ...entry }) => ({ ...entry, sessions: workoutIds.size }))
    .sort((a, b) => b.sets - a.sets)
    .slice(0, limit);
}

export function computeExerciseRecords(workouts: WorkoutDetail[]): ExerciseRecord[] {
  const tracked = flattenTrackedSets(workouts);
  if (tracked.length === 0) return [];
  const records = new Map<string, ExerciseRecord>();

  for (const entry of tracked) {
    const key = entry.exerciseKey;
    let record = records.get(key);
    if (!record) {
      record = {
        key,
        name: entry.exerciseName,
        primaryMuscle: entry.primaryMuscle,
        exerciseId: entry.exerciseId,
        userExerciseId: entry.userExerciseId,
        sessionCount: 0,
        totalSets: 0,
        totalVolumeKg: 0,
        lastTrainedAt: null,
        maxWeight: null,
        bestE1rm: null,
        bestSetVolume: null,
        maxReps: null,
      };
      records.set(key, record);
    }

    if (!entry.set.isCompleted) continue;
    const workoutDateIso = workoutDate(entry.workout).toISOString();
    record.totalSets += 1;
    record.totalVolumeKg += setVolumeKg(entry.set);
    if (!record.lastTrainedAt || workoutDateIso > record.lastTrainedAt) {
      record.lastTrainedAt = workoutDateIso;
    }
    if (entry.set.reps > 0) {
      if (!record.maxReps || entry.set.reps > record.maxReps.reps) {
        record.maxReps = {
          reps: entry.set.reps,
          weight: entry.set.weight,
          unit: entry.set.weightUnit,
          workoutId: entry.workout.id,
          achievedAt: workoutDateIso,
        };
      }
    }

    if (entry.set.weight > 0 && entry.set.reps > 0) {
      const weightKg = toKg(entry.set.weight, entry.set.weightUnit);
      if (
        !record.maxWeight ||
        weightKg > record.maxWeight.weightKg ||
        (weightKg === record.maxWeight.weightKg && entry.set.reps > record.maxWeight.reps)
      ) {
        record.maxWeight = {
          weightKg,
          weight: entry.set.weight,
          unit: entry.set.weightUnit,
          reps: entry.set.reps,
          workoutId: entry.workout.id,
          achievedAt: workoutDateIso,
        };
      }
      const e1rm = estimateOneRepMaxKg(entry.set);
      if (e1rm && (!record.bestE1rm || e1rm > record.bestE1rm.valueKg)) {
        record.bestE1rm = {
          valueKg: e1rm,
          weight: entry.set.weight,
          unit: entry.set.weightUnit,
          reps: entry.set.reps,
          workoutId: entry.workout.id,
          achievedAt: workoutDateIso,
        };
      }
      const volumeKg = setVolumeKg(entry.set);
      if (!record.bestSetVolume || volumeKg > record.bestSetVolume.volumeKg) {
        record.bestSetVolume = {
          volumeKg,
          weight: entry.set.weight,
          unit: entry.set.weightUnit,
          reps: entry.set.reps,
          workoutId: entry.workout.id,
          achievedAt: workoutDateIso,
        };
      }
    }
  }

  // El número de sesiones se calcula por ejercicio (no por series).
  const sessionsByExercise = new Map<string, Set<string>>();
  for (const entry of tracked) {
    const set = sessionsByExercise.get(entry.exerciseKey) ?? new Set<string>();
    set.add(entry.workout.id);
    sessionsByExercise.set(entry.exerciseKey, set);
  }
  for (const [key, sessions] of sessionsByExercise) {
    const record = records.get(key);
    if (record) record.sessionCount = sessions.size;
  }

  return [...records.values()].sort((a, b) => b.totalSets - a.totalSets);
}

export interface SessionVolumeRecord {
  workoutId: string;
  name: string;
  date: string;
  volumeKg: number;
  durationSeconds: number;
  sets: number;
}

export function buildSessionVolumeRecords(workouts: WorkoutDetail[]): SessionVolumeRecord[] {
  return workouts
    .filter(isFinished)
    .map((workout) => {
      const sets = workout.exercises.flatMap((exercise) => exercise.sets);
      const completed = sets.filter(isWorkingSet);
      return {
        workoutId: workout.id,
        name: workout.name,
        date: workoutDate(workout).toISOString(),
        volumeKg: completed.reduce((total, set) => total + setVolumeKg(set), 0),
        durationSeconds: getDurationSeconds(workout),
        sets: completed.length,
      };
    })
    .sort((a, b) => b.volumeKg - a.volumeKg);
}

export function buildExerciseProgress(
  workouts: WorkoutDetail[],
  exerciseKey: string,
): ExerciseProgressPoint[] {
  const points = new Map<string, ExerciseProgressPoint>();
  for (const workout of workouts) {
    if (!isFinished(workout)) continue;
    const matching = workout.exercises.filter(
      (exercise) => exerciseKeyOf(exercise) === exerciseKey,
    );
    if (matching.length === 0) continue;
    const key = dateKey(workoutDate(workout));
    const existing = points.get(key) ?? {
      date: key,
      label: formatDate(key, 'd MMM'),
      maxWeightKg: 0,
      volumeKg: 0,
      reps: 0,
      sets: 0,
    };
    for (const exercise of matching) {
      for (const set of exercise.sets) {
        if (!set.isCompleted) continue;
        existing.sets += 1;
        existing.reps += set.reps;
        existing.volumeKg += setVolumeKg(set);
        if (set.weight > 0) {
          existing.maxWeightKg = Math.max(existing.maxWeightKg, toKg(set.weight, set.weightUnit));
        }
      }
    }
    points.set(key, existing);
  }
  return [...points.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function buildDailyActivity(workouts: WorkoutDetail[], days = 84): Array<{
  date: string;
  workouts: number;
  volumeKg: number;
  level: 0 | 1 | 2 | 3 | 4;
}> {
  const map = new Map<string, { workouts: number; volumeKg: number }>();
  for (const workout of workouts) {
    if (!isFinished(workout)) continue;
    const key = dateKey(workoutDate(workout));
    const entry = map.get(key) ?? { workouts: 0, volumeKg: 0 };
    entry.workouts += 1;
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        entry.volumeKg += setVolumeKg(set);
      }
    }
    map.set(key, entry);
  }
  const maxVolume = Math.max(1, ...[...map.values()].map((entry) => entry.volumeKg));
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(new Date(), -(days - 1 - index));
    const key = dateKey(date);
    const entry = map.get(key) ?? { workouts: 0, volumeKg: 0 };
    const ratio = entry.volumeKg / maxVolume;
    const level = (entry.workouts === 0 ? 0 : ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.8 ? 3 : 4) as
      | 0
      | 1
      | 2
      | 3
      | 4;
    return { date: key, workouts: entry.workouts, volumeKg: entry.volumeKg, level };
  });
}

export function getRangeBounds(
  range: ProgressRange,
  customStart?: string,
  customEnd?: string,
): DateRange {
  const end = endOfDay(new Date());
  if (range === 'all') {
    return { start: new Date(2000, 0, 1), end };
  }
  if (range === 'custom') {
    const start = customStart ? startOfDay(new Date(`${customStart}T00:00:00`)) : addDays(end, -29);
    const customEndDate = customEnd ? endOfDay(new Date(`${customEnd}T00:00:00`)) : end;
    return { start, end: customEndDate };
  }
  return { start: startOfDay(addDays(end, -(range - 1))), end };
}

export function filterWorkoutsByRange(
  workouts: WorkoutDetail[],
  bounds: DateRange,
  includeScheduled = false,
): WorkoutDetail[] {
  return workouts.filter((workout) => {
    if (!includeScheduled && !isFinished(workout)) return false;
    const date = workoutDate(workout);
    return date >= bounds.start && date <= bounds.end;
  });
}

export interface PeriodComparison {
  current: WorkoutTotals;
  previous: WorkoutTotals;
  workoutDelta: number;
  volumeDelta: number;
  durationDelta: number;
}

export function comparePeriods(workouts: WorkoutDetail[], bounds: DateRange): PeriodComparison {
  const current = computeWorkoutTotals(filterWorkoutsByRange(workouts, bounds));
  const lengthMs = bounds.end.getTime() - bounds.start.getTime();
  const previousRange = {
    start: new Date(bounds.start.getTime() - lengthMs - 1),
    end: new Date(bounds.start.getTime() - 1),
  };
  const previous = computeWorkoutTotals(filterWorkoutsByRange(workouts, previousRange));
  return {
    current,
    previous,
    workoutDelta: current.workouts - previous.workouts,
    volumeDelta: current.totalVolumeKg - previous.totalVolumeKg,
    durationDelta: current.totalSeconds - previous.totalSeconds,
  };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function getExerciseOptions(workouts: WorkoutDetail[]): Array<{
  key: string;
  name: string;
  muscle: MuscleGroup;
}> {
  const map = new Map<string, { name: string; muscle: MuscleGroup }>();
  for (const entry of flattenAllSets(workouts)) {
    if (!map.has(entry.exerciseKey)) {
      map.set(entry.exerciseKey, { name: entry.exerciseName, muscle: entry.primaryMuscle });
    }
  }
  return [...map.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function resolveExerciseName(
  exercise: Exercise | null,
  fallback: string,
): string {
  return exercise?.name ?? fallback;
}

export function getSetTypeWeight(type: SetType): number {
  switch (type) {
    case 'warmup':
    case 'approximation':
      return 0.5;
    case 'drop':
      return 0.85;
    case 'failure':
      return 1.1;
    default:
      return 1;
  }
}

export function workoutsPerWeek(workouts: WorkoutDetail[], weeks = 8): number {
  if (weeks <= 0) return 0;
  const start = startOfWeek(addWeeks(new Date(), -(weeks - 1)), WEEK_OPTIONS);
  const end = endOfWeek(new Date(), WEEK_OPTIONS);
  return safeDivide(
    workouts.filter((workout) => {
      if (!isFinished(workout)) return false;
      const date = workoutDate(workout);
      return date >= start && date <= end;
    }).length,
    weeks,
  );
}
