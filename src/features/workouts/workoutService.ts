import { getActiveUserId, getDb } from '@/database/db';
import { nowIso, newId } from '@/lib/utils';
import type {
  Exercise,
  WeightUnit,
  Workout,
  WorkoutExercise,
  WorkoutPlanDetail,
  WorkoutSet,
  WorkoutSnapshot,
} from '@/types/models';
import { saveWorkoutSnapshot } from '@/services/sync';

export interface WorkoutBundle {
  workout: Workout;
  exercises: Array<WorkoutExercise & { sets: WorkoutSet[] }>;
}

export function getElapsedSeconds(workout: Workout): number {
  if (workout.status === 'in_progress' && workout.startedAt) {
    return Math.max(0, Math.floor((Date.now() - new Date(workout.startedAt).getTime()) / 1000));
  }
  if (workout.status === 'paused' || workout.status === 'finished' || workout.status === 'cancelled') {
    if (workout.durationSeconds > 0) return workout.durationSeconds;
    if (workout.startedAt && workout.finishedAt) {
      return Math.max(
        0,
        Math.floor(
          (new Date(workout.finishedAt).getTime() - new Date(workout.startedAt).getTime()) / 1000,
        ),
      );
    }
  }
  return 0;
}

export async function loadWorkoutBundle(id: string): Promise<WorkoutBundle> {
  const db = getDb();
  const workout = await db.workouts.get(id);
  if (!workout) throw new Error('El entrenamiento no existe o se ha eliminado.');
  const exercises = await db.workoutExercises.where('workoutId').equals(id).toArray();
  const sets = await db.workoutSets.toArray();
  return {
    workout,
    exercises: exercises
      .sort((a, b) => a.position - b.position)
      .map((exercise) => ({
        ...exercise,
        sets: sets
          .filter((set) => set.workoutExerciseId === exercise.id)
          .sort((a, b) => a.setNumber - b.setNumber),
      })),
  };
}

async function persistBundle(bundle: WorkoutBundle): Promise<void> {
  const timestamp = nowIso();
  const snapshot: WorkoutSnapshot = {
    workout: { ...bundle.workout, updatedAt: timestamp },
    exercises: bundle.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set, index) => ({
        ...set,
        setNumber: index + 1,
      })),
    })),
  };
  await saveWorkoutSnapshot(snapshot);
}

export async function createWorkout(input: {
  name: string;
  notes?: string;
  startNow?: boolean;
  scheduledAt?: string | null;
}): Promise<Workout> {
  const timestamp = nowIso();
  const startNow = input.startNow ?? true;
  const workout: Workout = {
    id: newId(),
    userId: getActiveUserId() ?? '',
    planId: null,
    planDayId: null,
    name: input.name.trim() || 'Entrenamiento',
    status: startNow ? 'in_progress' : 'scheduled',
    scheduledAt: startNow ? null : input.scheduledAt ?? timestamp,
    startedAt: startNow ? timestamp : null,
    finishedAt: null,
    durationSeconds: 0,
    notes: input.notes?.trim() ?? '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await saveWorkoutSnapshot({ workout, exercises: [] });
  return workout;
}

export async function createWorkoutFromPlan(
  plan: WorkoutPlanDetail,
  dayId: string,
  options: { startNow?: boolean; scheduledAt?: string | null; unit?: WeightUnit } = {},
): Promise<Workout> {
  const day = plan.days.find((item) => item.id === dayId);
  if (!day) throw new Error('El día de rutina seleccionado no existe.');
  const timestamp = nowIso();
  const startNow = options.startNow ?? true;
  const widthUnit = options.unit ?? 'kg';
  const workoutId = newId();
  const workout: Workout = {
    id: workoutId,
    userId: plan.userId,
    planId: plan.id,
    planDayId: day.id,
    name: day.name || plan.name,
    status: startNow ? 'in_progress' : 'scheduled',
    scheduledAt: startNow ? null : options.scheduledAt ?? timestamp,
    startedAt: startNow ? timestamp : null,
    finishedAt: null,
    durationSeconds: 0,
    notes: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const exercises = day.exercises.map((planExercise, exerciseIndex) => {
    const workoutExerciseId = newId();
    const targetReps = Number.parseInt(planExercise.targetReps.match(/\d+/)?.[0] ?? '10', 10);
    const reps = Number.isFinite(targetReps) && targetReps > 0 ? targetReps : 10;
    const sets: WorkoutSet[] = Array.from(
      { length: Math.max(1, Math.min(12, planExercise.targetSets || 3)) },
      (_, setIndex) => ({
        id: newId(),
        workoutExerciseId,
        setNumber: setIndex + 1,
        weight: 0,
        reps,
        weightUnit: widthUnit,
        setType: 'effective',
        restSeconds: planExercise.restSeconds || 90,
        isCompleted: false,
        notes: '',
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    );
    const exercise: WorkoutExercise = {
      id: workoutExerciseId,
      workoutId,
      exerciseId: planExercise.exerciseId,
      userExerciseId: planExercise.userExerciseId,
      nameSnapshot: planExercise.nameSnapshot,
      primaryMuscle: planExercise.primaryMuscle,
      position: exerciseIndex,
      notes: planExercise.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    return { ...exercise, sets };
  });

  await saveWorkoutSnapshot({ workout, exercises });
  return workout;
}

const workoutMutationQueues = new Map<string, Promise<unknown>>();

async function runSerialized<T>(key: string, action: () => Promise<T>): Promise<T> {
  const previous = workoutMutationQueues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(action);
  workoutMutationQueues.set(key, next);
  try {
    return await next;
  } finally {
    if (workoutMutationQueues.get(key) === next) workoutMutationQueues.delete(key);
  }
}

export async function mutateWorkout(
  id: string,
  mutator: (bundle: WorkoutBundle) => void,
): Promise<WorkoutBundle> {
  return runSerialized(id, async () => {
    const bundle = await loadWorkoutBundle(id);
    mutator(bundle);
    await persistBundle(bundle);
    return bundle;
  });
}

export async function startWorkoutSession(id: string): Promise<void> {
  await mutateWorkout(id, ({ workout }) => {
    if (workout.status === 'finished' || workout.status === 'cancelled') {
      throw new Error('Este entrenamiento ya está cerrado.');
    }
    const timestamp = nowIso();
    if (workout.status === 'scheduled') {
      workout.status = 'in_progress';
      workout.startedAt = timestamp;
      workout.durationSeconds = 0;
    } else if (workout.status === 'paused') {
      const elapsed = getElapsedSeconds(workout);
      workout.status = 'in_progress';
      workout.startedAt = new Date(Date.now() - elapsed * 1000).toISOString();
      workout.durationSeconds = elapsed;
    }
  });
}

export async function pauseWorkoutSession(id: string): Promise<void> {
  await mutateWorkout(id, ({ workout }) => {
    if (workout.status !== 'in_progress') return;
    const elapsed = getElapsedSeconds(workout);
    workout.status = 'paused';
    workout.durationSeconds = elapsed;
  });
}

export async function resumeWorkoutSession(id: string): Promise<void> {
  await mutateWorkout(id, ({ workout }) => {
    if (workout.status !== 'paused') return;
    const elapsed = workout.durationSeconds;
    workout.status = 'in_progress';
    workout.startedAt = new Date(Date.now() - elapsed * 1000).toISOString();
  });
}

export async function finishWorkoutSession(id: string): Promise<void> {
  await mutateWorkout(id, ({ workout }) => {
    if (workout.status === 'finished') return;
    const elapsed =
      workout.status === 'paused'
        ? workout.durationSeconds
        : workout.status === 'in_progress'
          ? getElapsedSeconds(workout)
          : workout.durationSeconds;
    workout.status = 'finished';
    workout.finishedAt = nowIso();
    workout.durationSeconds = elapsed;
  });
}

export async function cancelWorkoutSession(id: string): Promise<void> {
  await mutateWorkout(id, ({ workout }) => {
    if (workout.status === 'finished') return;
    const elapsed =
      workout.status === 'in_progress' ? getElapsedSeconds(workout) : workout.durationSeconds;
    workout.status = 'cancelled';
    workout.durationSeconds = elapsed;
  });
}

export async function updateWorkoutDetails(
  id: string,
  patch: Partial<Pick<Workout, 'name' | 'notes' | 'scheduledAt' | 'startedAt'>>,
): Promise<void> {
  await mutateWorkout(id, ({ workout }) => {
    if (patch.name !== undefined) workout.name = patch.name.trim() || workout.name;
    if (patch.notes !== undefined) workout.notes = patch.notes;
    if (patch.scheduledAt !== undefined) workout.scheduledAt = patch.scheduledAt;
    if (patch.startedAt !== undefined) workout.startedAt = patch.startedAt;
  });
}

export async function addExerciseToWorkout(
  workoutId: string,
  exercise: Exercise,
  options: { defaultSetCount?: number; defaultUnit?: WeightUnit; restSeconds?: number } = {},
): Promise<void> {
  await mutateWorkout(workoutId, ({ workout, exercises }) => {
    if (workout.status === 'finished' || workout.status === 'cancelled') {
      throw new Error('No puedes añadir ejercicios a una sesión cerrada.');
    }
    const already = exercises.some((item) =>
      exercise.source === 'global'
        ? item.exerciseId === exercise.id
        : item.userExerciseId === exercise.id,
    );
    if (already) throw new Error('Ese ejercicio ya está en la sesión.');
    const timestamp = nowIso();
    const exerciseId = newId();
    const setCount = Math.max(1, Math.min(12, options.defaultSetCount ?? 3));
    const sets: WorkoutSet[] = Array.from({ length: setCount }, (_, index) => ({
      id: newId(),
      workoutExerciseId: exerciseId,
      setNumber: index + 1,
      weight: 0,
      reps: 10,
      weightUnit: options.defaultUnit ?? 'kg',
      setType: 'effective',
      restSeconds: options.restSeconds ?? 90,
      isCompleted: false,
      notes: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    exercises.push({
      id: exerciseId,
      workoutId,
      exerciseId: exercise.source === 'global' ? exercise.id : null,
      userExerciseId: exercise.source === 'custom' ? exercise.id : null,
      nameSnapshot: exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      position: exercises.length,
      notes: '',
      createdAt: timestamp,
      updatedAt: timestamp,
      sets,
    });
  });
}

export async function addSet(
  workoutId: string,
  workoutExerciseId: string,
  defaults: { unit: WeightUnit; restSeconds: number },
): Promise<void> {
  await mutateWorkout(workoutId, ({ exercises }) => {
    const exercise = exercises.find((item) => item.id === workoutExerciseId);
    if (!exercise) throw new Error('Ejercicio no encontrado.');
    const last = exercise.sets[exercise.sets.length - 1];
    const timestamp = nowIso();
    exercise.sets.push({
      id: newId(),
      workoutExerciseId,
      setNumber: exercise.sets.length + 1,
      weight: last ? last.weight : 0,
      reps: last ? last.reps : 10,
      weightUnit: last?.weightUnit ?? defaults.unit,
      setType: 'effective',
      restSeconds: last?.restSeconds ?? defaults.restSeconds,
      isCompleted: false,
      notes: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });
}

export async function duplicateSet(
  workoutId: string,
  workoutExerciseId: string,
  setId: string,
): Promise<void> {
  await mutateWorkout(workoutId, ({ exercises }) => {
    const exercise = exercises.find((item) => item.id === workoutExerciseId);
    if (!exercise) return;
    const index = exercise.sets.findIndex((set) => set.id === setId);
    if (index < 0) return;
    const source = exercise.sets[index]!;
    const timestamp = nowIso();
    const clone: WorkoutSet = {
      ...source,
      id: newId(),
      setNumber: source.setNumber + 1,
      isCompleted: false,
      notes: source.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    exercise.sets.splice(index + 1, 0, clone);
    exercise.sets.forEach((set, setIndex) => {
      set.setNumber = setIndex + 1;
    });
  });
}

export async function updateSet(
  workoutId: string,
  workoutExerciseId: string,
  setId: string,
  patch: Partial<
    Pick<WorkoutSet, 'weight' | 'reps' | 'weightUnit' | 'setType' | 'restSeconds' | 'isCompleted' | 'notes'>
  >,
): Promise<void> {
  await mutateWorkout(workoutId, ({ exercises }) => {
    const exercise = exercises.find((item) => item.id === workoutExerciseId);
    const set = exercise?.sets.find((item) => item.id === setId);
    if (!set) return;
    Object.assign(set, patch, { updatedAt: nowIso() });
  });
}

export async function deleteSet(
  workoutId: string,
  workoutExerciseId: string,
  setId: string,
): Promise<void> {
  await mutateWorkout(workoutId, ({ exercises }) => {
    const exercise = exercises.find((item) => item.id === workoutExerciseId);
    if (!exercise) return;
    exercise.sets = exercise.sets.filter((set) => set.id !== setId);
    exercise.sets.forEach((set, index) => {
      set.setNumber = index + 1;
    });
  });
}

export async function moveSet(
  workoutId: string,
  workoutExerciseId: string,
  setId: string,
  direction: -1 | 1,
): Promise<void> {
  await mutateWorkout(workoutId, ({ exercises }) => {
    const exercise = exercises.find((item) => item.id === workoutExerciseId);
    if (!exercise) return;
    const index = exercise.sets.findIndex((set) => set.id === setId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= exercise.sets.length) return;
    const [moved] = exercise.sets.splice(index, 1);
    if (moved) exercise.sets.splice(target, 0, moved);
    exercise.sets.forEach((set, setIndex) => {
      set.setNumber = setIndex + 1;
    });
  });
}

export async function updateExerciseNotes(
  workoutId: string,
  workoutExerciseId: string,
  notes: string,
): Promise<void> {
  await mutateWorkout(workoutId, ({ exercises }) => {
    const exercise = exercises.find((item) => item.id === workoutExerciseId);
    if (exercise) {
      exercise.notes = notes;
      exercise.updatedAt = nowIso();
    }
  });
}

export async function moveExercise(
  workoutId: string,
  workoutExerciseId: string,
  direction: -1 | 1,
): Promise<void> {
  await mutateWorkout(workoutId, ({ exercises }) => {
    const index = exercises.findIndex((item) => item.id === workoutExerciseId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= exercises.length) return;
    const [moved] = exercises.splice(index, 1);
    if (moved) exercises.splice(target, 0, moved);
    exercises.forEach((exercise, exerciseIndex) => {
      exercise.position = exerciseIndex;
    });
  });
}

export async function removeExercise(
  workoutId: string,
  workoutExerciseId: string,
): Promise<void> {
  await mutateWorkout(workoutId, ({ exercises }) => {
    const filtered = exercises.filter((item) => item.id !== workoutExerciseId);
    filtered.forEach((exercise, index) => {
      exercise.position = index;
    });
    exercises.splice(0, exercises.length, ...filtered);
  });
}

export async function duplicateWorkout(id: string): Promise<Workout> {
  const source = await loadWorkoutBundle(id);
  const timestamp = nowIso();
  const workoutId = newId();
  const workout: Workout = {
    ...source.workout,
    id: workoutId,
    name: `${source.workout.name} (copia)`,
    status: 'scheduled',
    scheduledAt: timestamp,
    startedAt: null,
    finishedAt: null,
    durationSeconds: 0,
    notes: source.workout.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const exercises = source.exercises.map((exercise, index) => {
    const exerciseId = newId();
    return {
      ...exercise,
      id: exerciseId,
      workoutId,
      position: index,
      createdAt: timestamp,
      updatedAt: timestamp,
      sets: exercise.sets.map((set, setIndex) => ({
        ...set,
        id: newId(),
        workoutExerciseId: exerciseId,
        setNumber: setIndex + 1,
        isCompleted: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
    };
  });
  await saveWorkoutSnapshot({ workout, exercises });
  return workout;
}
