import { describe, expect, it } from 'vitest';
import {
  buildExerciseProgress,
  computeExerciseRecords,
  computeWorkoutTotals,
  estimateOneRepMaxKg,
  exerciseKeyOf,
  isWorkingSet,
  setVolumeKg,
  workoutDate,
} from '@/lib/metrics';
import type { SetType, WorkoutDetail, WorkoutSet } from '@/types/models';

function makeSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: overrides.id ?? 'set-1',
    workoutExerciseId: overrides.workoutExerciseId ?? 'we-1',
    setNumber: overrides.setNumber ?? 1,
    weight: overrides.weight ?? 100,
    reps: overrides.reps ?? 5,
    weightUnit: overrides.weightUnit ?? 'kg',
    setType: (overrides.setType ?? 'effective') as SetType,
    restSeconds: overrides.restSeconds ?? 90,
    isCompleted: overrides.isCompleted ?? true,
    notes: overrides.notes ?? '',
    createdAt: overrides.createdAt ?? '2026-01-01T10:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T10:00:00.000Z',
  };
}

function makeWorkout(
  overrides: Partial<WorkoutDetail> & { sets?: WorkoutSet[] } = {},
): WorkoutDetail {
  const sets = overrides.sets ?? [makeSet()];
  return {
    id: overrides.id ?? 'workout-1',
    userId: overrides.userId ?? 'user-1',
    planId: null,
    planDayId: null,
    name: overrides.name ?? 'Sesión de prueba',
    status: overrides.status ?? 'finished',
    scheduledAt: overrides.scheduledAt ?? null,
    startedAt: overrides.startedAt ?? '2026-01-01T10:00:00.000Z',
    finishedAt: overrides.finishedAt ?? '2026-01-01T11:00:00.000Z',
    durationSeconds: overrides.durationSeconds ?? 3600,
    notes: overrides.notes ?? '',
    createdAt: overrides.createdAt ?? '2026-01-01T09:59:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T11:00:00.000Z',
    planName: null,
    exercises: overrides.exercises ?? [
      {
        id: 'we-1',
        workoutId: overrides.id ?? 'workout-1',
        exerciseId: 'ex-1',
        userExerciseId: null,
        nameSnapshot: 'Press banca',
        primaryMuscle: 'chest',
        position: 0,
        notes: '',
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-01-01T10:00:00.000Z',
        exercise: null,
        sets,
      },
    ],
  };
}

describe('métricas de entrenamiento', () => {
  it('excluye calentamientos, aproximaciones y series sin completar del volumen efectivo', () => {
    expect(isWorkingSet(makeSet({ setType: 'warmup' }))).toBe(false);
    expect(isWorkingSet(makeSet({ setType: 'approximation' }))).toBe(false);
    expect(isWorkingSet(makeSet({ isCompleted: false }))).toBe(false);
    expect(isWorkingSet(makeSet({ setType: 'effective' }))).toBe(true);
    expect(isWorkingSet(makeSet({ setType: 'failure' }))).toBe(true);
    expect(setVolumeKg(makeSet({ setType: 'warmup', weight: 200, reps: 10 }))).toBe(0);
  });

  it('convierte libras a kilogramos al calcular volumen', () => {
    const volume = setVolumeKg(makeSet({ weight: 100, reps: 10, weightUnit: 'lb' }));
    expect(volume).toBeCloseTo(453.59237, 3);
  });

  it('estima 1RM con Epley y descarta series de más de 12 repeticiones', () => {
    expect(estimateOneRepMaxKg(makeSet({ weight: 100, reps: 5 }))).toBeCloseTo(116.6667, 3);
    expect(estimateOneRepMaxKg(makeSet({ weight: 100, reps: 13 }))).toBeNull();
    expect(estimateOneRepMaxKg(makeSet({ weight: 0, reps: 5 }))).toBeNull();
    expect(estimateOneRepMaxKg(makeSet({ isCompleted: false }))).toBeNull();
  });

  it('solo suma sesiones finalizadas y series efectivas en los totales', () => {
    const finished = makeWorkout({
      sets: [
        makeSet({ id: 'a', weight: 100, reps: 10 }),
        makeSet({ id: 'b', weight: 50, reps: 10, setType: 'warmup' }),
        makeSet({ id: 'c', weight: 80, reps: 8, isCompleted: false }),
      ],
    });
    const scheduled = makeWorkout({ id: 'scheduled', status: 'scheduled' });
    const totals = computeWorkoutTotals([finished, scheduled]);
    expect(totals.workouts).toBe(1);
    expect(totals.totalVolumeKg).toBe(1000);
    expect(totals.totalSets).toBe(2);
    expect(totals.totalReps).toBe(10);
    expect(totals.totalSeconds).toBe(3600);
  });

  it('calcula récords reales por ejercicio', () => {
    const first = makeWorkout({
      id: 'w1',
      startedAt: '2026-01-01T10:00:00.000Z',
      sets: [
        makeSet({ id: 's1', weight: 100, reps: 5 }),
        makeSet({ id: 's2', weight: 90, reps: 8 }),
      ],
    });
    const second = makeWorkout({
      id: 'w2',
      startedAt: '2026-01-08T10:00:00.000Z',
      sets: [makeSet({ id: 's3', weight: 110, reps: 3 })],
    });
    const records = computeExerciseRecords([first, second]);
    expect(records).toHaveLength(1);
    const record = records[0]!;
    expect(record.sessionCount).toBe(2);
    expect(record.totalSets).toBe(3);
    expect(record.maxWeight?.weight).toBe(110);
    expect(record.maxWeight?.workoutId).toBe('w2');
    expect(record.bestE1rm?.weight).toBe(110);
    expect(record.maxReps?.reps).toBe(8);
    expect(record.lastTrainedAt).toBe(second.startedAt);
  });

  it('agrupa la progresión por fecha para un ejercicio', () => {
    const first = makeWorkout({
      id: 'w1',
      sets: [makeSet({ id: 's1', weight: 100, reps: 5 })],
    });
    const second = makeWorkout({
      id: 'w2',
      startedAt: '2026-01-08T10:00:00.000Z',
      sets: [makeSet({ id: 's2', weight: 105, reps: 5 })],
    });
    const progress = buildExerciseProgress([first, second], 'ex-1');
    expect(progress).toHaveLength(2);
    expect(progress[0]?.maxWeightKg).toBe(100);
    expect(progress[1]?.maxWeightKg).toBe(105);
    expect(progress[1]?.volumeKg).toBe(525);
  });

  it('usa la fecha de inicio, fin, programación o creación en ese orden', () => {
    const workout = makeWorkout({
      startedAt: '2026-02-01T08:00:00.000Z',
      finishedAt: '2026-02-01T09:00:00.000Z',
    });
    expect(workoutDate(workout).toISOString()).toBe('2026-02-01T08:00:00.000Z');
  });

  it('identifica ejercicios globales, propios o por nombre', () => {
    expect(exerciseKeyOf({ exerciseId: 'ex-1', userExerciseId: null, nameSnapshot: 'X' })).toBe(
      'ex-1',
    );
    expect(
      exerciseKeyOf({ exerciseId: null, userExerciseId: 'user-ex', nameSnapshot: 'X' }),
    ).toBe('user-ex');
    expect(exerciseKeyOf({ exerciseId: null, userExerciseId: null, nameSnapshot: 'Sentadilla' })).toBe(
      'name:sentadilla',
    );
  });
});
