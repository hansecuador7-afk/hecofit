import { z } from 'zod';
import { getActiveUserId, getDb, enqueueOperation, clearPendingOperations } from '@/database/db';
import { isCloudConfigured } from '@/lib/supabase';
import { downloadFile, newId, nowIso, toKg } from '@/lib/utils';
import { dateKey } from '@/lib/dates';
import { loadPlanDetail } from '@/features/routines/routineService';
import { getDurationSeconds, isFinished, setVolumeKg } from '@/lib/metrics';
import { syncEngine } from '@/services/sync';
import {
  DIFFICULTIES,
  EQUIPMENT,
  MUSCLE_GROUPS,
  SET_TYPES,
  WEIGHT_UNITS,
  WORKOUT_STATUSES,
  type BackupPayload,
  type Exercise,
  type WorkoutDetail,
  type WorkoutSnapshot,
} from '@/types/models';

const muscleSchema = z.enum(MUSCLE_GROUPS);
const equipmentSchema = z.enum(EQUIPMENT);
const setTypeSchema = z.enum(SET_TYPES);
const statusSchema = z.enum(WORKOUT_STATUSES);
const unitSchema = z.enum(WEIGHT_UNITS);

const profileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const settingsSchema = z.object({
  userId: z.string().min(1),
  weightUnit: unitSchema,
  theme: z.enum(['dark', 'light']),
  restSeconds: z.number().int().min(0).max(900),
  soundEnabled: z.boolean(),
  autoRest: z.boolean(),
  dateFormat: z.enum(['dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy']),
  notificationsEnabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const exerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  primaryMuscle: muscleSchema,
  secondaryMuscles: z.array(muscleSchema),
  equipment: equipmentSchema,
  instructions: z.string(),
  imageUrl: z.string().nullable(),
  difficulty: z.enum(DIFFICULTIES).nullable(),
  source: z.enum(['global', 'custom']),
  userId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const planExerciseSchema = z.object({
  id: z.string().min(1),
  planDayId: z.string().min(1),
  exerciseId: z.string().nullable(),
  userExerciseId: z.string().nullable(),
  nameSnapshot: z.string().min(1),
  primaryMuscle: muscleSchema,
  position: z.number().int().min(0),
  targetSets: z.number().int().min(0).max(50),
  targetReps: z.string(),
  restSeconds: z.number().int().min(0).max(900),
  notes: z.string(),
  exercise: exerciseSchema.nullable().optional(),
});

const planDaySchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1),
  name: z.string().min(1),
  position: z.number().int().min(0),
  notes: z.string(),
  exercises: z.array(planExerciseSchema),
});

const planSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  isActive: z.boolean(),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  days: z.array(planDaySchema),
});

const workoutSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  planId: z.string().nullable(),
  planDayId: z.string().nullable(),
  name: z.string().min(1),
  status: statusSchema,
  scheduledAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  durationSeconds: z.number().min(0),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const workoutSetSchema = z.object({
  id: z.string().min(1),
  workoutExerciseId: z.string().min(1),
  setNumber: z.number().int().min(1),
  weight: z.number().min(0),
  reps: z.number().int().min(0),
  weightUnit: unitSchema,
  setType: setTypeSchema,
  restSeconds: z.number().int().min(0).max(3600),
  isCompleted: z.boolean(),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const workoutExerciseSchema = z.object({
  id: z.string().min(1),
  workoutId: z.string().min(1),
  exerciseId: z.string().nullable(),
  userExerciseId: z.string().nullable(),
  nameSnapshot: z.string().min(1),
  primaryMuscle: muscleSchema,
  position: z.number().int().min(0),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sets: z.array(workoutSetSchema),
});

const workoutSnapshotSchema = z.object({
  workout: workoutSchema,
  exercises: z.array(workoutExerciseSchema),
});

const favoriteSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  exerciseId: z.string().nullable(),
  userExerciseId: z.string().nullable(),
  exerciseName: z.string().min(1),
  createdAt: z.string(),
});

const noteSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  title: z.string(),
  body: z.string(),
  noteType: z.enum(['general', 'workout', 'routine', 'exercise']),
  workoutId: z.string().nullable(),
  planId: z.string().nullable(),
  exerciseId: z.string().nullable(),
  userExerciseId: z.string().nullable(),
  pinned: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const restDaySchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de descanso no válida.'),
  notes: z.string(),
  createdAt: z.string(),
});

const backupSchema = z.object({
  app: z.literal('HECOFIT'),
  version: z.literal(1),
  exportedAt: z.string(),
  mode: z.enum(['cloud', 'local']),
  profile: profileSchema.nullable(),
  settings: settingsSchema.nullable(),
  exercises: z.array(exerciseSchema),
  plans: z.array(planSchema),
  workouts: z.array(workoutSnapshotSchema),
  favorites: z.array(favoriteSchema),
  notes: z.array(noteSchema),
  restDays: z.array(restDaySchema),
});

export interface BackupSummary {
  exportedAt: string;
  mode: 'cloud' | 'local';
  workouts: number;
  plans: number;
  notes: number;
  customExercises: number;
  restDays: number;
}

export async function buildBackup(): Promise<BackupPayload> {
  const userId = getActiveUserId();
  if (!userId) throw new Error('No hay una sesión activa.');
  const db = getDb();
  const [profile, settings, exercises, plans, workoutRows, workoutExercises, workoutSets, favorites, notes, restDays] =
    await Promise.all([
      db.profiles.get(userId),
      db.settings.get(userId),
      db.exercises.toArray(),
      db.plans.toArray(),
      db.workouts.toArray(),
      db.workoutExercises.toArray(),
      db.workoutSets.toArray(),
      db.favorites.toArray(),
      db.notes.toArray(),
      db.restDays.toArray(),
    ]);

  const planDetails = [];
  for (const plan of plans) {
    const detail = await loadPlanDetail(plan.id);
    if (detail) planDetails.push(detail);
  }

  const workouts: WorkoutSnapshot[] = workoutRows.map((workout) => ({
    workout,
    exercises: workoutExercises
      .filter((exercise) => exercise.workoutId === workout.id)
      .sort((a, b) => a.position - b.position)
      .map((exercise) => ({
        ...exercise,
        sets: workoutSets
          .filter((set) => set.workoutExerciseId === exercise.id)
          .sort((a, b) => a.setNumber - b.setNumber),
      })),
  }));

  return {
    app: 'HECOFIT',
    version: 1,
    exportedAt: nowIso(),
    mode: isCloudConfigured ? 'cloud' : 'local',
    profile: profile ?? null,
    settings: settings ?? null,
    exercises,
    plans: planDetails,
    workouts,
    favorites,
    notes,
    restDays,
  };
}

export function summarizeBackup(payload: BackupPayload): BackupSummary {
  return {
    exportedAt: payload.exportedAt,
    mode: payload.mode,
    workouts: payload.workouts.length,
    plans: payload.plans.length,
    notes: payload.notes.length,
    customExercises: payload.exercises.filter((exercise) => exercise.source === 'custom').length,
    restDays: payload.restDays.length,
  };
}

export async function downloadBackup(): Promise<void> {
  const payload = await buildBackup();
  downloadFile(
    JSON.stringify(payload, null, 2),
    `hecofit-backup-${dateKey(new Date())}.json`,
    'application/json;charset=utf-8',
  );
}

export async function readBackupFile(file: File): Promise<BackupPayload> {
  if (file.size > 25 * 1024 * 1024) {
    throw new Error('El archivo de copia es demasiado grande (máximo 25 MB).');
  }
  const text = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  const result = backupSchema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join('.') || 'estructura';
    throw new Error(`Copia de seguridad no válida (${path}): ${first?.message ?? 'datos incorrectos'}`);
  }
  return result.data as BackupPayload;
}

/**
 * Restaura una copia en la base local del usuario actual.
 *
 * Los identificadores se conservan, pero la propiedad de todos los registros se
 * reasigna al usuario activo para impedir que una copia de otra cuenta escriba
 * datos ajenos. En modo nube también se encola la reconciliación con Supabase.
 */
export async function restoreBackup(payload: BackupPayload): Promise<void> {
  const userId = getActiveUserId();
  if (!userId) throw new Error('No hay una sesión activa.');
  const db = getDb();
  const timestamp = nowIso();

  const previousWorkouts = await db.workouts.toArray();
  const previousPlans = await db.plans.toArray();
  const previousNotes = await db.notes.toArray();
  const previousRestDays = await db.restDays.toArray();
  const previousFavorites = await db.favorites.toArray();
  const previousCustomExercises = await db.exercises.where('source').equals('custom').toArray();

  const customExercises = payload.exercises
    .filter((exercise) => exercise.source === 'custom')
    .map<Exercise>((exercise) => ({ ...exercise, userId }));

  const plans = payload.plans.map((plan) => ({
    ...plan,
    userId,
    days: plan.days.map((day) => ({
      ...day,
      exercises: day.exercises.map((item) => ({
        ...item,
        exercise: item.exercise
          ? { ...item.exercise, userId: item.exercise.source === 'custom' ? userId : null }
          : null,
      })),
    })),
  }));

  const workouts = payload.workouts.map((snapshot) => ({
    workout: { ...snapshot.workout, userId },
    exercises: snapshot.exercises,
  }));

  const notes = payload.notes.map((note) => ({ ...note, userId }));
  const restDays = payload.restDays.map((restDay) => ({ ...restDay, userId }));
  const favorites = payload.favorites.map((favorite) => ({ ...favorite, userId }));

  const profile = payload.profile
    ? { ...payload.profile, id: userId, updatedAt: timestamp }
    : null;
  const settings = payload.settings
    ? { ...payload.settings, userId, updatedAt: timestamp }
    : null;

  await db.transaction(
    'rw',
    [
      db.exercises,
      db.plans,
      db.planDays,
      db.planExercises,
      db.workouts,
      db.workoutExercises,
      db.workoutSets,
      db.favorites,
      db.notes,
      db.restDays,
      db.profiles,
      db.settings,
      db.pendingOps,
    ],
    async () => {
      await db.workouts.clear();
      await db.workoutExercises.clear();
      await db.workoutSets.clear();
      await db.plans.clear();
      await db.planDays.clear();
      await db.planExercises.clear();
      await db.notes.clear();
      await db.restDays.clear();
      await db.favorites.clear();
      await db.exercises.where('source').equals('custom').delete();

      if (customExercises.length > 0) await db.exercises.bulkPut(customExercises);

      for (const plan of plans) {
        const { days, ...planRow } = plan;
        await db.plans.put(planRow);
        for (const day of days) {
          const { exercises, ...dayRow } = day;
          await db.planDays.put(dayRow);
          await db.planExercises.bulkPut(
            exercises.map((item) => ({
              id: item.id,
              planDayId: item.planDayId,
              exerciseId: item.exerciseId,
              userExerciseId: item.userExerciseId,
              nameSnapshot: item.nameSnapshot,
              primaryMuscle: item.primaryMuscle,
              position: item.position,
              targetSets: item.targetSets,
              targetReps: item.targetReps,
              restSeconds: item.restSeconds,
              notes: item.notes,
            })),
          );
        }
      }

      for (const snapshot of workouts) {
        await db.workouts.put(snapshot.workout);
        for (const exercise of snapshot.exercises) {
          const { sets, ...exerciseRow } = exercise;
          await db.workoutExercises.put(exerciseRow);
          await db.workoutSets.bulkPut(sets);
        }
      }

      if (notes.length > 0) await db.notes.bulkPut(notes);
      if (restDays.length > 0) await db.restDays.bulkPut(restDays);
      if (favorites.length > 0) await db.favorites.bulkPut(favorites);
      if (profile) await db.profiles.put(profile);
      if (settings) await db.settings.put(settings);
      await db.pendingOps.clear();
    },
  );

  if (isCloudConfigured) {
    await clearPendingOperations();
    for (const workout of previousWorkouts) {
      if (!workouts.some((item) => item.workout.id === workout.id)) {
        await enqueueOperation({
          entity: 'workout',
          operation: 'delete',
          entityId: workout.id,
          payload: null,
        });
      }
    }
    for (const plan of previousPlans) {
      if (!plans.some((item) => item.id === plan.id)) {
        await enqueueOperation({
          entity: 'plan',
          operation: 'delete',
          entityId: plan.id,
          payload: null,
        });
      }
    }
    for (const note of previousNotes) {
      if (!notes.some((item) => item.id === note.id)) {
        await enqueueOperation({ entity: 'note', operation: 'delete', entityId: note.id, payload: null });
      }
    }
    for (const restDay of previousRestDays) {
      if (!restDays.some((item) => item.id === restDay.id)) {
        await enqueueOperation({
          entity: 'restDay',
          operation: 'delete',
          entityId: restDay.id,
          payload: null,
        });
      }
    }
    for (const favorite of previousFavorites) {
      if (!favorites.some((item) => item.id === favorite.id)) {
        await enqueueOperation({
          entity: 'favorite',
          operation: 'delete',
          entityId: favorite.id,
          payload: null,
        });
      }
    }
    for (const exercise of previousCustomExercises) {
      if (!customExercises.some((item) => item.id === exercise.id)) {
        await enqueueOperation({
          entity: 'customExercise',
          operation: 'delete',
          entityId: exercise.id,
          payload: null,
        });
      }
    }
    for (const exercise of customExercises) {
      await enqueueOperation({
        entity: 'customExercise',
        operation: 'upsert',
        entityId: exercise.id,
        payload: exercise,
      });
    }
    for (const snapshot of workouts) {
      await enqueueOperation({
        entity: 'workout',
        operation: 'upsert',
        entityId: snapshot.workout.id,
        payload: snapshot,
      });
    }
    for (const plan of plans) {
      await enqueueOperation({
        entity: 'plan',
        operation: 'upsert',
        entityId: plan.id,
        payload: plan,
      });
    }
    for (const note of notes) {
      await enqueueOperation({ entity: 'note', operation: 'upsert', entityId: note.id, payload: note });
    }
    for (const restDay of restDays) {
      await enqueueOperation({
        entity: 'restDay',
        operation: 'upsert',
        entityId: restDay.id,
        payload: restDay,
      });
    }
    for (const favorite of favorites) {
      await enqueueOperation({
        entity: 'favorite',
        operation: 'upsert',
        entityId: favorite.id,
        payload: favorite,
      });
    }
    if (profile) {
      await enqueueOperation({
        entity: 'profile',
        operation: 'upsert',
        entityId: userId,
        payload: profile,
      });
    }
    if (settings) {
      await enqueueOperation({
        entity: 'settings',
        operation: 'upsert',
        entityId: userId,
        payload: settings,
      });
    }
    syncEngine.scheduleSync();
  }
}

export function exportWorkoutsCsv(workouts: WorkoutDetail[], filename?: string): void {
  const header = [
    'Fecha',
    'Entrenamiento',
    'Estado',
    'Duración (min)',
    'Ejercicios',
    'Series completadas',
    'Repeticiones',
    'Volumen efectivo (kg)',
    'Notas',
  ];
  const rows = workouts.map((workout) => {
    const sets = workout.exercises.flatMap((exercise) => exercise.sets);
    const completed = sets.filter((set) => set.isCompleted);
    const working = completed.filter((set) => set.setType !== 'warmup' && set.setType !== 'approximation');
    const volume = working.reduce((total, set) => total + setVolumeKg(set), 0);
    return [
      dateKey(workout.startedAt ?? workout.finishedAt ?? workout.scheduledAt ?? workout.createdAt),
      workout.name,
      workout.status,
      Math.round(getDurationSeconds(workout) / 60),
      workout.exercises.length,
      completed.length,
      working.reduce((total, set) => total + set.reps, 0),
      Math.round(toKg(volume, 'kg')),
      workout.notes.replace(/\s+/g, ' ').trim(),
    ];
  });
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');
  downloadFile(
    `\uFEFF${csv}`,
    filename ?? `hecofit-historial-${dateKey(new Date())}.csv`,
    'text/csv;charset=utf-8',
  );
}

export function exportWorkoutCsv(workout: WorkoutDetail): void {
  exportWorkoutsCsv(
    [workout],
    `hecofit-${dateKey(workout.startedAt ?? workout.createdAt)}-${workout.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}.csv`,
  );
}

export function makeRestDay(date: string, notes = ''): {
  id: string;
  userId: string;
  date: string;
  notes: string;
  createdAt: string;
} {
  const userId = getActiveUserId();
  if (!userId) throw new Error('No hay una sesión activa.');
  return {
    id: newId(),
    userId,
    date,
    notes,
    createdAt: nowIso(),
  };
}

export function isFinishedWorkout(workout: WorkoutDetail): boolean {
  return isFinished(workout);
}
