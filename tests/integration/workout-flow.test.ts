import { afterAll, describe, expect, it } from 'vitest';
import {
  closeActiveDatabase,
  deleteUserDatabase,
  getActiveUserId,
  getDb,
  initializeUserDatabase,
} from '@/database/db';
import {
  addExerciseToWorkout,
  createWorkout,
  duplicateWorkout,
  finishWorkoutSession,
  loadWorkoutBundle,
  updateSet,
} from '@/features/workouts/workoutService';
import { nowIso } from '@/lib/utils';
import { deleteWorkout } from '@/services/sync';
import type { SessionUser } from '@/types/models';

const user: SessionUser = {
  id: `integration-${Date.now()}`,
  email: 'integration@hecofit.test',
  displayName: 'Integración',
  avatarUrl: null,
  createdAt: nowIso(),
};

afterAll(async () => {
  closeActiveDatabase();
  await deleteUserDatabase(user.id);
});

describe('flujo de entrenamiento con IndexedDB', () => {
  it('inicializa una base aislada con catálogo, perfil y ajustes', async () => {
    await initializeUserDatabase(user);
    expect(getActiveUserId()).toBe(user.id);
    const db = getDb();
    const exercises = await db.exercises.toArray();
    expect(exercises.length).toBeGreaterThanOrEqual(42);
    const profile = await db.profiles.get(user.id);
    expect(profile?.displayName).toBe('Integración');
    const settings = await db.settings.get(user.id);
    expect(settings?.weightUnit).toBe('kg');
    expect(settings?.theme).toBe('dark');
  });

  it('crea una sesión, registra series, la finaliza y conserva los datos', async () => {
    const db = getDb();
    const exercise = (await db.exercises.toArray())[0]!;
    const workout = await createWorkout({ name: 'Sesión integrada', startNow: true });
    expect(workout.userId).toBe(user.id);
    expect(workout.status).toBe('in_progress');

    await addExerciseToWorkout(workout.id, exercise, { defaultSetCount: 2 });
    let bundle = await loadWorkoutBundle(workout.id);
    expect(bundle.exercises).toHaveLength(1);
    const workoutExercise = bundle.exercises[0]!;
    expect(workoutExercise.sets).toHaveLength(2);

    await updateSet(workout.id, workoutExercise.id, workoutExercise.sets[0]!.id, {
      weight: 80,
      reps: 8,
      isCompleted: true,
    });
    await finishWorkoutSession(workout.id);

    bundle = await loadWorkoutBundle(workout.id);
    expect(bundle.workout.status).toBe('finished');
    expect(bundle.workout.finishedAt).toBeTruthy();
    expect(bundle.exercises[0]?.sets[0]).toMatchObject({
      weight: 80,
      reps: 8,
      isCompleted: true,
    });

    const storedSets = await db.workoutSets
      .where('workoutExerciseId')
      .equals(workoutExercise.id)
      .toArray();
    expect(storedSets).toHaveLength(2);
  });

  it('duplica una sesión como programada sin alterar la original', async () => {
    const db = getDb();
    const original = (await db.workouts.toArray()).find((item) => item.status === 'finished');
    expect(original).toBeTruthy();
    const copy = await duplicateWorkout(original!.id);
    expect(copy.id).not.toBe(original!.id);
    expect(copy.status).toBe('scheduled');
    expect(copy.startedAt).toBeNull();
    const originalAfter = await db.workouts.get(original!.id);
    expect(originalAfter?.status).toBe('finished');
  });

  it('elimina la sesión y todas sus series hijas', async () => {
    const db = getDb();
    const workout = await createWorkout({ name: 'Para eliminar', startNow: true });
    const exercise = (await db.exercises.toArray())[1]!;
    await addExerciseToWorkout(workout.id, exercise, { defaultSetCount: 2 });
    const bundle = await loadWorkoutBundle(workout.id);
    const exerciseId = bundle.exercises[0]!.id;

    await deleteWorkout(workout.id);
    expect(await db.workouts.get(workout.id)).toBeUndefined();
    expect(await db.workoutExercises.where('workoutId').equals(workout.id).count()).toBe(0);
    expect(await db.workoutSets.where('workoutExerciseId').equals(exerciseId).count()).toBe(0);
  });
});
