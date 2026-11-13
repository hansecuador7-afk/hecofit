import {
  countPendingOperations,
  enqueueOperation,
  getDb,
  getMeta,
  setMeta,
} from '@/database/db';
import { getErrorMessage } from '@/lib/errors';
import { nowIso } from '@/lib/utils';
import { isCloudConfigured, supabase } from '@/lib/supabase';
import type {
  Favorite,
  Note,
  PendingOperation,
  Profile,
  RestDay,
  UserSettings,
  WorkoutPlanDetail,
  WorkoutSnapshot,
} from '@/types/models';
import { useSyncStore } from '@/stores/syncStore';
import {
  customExerciseToRow,
  favoriteToRow,
  mapCustomExercise,
  mapFavorite,
  mapGlobalExercise,
  mapNote,
  mapPlan,
  mapPlanDay,
  mapPlanExercise,
  mapProfile,
  mapRestDay,
  mapSettings,
  mapWorkout,
  mapWorkoutExercise,
  mapWorkoutSet,
  noteToRow,
  planDayToRow,
  planExerciseToRow,
  planToRow,
  restDayToRow,
  settingsToRow,
  workoutExerciseToRow,
  workoutSetToRow,
  workoutToRow,
  type ExerciseRow,
  type FavoriteRow,
  type NoteRow,
  type PlanDayRow,
  type PlanExerciseRow,
  type PlanRow,
  type ProfileRow,
  type RestDayRow,
  type SettingsRow,
  type UserExerciseRow,
  type WorkoutExerciseRow,
  type WorkoutRow,
  type WorkoutSetRow,
} from './mappers';

const PAGE_SIZE = 500;
const SYNC_INTERVAL_MS = 60_000;

type QueryResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

async function fetchPaged<T>(
  build: (from: number, to: number) => QueryResult<T>,
): Promise<T[]> {
  let from = 0;
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase no está configurado.');
  return supabase;
}

/* ------------------------------- PULL ------------------------------- */

async function pullAllData(userId: string): Promise<void> {
  const client = requireClient();
  const db = getDb();

  const [
    profileResult,
    settingsResult,
    globalExercises,
    customExercises,
    plans,
    planDays,
    planExercises,
    workouts,
    workoutExercises,
    workoutSets,
    favorites,
    notes,
    restDays,
  ] = await Promise.all([
    client.from('profiles').select('*').eq('id', userId).maybeSingle(),
    client.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    fetchPaged<ExerciseRow>((from, to) =>
      client.from('exercises').select('*').order('name').range(from, to),
    ),
    fetchPaged<UserExerciseRow>((from, to) =>
      client.from('user_exercises').select('*').eq('user_id', userId).order('name').range(from, to),
    ),
    fetchPaged<PlanRow>((from, to) =>
      client.from('workout_plans').select('*').eq('user_id', userId).order('updated_at').range(from, to),
    ),
    fetchPaged<PlanDayRow>((from, to) =>
      client.from('plan_days').select('*').order('position').range(from, to),
    ),
    fetchPaged<PlanExerciseRow>((from, to) =>
      client.from('plan_exercises').select('*').order('position').range(from, to),
    ),
    fetchPaged<WorkoutRow>((from, to) =>
      client.from('workouts').select('*').eq('user_id', userId).order('created_at').range(from, to),
    ),
    fetchPaged<WorkoutExerciseRow>((from, to) =>
      client.from('workout_exercises').select('*').order('position').range(from, to),
    ),
    fetchPaged<WorkoutSetRow>((from, to) =>
      client.from('workout_sets').select('*').order('set_number').range(from, to),
    ),
    fetchPaged<FavoriteRow>((from, to) =>
      client.from('exercise_favorites').select('*').eq('user_id', userId).range(from, to),
    ),
    fetchPaged<NoteRow>((from, to) =>
      client.from('notes').select('*').eq('user_id', userId).order('updated_at').range(from, to),
    ),
    fetchPaged<RestDayRow>((from, to) =>
      client.from('rest_days').select('*').eq('user_id', userId).order('date').range(from, to),
    ),
  ]);

  if (profileResult.error) throw new Error(profileResult.error.message);
  if (settingsResult.error) throw new Error(settingsResult.error.message);

  // Sólo se conservan los registros del servidor. Cualquier cambio local debe
  // haberse empujado antes (la cola se procesa primero).
  const profile = profileResult.data ? mapProfile(profileResult.data as ProfileRow) : null;
  const remoteSettings = settingsResult.data
    ? mapSettings(settingsResult.data as SettingsRow)
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
    ],
    async () => {
      await db.exercises.clear();
      await db.exercises.bulkPut([
        ...globalExercises.map(mapGlobalExercise),
        ...customExercises.map(mapCustomExercise),
      ]);

      await db.plans.clear();
      await db.plans.bulkPut(plans.map(mapPlan));
      await db.planDays.clear();
      await db.planDays.bulkPut(planDays.map(mapPlanDay));
      await db.planExercises.clear();
      await db.planExercises.bulkPut(planExercises.map(mapPlanExercise));

      await db.workouts.clear();
      await db.workouts.bulkPut(workouts.map(mapWorkout));
      await db.workoutExercises.clear();
      await db.workoutExercises.bulkPut(workoutExercises.map(mapWorkoutExercise));
      await db.workoutSets.clear();
      await db.workoutSets.bulkPut(workoutSets.map(mapWorkoutSet));

      await db.favorites.clear();
      await db.favorites.bulkPut(favorites.map(mapFavorite));
      await db.notes.clear();
      await db.notes.bulkPut(notes.map(mapNote));
      await db.restDays.clear();
      await db.restDays.bulkPut(restDays.map(mapRestDay));

      if (profile) await db.profiles.put(profile);
      if (remoteSettings) await db.settings.put(remoteSettings);
    },
  );

  if (!profile) {
    const localProfile = await db.profiles.get(userId);
    if (localProfile) {
      await enqueueOperation({
        entity: 'profile',
        operation: 'upsert',
        entityId: userId,
        payload: localProfile,
      });
    }
  }
  if (!remoteSettings) {
    const localSettings = await db.settings.get(userId);
    if (localSettings) {
      await enqueueOperation({
        entity: 'settings',
        operation: 'upsert',
        entityId: userId,
        payload: localSettings,
      });
    }
  }
}

/* ------------------------------- PUSH ------------------------------- */

async function syncWorkoutSnapshot(
  snapshot: WorkoutSnapshot,
  userId: string,
): Promise<void> {
  const client = requireClient();
  if (snapshot.workout.userId !== userId) throw new Error('Propiedad de entrenamiento no válida.');
  const workoutId = snapshot.workout.id;

  const { error: workoutError } = await client
    .from('workouts')
    .upsert(workoutToRow(snapshot.workout), { onConflict: 'id' });
  if (workoutError) throw new Error(workoutError.message);

  const exerciseIds = snapshot.exercises.map((item) => item.id);
  const { data: existingExercises, error: existingExercisesError } = await client
    .from('workout_exercises')
    .select('id')
    .eq('workout_id', workoutId);
  if (existingExercisesError) throw new Error(existingExercisesError.message);

  const staleExerciseIds = (existingExercises ?? [])
    .map((row) => row.id as string)
    .filter((id) => !exerciseIds.includes(id));
  if (staleExerciseIds.length > 0) {
    const { error } = await client.from('workout_exercises').delete().in('id', staleExerciseIds);
    if (error) throw new Error(error.message);
  }

  if (snapshot.exercises.length > 0) {
    const { error } = await client
      .from('workout_exercises')
      .upsert(snapshot.exercises.map(workoutExerciseToRow), { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }

  for (const exercise of snapshot.exercises) {
    const setIds = exercise.sets.map((item) => item.id);
    const { data: existingSets, error: existingSetsError } = await client
      .from('workout_sets')
      .select('id')
      .eq('workout_exercise_id', exercise.id);
    if (existingSetsError) throw new Error(existingSetsError.message);
    const staleSetIds = (existingSets ?? [])
      .map((row) => row.id as string)
      .filter((id) => !setIds.includes(id));
    if (staleSetIds.length > 0) {
      const { error } = await client.from('workout_sets').delete().in('id', staleSetIds);
      if (error) throw new Error(error.message);
    }
    if (exercise.sets.length > 0) {
      const { error } = await client
        .from('workout_sets')
        .upsert(exercise.sets.map(workoutSetToRow), { onConflict: 'id' });
      if (error) throw new Error(error.message);
    }
  }
}

async function syncPlanSnapshot(planDetail: WorkoutPlanDetail, userId: string): Promise<void> {
  const client = requireClient();
  if (planDetail.userId !== userId) throw new Error('Propiedad de rutina no válida.');
  const { error: planError } = await client
    .from('workout_plans')
    .upsert(planToRow(planDetail), { onConflict: 'id' });
  if (planError) throw new Error(planError.message);

  const dayIds = planDetail.days.map((day) => day.id);
  const { data: existingDays, error: existingDaysError } = await client
    .from('plan_days')
    .select('id')
    .eq('plan_id', planDetail.id);
  if (existingDaysError) throw new Error(existingDaysError.message);
  const staleDayIds = (existingDays ?? [])
    .map((row) => row.id as string)
    .filter((id) => !dayIds.includes(id));
  if (staleDayIds.length > 0) {
    const { error } = await client.from('plan_days').delete().in('id', staleDayIds);
    if (error) throw new Error(error.message);
  }

  if (planDetail.days.length > 0) {
    const { error } = await client
      .from('plan_days')
      .upsert(planDetail.days.map(planDayToRow), { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }

  const allExercises = planDetail.days.flatMap((day) => day.exercises);
  const exerciseIds = allExercises.map((item) => item.id);

  if (dayIds.length > 0) {
    let query = client.from('plan_exercises').select('id').in('plan_day_id', dayIds);
    if (exerciseIds.length > 0) {
      query = query.not('id', 'in', `(${exerciseIds.join(',')})`);
    }
    const { data: staleExercises, error: staleError } = await query;
    if (staleError) throw new Error(staleError.message);
    const staleIds = (staleExercises ?? []).map((row) => row.id as string);
    if (staleIds.length > 0) {
      const { error } = await client.from('plan_exercises').delete().in('id', staleIds);
      if (error) throw new Error(error.message);
    }
  }

  if (allExercises.length > 0) {
    const { error } = await client
      .from('plan_exercises')
      .upsert(allExercises.map(planExerciseToRow), { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }
}

async function pushOperation(operation: PendingOperation, userId: string): Promise<void> {
  const client = requireClient();
  switch (operation.entity) {
    case 'workout': {
      if (operation.operation === 'delete') {
        const { error } = await client.from('workouts').delete().eq('id', operation.entityId);
        if (error) throw new Error(error.message);
      } else {
        await syncWorkoutSnapshot(operation.payload as WorkoutSnapshot, userId);
      }
      return;
    }
    case 'plan': {
      if (operation.operation === 'delete') {
        const { error } = await client.from('workout_plans').delete().eq('id', operation.entityId);
        if (error) throw new Error(error.message);
      } else {
        await syncPlanSnapshot(operation.payload as WorkoutPlanDetail, userId);
      }
      return;
    }
    case 'note': {
      if (operation.operation === 'delete') {
        const { error } = await client.from('notes').delete().eq('id', operation.entityId);
        if (error) throw new Error(error.message);
      } else {
        const note = operation.payload as Note;
        if (note.userId !== userId) throw new Error('Propiedad de nota no válida.');
        const { error } = await client.from('notes').upsert(noteToRow(note), { onConflict: 'id' });
        if (error) throw new Error(error.message);
      }
      return;
    }
    case 'restDay': {
      if (operation.operation === 'delete') {
        const { error } = await client.from('rest_days').delete().eq('id', operation.entityId);
        if (error) throw new Error(error.message);
      } else {
        const restDay = operation.payload as RestDay;
        if (restDay.userId !== userId) throw new Error('Propiedad de descanso no válida.');
        const { error } = await client
          .from('rest_days')
          .upsert(restDayToRow(restDay), { onConflict: 'id' });
        if (error) throw new Error(error.message);
      }
      return;
    }
    case 'favorite': {
      if (operation.operation === 'delete') {
        const { error } = await client
          .from('exercise_favorites')
          .delete()
          .eq('id', operation.entityId);
        if (error) throw new Error(error.message);
      } else {
        const favorite = operation.payload as Favorite;
        if (favorite.userId !== userId) throw new Error('Propiedad de favorito no válida.');
        const { error } = await client
          .from('exercise_favorites')
          .upsert(favoriteToRow(favorite), { onConflict: 'id' });
        if (error) throw new Error(error.message);
      }
      return;
    }
    case 'customExercise': {
      if (operation.operation === 'delete') {
        const { error } = await client
          .from('user_exercises')
          .delete()
          .eq('id', operation.entityId);
        if (error) throw new Error(error.message);
      } else {
        const exercise = operation.payload as Parameters<typeof customExerciseToRow>[0];
        if (exercise.userId !== userId) throw new Error('Propiedad de ejercicio no válida.');
        const { error } = await client
          .from('user_exercises')
          .upsert(customExerciseToRow(exercise), { onConflict: 'id' });
        if (error) throw new Error(error.message);
      }
      return;
    }
    case 'settings': {
      if (operation.operation === 'delete') return;
      const settings = operation.payload as UserSettings;
      if (settings.userId !== userId) throw new Error('Propiedad de ajustes no válida.');
      const { error } = await client
        .from('user_settings')
        .upsert(settingsToRow(settings), { onConflict: 'user_id' });
      if (error) throw new Error(error.message);
      return;
    }
    case 'profile': {
      if (operation.operation === 'delete') return;
      const profile = operation.payload as Profile;
      if (profile.id !== userId) throw new Error('Propiedad de perfil no válida.');
      const { error } = await client.from('profiles').upsert(
        {
          id: profile.id,
          display_name: profile.displayName,
          avatar_url: profile.avatarUrl,
          created_at: profile.createdAt,
          updated_at: profile.updatedAt,
        },
        { onConflict: 'id' },
      );
      if (error) throw new Error(error.message);
      return;
    }
    default:
      throw new Error(`Operación de sincronización desconocida: ${String(operation.entity)}`);
  }
}

/* ------------------------------ MOTOR ------------------------------ */

class SyncEngine {
  private userId: string | null = null;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private listenersAttached = false;
  lastFullSync = 0;

  get isRunning(): boolean {
    return this.running;
  }

  async start(userId: string): Promise<void> {
    this.userId = userId;
    this.attachListeners();
    const store = useSyncStore.getState();
    if (!isCloudConfigured) {
      store.setStatus('local');
      store.setPendingCount(0);
      return;
    }
    await this.refreshPendingCount();
    if (!navigator.onLine) {
      store.setStatus('offline');
      return;
    }
    await this.syncNow({ initial: true });
    if (!this.interval) {
      this.interval = setInterval(() => {
        if (this.userId && navigator.onLine) void this.syncNow();
      }, SYNC_INTERVAL_MS);
    }
  }

  stop(): void {
    this.userId = null;
    if (this.timer) clearTimeout(this.timer);
    if (this.interval) clearInterval(this.interval);
    this.timer = null;
    this.interval = null;
    this.detachListeners();
    useSyncStore.getState().reset();
  }

  private attachListeners(): void {
    if (this.listenersAttached) return;
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    document.addEventListener('visibilitychange', this.handleVisibility);
    this.listenersAttached = true;
  }

  private detachListeners(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.listenersAttached = false;
  }

  private handleOnline = (): void => {
    useSyncStore.getState().setOnline(true);
    void this.syncNow({ initial: true });
  };

  private handleOffline = (): void => {
    useSyncStore.getState().setOnline(false);
    useSyncStore.getState().setStatus('offline');
  };

  private handleVisibility = (): void => {
    if (document.visibilityState === 'visible' && navigator.onLine && this.userId) {
      if (Date.now() - this.lastFullSync > SYNC_INTERVAL_MS) void this.syncNow();
    }
  };

  async refreshPendingCount(): Promise<void> {
    try {
      const count = await countPendingOperations();
      const state = useSyncStore.getState();
      state.setPendingCount(count);
      if (count > 0 && state.status !== 'syncing' && state.status !== 'offline') {
        state.setStatus('pending');
      }
    } catch {
      // La base de datos puede estar cerrándose durante el cierre de sesión.
    }
  }

  scheduleSync(delay = 700): void {
    if (!this.userId || !isCloudConfigured) return;
    void this.refreshPendingCount();
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.syncNow();
    }, delay);
  }

  async syncNow(options: { initial?: boolean } = {}): Promise<void> {
    const userId = this.userId;
    if (!userId || !isCloudConfigured) return;
    const store = useSyncStore.getState();
    if (!navigator.onLine) {
      store.setStatus('offline');
      return;
    }
    if (this.running) return;
    this.running = true;
    store.setStatus('syncing');
    store.setError(null);

    try {
      const db = getDb();
      const ops = await db.pendingOps.orderBy('createdAt').toArray();
      for (const operation of ops) {
        try {
          await pushOperation(operation, userId);
          await db.pendingOps.delete(operation.id);
        } catch (error) {
          const message = getErrorMessage(error);
          await db.pendingOps.update(operation.id, {
            attempts: operation.attempts + 1,
            lastError: message,
          });
          throw new Error(message);
        }
      }

      if (options.initial || Date.now() - this.lastFullSync > 20_000) {
        await pullAllData(userId);
        this.lastFullSync = Date.now();
      }

      const timestamp = nowIso();
      await setMeta('lastSyncedAt', timestamp);
      const pending = await countPendingOperations();
      store.setPendingCount(pending);
      store.setLastSyncedAt(timestamp);
      store.setStatus(pending > 0 ? 'pending' : 'idle');
    } catch (error) {
      const message = getErrorMessage(error);
      store.setError(message);
      store.setStatus('error');
      await this.refreshPendingCount();
    } finally {
      this.running = false;
    }
  }
}

export const syncEngine = new SyncEngine();

export async function getLastSyncedAt(): Promise<string | null> {
  return getMeta<string>('lastSyncedAt');
}

/* --------------------- Guardado de entidades --------------------- */

export async function saveWorkoutSnapshot(
  snapshot: WorkoutSnapshot,
  options: { sync?: boolean } = {},
): Promise<void> {
  const db = getDb();
  await db.transaction(
    'rw',
    [db.workouts, db.workoutExercises, db.workoutSets, db.pendingOps],
    async () => {
      await db.workouts.put(snapshot.workout);
      const exerciseIds = snapshot.exercises.map((item) => item.id);
      const existingExercises = await db.workoutExercises
        .where('workoutId')
        .equals(snapshot.workout.id)
        .toArray();
      const staleExerciseIds = existingExercises
        .map((item) => item.id)
        .filter((id) => !exerciseIds.includes(id));
      if (staleExerciseIds.length > 0) {
        await db.workoutExercises.bulkDelete(staleExerciseIds);
        const staleSets = await db.workoutSets
          .filter((item) => staleExerciseIds.includes(item.workoutExerciseId))
          .toArray();
        await db.workoutSets.bulkDelete(staleSets.map((item) => item.id));
      }
      for (const exercise of snapshot.exercises) {
        const { sets: exerciseSets, ...exerciseRow } = exercise;
        await db.workoutExercises.put(exerciseRow);
        const setIds = exerciseSets.map((item) => item.id);
        const existingSets = await db.workoutSets
          .where('workoutExerciseId')
          .equals(exercise.id)
          .toArray();
        const staleSetIds = existingSets.map((item) => item.id).filter((id) => !setIds.includes(id));
        if (staleSetIds.length > 0) await db.workoutSets.bulkDelete(staleSetIds);
        await db.workoutSets.bulkPut(exerciseSets);
      }
    },
  );

  if (isCloudConfigured) {
    await enqueueOperation({
      entity: 'workout',
      operation: 'upsert',
      entityId: snapshot.workout.id,
      payload: snapshot,
    });
    if (options.sync !== false) syncEngine.scheduleSync();
  }
}

export async function deleteWorkout(id: string): Promise<void> {
  const db = getDb();
  const exercises = await db.workoutExercises.where('workoutId').equals(id).toArray();
  const exerciseIds = exercises.map((item) => item.id);
  await db.transaction(
    'rw',
    [db.workouts, db.workoutExercises, db.workoutSets, db.pendingOps],
    async () => {
      await db.workouts.delete(id);
      if (exerciseIds.length > 0) {
        await db.workoutExercises.bulkDelete(exerciseIds);
        const sets = await db.workoutSets
          .filter((item) => exerciseIds.includes(item.workoutExerciseId))
          .toArray();
        await db.workoutSets.bulkDelete(sets.map((item) => item.id));
      }
    },
  );
  if (isCloudConfigured) {
    await enqueueOperation({
      entity: 'workout',
      operation: 'delete',
      entityId: id,
      payload: null,
    });
    syncEngine.scheduleSync();
  }
}

export async function savePlanDetail(plan: WorkoutPlanDetail): Promise<void> {
  const db = getDb();
  await db.transaction(
    'rw',
    [db.plans, db.planDays, db.planExercises, db.pendingOps],
    async () => {
      const { days, ...planRow } = plan;
      await db.plans.put(planRow);
      const dayIds = days.map((day) => day.id);
      const existingDays = await db.planDays.where('planId').equals(plan.id).toArray();
      const staleDayIds = existingDays.map((day) => day.id).filter((id) => !dayIds.includes(id));
      await db.planDays.bulkDelete(staleDayIds);
      const exerciseIds = days.flatMap((day) => day.exercises.map((item) => item.id));
      const existingExercises = await db.planExercises
        .filter((item) => existingDays.some((day) => day.id === item.planDayId))
        .toArray();
      const staleExerciseIds = existingExercises
        .map((item) => item.id)
        .filter((id) => !exerciseIds.includes(id));
      await db.planExercises.bulkDelete(staleExerciseIds);
      for (const day of days) {
        const { exercises, ...dayRow } = day;
        await db.planDays.put(dayRow);
        await db.planExercises.bulkPut(exercises);
      }
    },
  );
  if (isCloudConfigured) {
    await enqueueOperation({
      entity: 'plan',
      operation: 'upsert',
      entityId: plan.id,
      payload: plan,
    });
    syncEngine.scheduleSync();
  }
}

export async function deletePlan(id: string): Promise<void> {
  const db = getDb();
  const days = await db.planDays.where('planId').equals(id).toArray();
  const dayIds = days.map((day) => day.id);
  await db.transaction(
    'rw',
    [db.plans, db.planDays, db.planExercises, db.pendingOps],
    async () => {
      await db.plans.delete(id);
      await db.planDays.bulkDelete(dayIds);
      const exercises = await db.planExercises
        .filter((item) => dayIds.includes(item.planDayId))
        .toArray();
      await db.planExercises.bulkDelete(exercises.map((item) => item.id));
    },
  );
  if (isCloudConfigured) {
    await enqueueOperation({ entity: 'plan', operation: 'delete', entityId: id, payload: null });
    syncEngine.scheduleSync();
  }
}

export async function saveNote(note: Note): Promise<void> {
  await getDb().notes.put(note);
  if (isCloudConfigured) {
    await enqueueOperation({
      entity: 'note',
      operation: 'upsert',
      entityId: note.id,
      payload: note,
    });
    syncEngine.scheduleSync();
  }
}

export async function deleteNote(id: string): Promise<void> {
  await getDb().notes.delete(id);
  if (isCloudConfigured) {
    await enqueueOperation({ entity: 'note', operation: 'delete', entityId: id, payload: null });
    syncEngine.scheduleSync();
  }
}

export async function saveRestDay(restDay: RestDay): Promise<void> {
  await getDb().restDays.put(restDay);
  if (isCloudConfigured) {
    await enqueueOperation({
      entity: 'restDay',
      operation: 'upsert',
      entityId: restDay.id,
      payload: restDay,
    });
    syncEngine.scheduleSync();
  }
}

export async function deleteRestDay(id: string): Promise<void> {
  await getDb().restDays.delete(id);
  if (isCloudConfigured) {
    await enqueueOperation({
      entity: 'restDay',
      operation: 'delete',
      entityId: id,
      payload: null,
    });
    syncEngine.scheduleSync();
  }
}

export async function saveFavorite(favorite: Favorite): Promise<void> {
  await getDb().favorites.put(favorite);
  if (isCloudConfigured) {
    await enqueueOperation({
      entity: 'favorite',
      operation: 'upsert',
      entityId: favorite.id,
      payload: favorite,
    });
    syncEngine.scheduleSync();
  }
}

export async function deleteFavorite(id: string): Promise<void> {
  await getDb().favorites.delete(id);
  if (isCloudConfigured) {
    await enqueueOperation({
      entity: 'favorite',
      operation: 'delete',
      entityId: id,
      payload: null,
    });
    syncEngine.scheduleSync();
  }
}

export async function saveCustomExercise(
  exercise: Parameters<typeof customExerciseToRow>[0],
): Promise<void> {
  await getDb().exercises.put(exercise);
  if (isCloudConfigured) {
    await enqueueOperation({
      entity: 'customExercise',
      operation: 'upsert',
      entityId: exercise.id,
      payload: exercise,
    });
    syncEngine.scheduleSync();
  }
}

export async function deleteCustomExercise(id: string): Promise<void> {
  await getDb().exercises.delete(id);
  if (isCloudConfigured) {
    await enqueueOperation({
      entity: 'customExercise',
      operation: 'delete',
      entityId: id,
      payload: null,
    });
    syncEngine.scheduleSync();
  }
}

export async function forceFullSync(): Promise<void> {
  syncEngine.lastFullSync = 0;
  await syncEngine.syncNow({ initial: true });
}
