import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { getActiveUserId, getDb } from '@/database/db';
import type {
  Exercise,
  Favorite,
  Note,
  PlanDay,
  PlanExercise,
  RestDay,
  Workout,
  WorkoutDetail,
  WorkoutExerciseWithSets,
  WorkoutPlan,
  WorkoutPlanDetail,
  WorkoutSet,
} from '@/types/models';

function useReady(): { userId: string | null; ready: boolean } {
  const { user } = useAuth();
  const ready = Boolean(user && getActiveUserId() === user.id);
  return { userId: user?.id ?? null, ready };
}

export function useWorkouts(): Workout[] {
  const { userId, ready } = useReady();
  const rows = useLiveQuery(
    async () => {
      if (!ready) return [];
      const data = await getDb().workouts.toArray();
      return data.sort((a, b) => {
        const first = a.startedAt ?? a.scheduledAt ?? a.createdAt;
        const second = b.startedAt ?? b.scheduledAt ?? b.createdAt;
        return second.localeCompare(first);
      });
    },
    [userId, ready],
    [],
  );
  return rows ?? [];
}

export function useActiveWorkout(): Workout | null {
  const workouts = useWorkouts();
  return (
    workouts.find((workout) => workout.status === 'in_progress' || workout.status === 'paused') ??
    null
  );
}

export function useWorkoutDetail(id: string | undefined): WorkoutDetail | null | undefined {
  const { userId, ready } = useReady();
  return useLiveQuery(
    async () => {
      if (!ready || !id) return null;
      const db = getDb();
      const workout = await db.workouts.get(id);
      if (!workout) return null;
      const exercises = await db.workoutExercises.where('workoutId').equals(id).toArray();
      const allSets = await db.workoutSets.toArray();
      const plan = workout.planId ? await db.plans.get(workout.planId) : null;
      const exerciseCatalog = await db.exercises.toArray();
      const catalogMap = new Map(exerciseCatalog.map((exercise) => [exercise.id, exercise]));
      const detailed: WorkoutExerciseWithSets[] = exercises
        .sort((a, b) => a.position - b.position)
        .map((exercise) => ({
          ...exercise,
          sets: allSets
            .filter((set) => set.workoutExerciseId === exercise.id)
            .sort((a, b) => a.setNumber - b.setNumber),
          exercise:
            catalogMap.get(exercise.exerciseId ?? '') ??
            catalogMap.get(exercise.userExerciseId ?? '') ??
            null,
        }));
      return { ...workout, exercises: detailed, planName: plan?.name ?? null };
    },
    [userId, ready, id],
    null,
  );
}

export interface WorkoutWithSummary {
  workout: Workout;
  exerciseCount: number;
  setCount: number;
  volumeKg: number;
}

export function useWorkoutSummaries(): WorkoutWithSummary[] {
  const { userId, ready } = useReady();
  const rows = useLiveQuery(
    async () => {
      if (!ready) return [];
      const db = getDb();
      const [workouts, exercises, sets] = await Promise.all([
        db.workouts.toArray(),
        db.workoutExercises.toArray(),
        db.workoutSets.toArray(),
      ]);
      const setsByExercise = new Map<string, WorkoutSet[]>();
      for (const set of sets) {
        const list = setsByExercise.get(set.workoutExerciseId) ?? [];
        list.push(set);
        setsByExercise.set(set.workoutExerciseId, list);
      }
      const exercisesByWorkout = new Map<string, typeof exercises>();
      for (const exercise of exercises) {
        const list = exercisesByWorkout.get(exercise.workoutId) ?? [];
        list.push(exercise);
        exercisesByWorkout.set(exercise.workoutId, list);
      }
      return workouts
        .map((workout) => {
          const workoutExercises = exercisesByWorkout.get(workout.id) ?? [];
          const workoutSets = workoutExercises.flatMap(
            (exercise) => setsByExercise.get(exercise.id) ?? [],
          );
          const volumeKg = workoutSets
            .filter((set) => set.isCompleted && set.weight > 0 && set.reps > 0)
            .reduce(
              (total, set) =>
                total + (set.weightUnit === 'lb' ? set.weight * 0.45359237 : set.weight) * set.reps,
              0,
            );
          return {
            workout,
            exerciseCount: workoutExercises.length,
            setCount: workoutSets.length,
            volumeKg,
          };
        })
        .sort((a, b) => {
          const first = a.workout.startedAt ?? a.workout.scheduledAt ?? a.workout.createdAt;
          const second = b.workout.startedAt ?? b.workout.scheduledAt ?? b.workout.createdAt;
          return second.localeCompare(first);
        });
    },
    [userId, ready],
    [],
  );
  return rows ?? [];
}

export function useWorkoutsWithDetails(): WorkoutDetail[] {
  const { userId, ready } = useReady();
  const rows = useLiveQuery(
    async () => {
      if (!ready) return [];
      const db = getDb();
      const [workouts, exercises, sets, plans] = await Promise.all([
        db.workouts.toArray(),
        db.workoutExercises.toArray(),
        db.workoutSets.toArray(),
        db.plans.toArray(),
      ]);
      const planMap = new Map(plans.map((plan) => [plan.id, plan.name]));
      const setsByExercise = new Map<string, WorkoutSet[]>();
      for (const set of sets) {
        const list = setsByExercise.get(set.workoutExerciseId) ?? [];
        list.push(set);
        setsByExercise.set(set.workoutExerciseId, list);
      }
      return workouts
        .map((workout) => {
          const workoutExercises = exercises
            .filter((exercise) => exercise.workoutId === workout.id)
            .sort((a, b) => a.position - b.position)
            .map((exercise) => ({
              ...exercise,
              sets: (setsByExercise.get(exercise.id) ?? []).sort(
                (a, b) => a.setNumber - b.setNumber,
              ),
              exercise: null,
            }));
          return {
            ...workout,
            exercises: workoutExercises,
            planName: workout.planId ? planMap.get(workout.planId) ?? null : null,
          };
        })
        .sort((a, b) => {
          const first = a.startedAt ?? a.scheduledAt ?? a.createdAt;
          const second = b.startedAt ?? b.scheduledAt ?? b.createdAt;
          return second.localeCompare(first);
        });
    },
    [userId, ready],
    [],
  );
  return rows ?? [];
}

export function usePlans() {
  const { userId, ready } = useReady();
  const rows = useLiveQuery(
    async () => {
      if (!ready) return [];
      const data = await getDb().plans.toArray();
      return data.sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.updatedAt.localeCompare(a.updatedAt));
    },
    [userId, ready],
    [],
  );
  return rows ?? [];
}

export interface PlanOverview {
  plan: WorkoutPlan;
  days: Array<{ id: string; name: string; exerciseCount: number; targetSets: number }>;
}

export function usePlanOverviews(): PlanOverview[] {
  const { userId, ready } = useReady();
  const rows = useLiveQuery(
    async () => {
      if (!ready) return [];
      const db = getDb();
      const [plans, days, planExercises] = await Promise.all([
        db.plans.toArray(),
        db.planDays.toArray(),
        db.planExercises.toArray(),
      ]);
      return plans
        .map((plan) => ({
          plan,
          days: days
            .filter((day) => day.planId === plan.id)
            .sort((a, b) => a.position - b.position)
            .map((day) => {
              const items = planExercises.filter((item) => item.planDayId === day.id);
              return {
                id: day.id,
                name: day.name,
                exerciseCount: items.length,
                targetSets: items.reduce((total, item) => total + item.targetSets, 0),
              };
            }),
        }))
        .sort(
          (a, b) =>
            Number(b.plan.isActive) - Number(a.plan.isActive) ||
            b.plan.updatedAt.localeCompare(a.plan.updatedAt),
        );
    },
    [userId, ready],
    [],
  );
  return rows ?? [];
}

export function usePlanDetail(id: string | undefined): WorkoutPlanDetail | null | undefined {
  const { userId, ready } = useReady();
  return useLiveQuery(
    async () => {
      if (!ready || !id) return null;
      const db = getDb();
      const plan = await db.plans.get(id);
      if (!plan) return null;
      const [days, planExercises, exercises] = await Promise.all([
        db.planDays.where('planId').equals(id).toArray(),
        db.planExercises.toArray(),
        db.exercises.toArray(),
      ]);
      const catalog = new Map(exercises.map((exercise) => [exercise.id, exercise]));
      const dayList = days
        .sort((a, b) => a.position - b.position)
        .map((day: PlanDay) => ({
          ...day,
          exercises: planExercises
            .filter((item) => item.planDayId === day.id)
            .sort((a: PlanExercise, b: PlanExercise) => a.position - b.position)
            .map((item) => ({
              ...item,
              exercise:
                catalog.get(item.exerciseId ?? '') ?? catalog.get(item.userExerciseId ?? '') ?? null,
            })),
        }));
      return { ...plan, days: dayList };
    },
    [userId, ready, id],
    null,
  );
}

export function useExercises(): Exercise[] {
  const { userId, ready } = useReady();
  const rows = useLiveQuery(
    async () => {
      if (!ready) return [];
      const data = await getDb().exercises.toArray();
      return data.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    },
    [userId, ready],
    [],
  );
  return rows ?? [];
}

export function useFavorites(): Favorite[] {
  const { userId, ready } = useReady();
  const rows = useLiveQuery(
    async () => {
      if (!ready) return [];
      return getDb().favorites.toArray();
    },
    [userId, ready],
    [],
  );
  return rows ?? [];
}

export function useNotes(): Note[] {
  const { userId, ready } = useReady();
  const rows = useLiveQuery(
    async () => {
      if (!ready) return [];
      const data = await getDb().notes.toArray();
      return data.sort(
        (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt),
      );
    },
    [userId, ready],
    [],
  );
  return rows ?? [];
}

export function useRestDays(): RestDay[] {
  const { userId, ready } = useReady();
  const rows = useLiveQuery(
    async () => {
      if (!ready) return [];
      const data = await getDb().restDays.toArray();
      return data.sort((a, b) => b.date.localeCompare(a.date));
    },
    [userId, ready],
    [],
  );
  return rows ?? [];
}

export function useAllSets(): WorkoutSet[] {
  const { userId, ready } = useReady();
  const rows = useLiveQuery(
    async () => {
      if (!ready) return [];
      return getDb().workoutSets.toArray();
    },
    [userId, ready],
    [],
  );
  return rows ?? [];
}
