import Dexie, { type Table } from 'dexie';
import { GLOBAL_EXERCISES } from '@/data/catalog';
import { DEFAULT_REST_SECONDS } from '@/lib/constants';
import { nowIso } from '@/lib/utils';
import type {
  Exercise,
  Favorite,
  Note,
  PendingEntity,
  PendingOperation,
  PlanDay,
  PlanExercise,
  Profile,
  RestDay,
  SessionUser,
  UserSettings,
  Workout,
  WorkoutExercise,
  WorkoutPlan,
  WorkoutSet,
} from '@/types/models';

interface MetaRow {
  key: string;
  value: unknown;
}

export class HecofitDatabase extends Dexie {
  exercises!: Table<Exercise, string>;
  plans!: Table<WorkoutPlan, string>;
  planDays!: Table<PlanDay, string>;
  planExercises!: Table<PlanExercise, string>;
  workouts!: Table<Workout, string>;
  workoutExercises!: Table<WorkoutExercise, string>;
  workoutSets!: Table<WorkoutSet, string>;
  favorites!: Table<Favorite, string>;
  notes!: Table<Note, string>;
  restDays!: Table<RestDay, string>;
  profiles!: Table<Profile, string>;
  settings!: Table<UserSettings, string>;
  pendingOps!: Table<PendingOperation, string>;
  meta!: Table<MetaRow, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      exercises: 'id, name, primaryMuscle, equipment, source, updatedAt',
      plans: 'id, name, isActive, createdAt, updatedAt',
      planDays: 'id, planId, position',
      planExercises: 'id, planDayId, position',
      workouts: 'id, status, startedAt, scheduledAt, finishedAt, createdAt, updatedAt',
      workoutExercises: 'id, workoutId, position',
      workoutSets: 'id, workoutExerciseId, setNumber',
      favorites: 'id, exerciseId, userExerciseId',
      notes: 'id, noteType, pinned, createdAt, updatedAt',
      restDays: 'id, date',
      profiles: 'id',
      settings: 'userId',
      pendingOps: 'id, createdAt, entity',
      meta: 'key',
    });
  }
}

let activeUserId: string | null = null;
let activeDb: HecofitDatabase | null = null;

export function activateUserDatabase(userId: string): HecofitDatabase {
  if (activeUserId === userId && activeDb) return activeDb;
  activeDb?.close();
  activeUserId = userId;
  activeDb = new HecofitDatabase(`hecofit-user-${userId}`);
  return activeDb;
}

export function getDb(): HecofitDatabase {
  if (!activeDb) {
    throw new Error('La base de datos del usuario aún no está inicializada.');
  }
  return activeDb;
}

export function getActiveUserId(): string | null {
  return activeUserId;
}

export function closeActiveDatabase(): void {
  activeDb?.close();
  activeDb = null;
  activeUserId = null;
}

export async function initializeUserDatabase(user: SessionUser): Promise<void> {
  const db = activateUserDatabase(user.id);
  await db.open();
  await db.transaction('rw', db.exercises, db.profiles, db.settings, async () => {
    const globalCount = await db.exercises.where('source').equals('global').count();
    if (globalCount === 0) {
      await db.exercises.bulkPut(GLOBAL_EXERCISES);
    }
    const profile = await db.profiles.get(user.id);
    if (!profile) {
      const timestamp = user.createdAt || nowIso();
      await db.profiles.put({
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    const settings = await db.settings.get(user.id);
    if (!settings) {
      const timestamp = nowIso();
      await db.settings.put({
        userId: user.id,
        weightUnit: 'kg',
        theme: 'dark',
        restSeconds: DEFAULT_REST_SECONDS,
        soundEnabled: true,
        autoRest: true,
        dateFormat: 'dd/MM/yyyy',
        notificationsEnabled: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  });
}

export async function getMeta<T>(key: string): Promise<T | null> {
  const row = await getDb().meta.get(key);
  return (row?.value as T | undefined) ?? null;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await getDb().meta.put({ key, value });
}

export async function enqueueOperation(input: {
  entity: PendingEntity;
  operation: 'upsert' | 'delete';
  entityId: string;
  payload: unknown;
}): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.pendingOps, async () => {
    const existing = await db.pendingOps
      .filter((op) => op.entity === input.entity && op.entityId === input.entityId)
      .toArray();
    if (existing.length > 0) {
      await db.pendingOps.bulkDelete(existing.map((op) => op.id));
    }
    await db.pendingOps.put({
      id: crypto.randomUUID(),
      entity: input.entity,
      operation: input.operation,
      entityId: input.entityId,
      payload: input.payload,
      createdAt: nowIso(),
      attempts: 0,
      lastError: null,
    });
  });
}

export async function countPendingOperations(): Promise<number> {
  return getDb().pendingOps.count();
}

export async function clearPendingOperations(): Promise<void> {
  await getDb().pendingOps.clear();
}

export async function deleteUserDatabase(userId: string): Promise<void> {
  const name = `hecofit-user-${userId}`;
  closeActiveDatabase();
  await Dexie.delete(name);
}
