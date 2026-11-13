import { getActiveUserId, getDb } from '@/database/db';
import { newId, nowIso } from '@/lib/utils';
import { savePlanDetail } from '@/services/sync';
import type {
  Exercise,
  PlanDayWithExercises,
  WorkoutPlan,
  WorkoutPlanDetail,
} from '@/types/models';

export async function loadPlanDetail(id: string): Promise<WorkoutPlanDetail | null> {
  const db = getDb();
  const plan = await db.plans.get(id);
  if (!plan) return null;
  const [days, planExercises, exercises] = await Promise.all([
    db.planDays.where('planId').equals(id).toArray(),
    db.planExercises.toArray(),
    db.exercises.toArray(),
  ]);
  const catalog = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const detailedDays: PlanDayWithExercises[] = days
    .sort((a, b) => a.position - b.position)
    .map((day) => ({
      ...day,
      exercises: planExercises
        .filter((item) => item.planDayId === day.id)
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          ...item,
          exercise:
            catalog.get(item.exerciseId ?? '') ?? catalog.get(item.userExerciseId ?? '') ?? null,
        })),
    }));
  return { ...plan, days: detailedDays };
}

export async function createPlan(input: {
  name: string;
  description?: string;
}): Promise<WorkoutPlanDetail> {
  const userId = getActiveUserId();
  if (!userId) throw new Error('No hay una sesión activa.');
  const timestamp = nowIso();
  const plan: WorkoutPlan = {
    id: newId(),
    userId,
    name: input.name.trim() || 'Nueva rutina',
    description: input.description?.trim() ?? '',
    isActive: false,
    notes: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const detail: WorkoutPlanDetail = { ...plan, days: [] };
  await savePlanDetail(detail);
  return detail;
}

export async function duplicatePlan(planId: string): Promise<WorkoutPlanDetail> {
  const source = await loadPlanDetail(planId);
  if (!source) throw new Error('La rutina no existe.');
  const userId = getActiveUserId();
  if (!userId) throw new Error('No hay una sesión activa.');
  const timestamp = nowIso();
  const planIdNew = newId();
  const days = source.days.map((day, dayIndex) => ({
    ...day,
    id: newId(),
    planId: planIdNew,
    name: day.name,
    position: dayIndex,
    exercises: day.exercises.map((item, exerciseIndex) => ({
      ...item,
      id: newId(),
      planDayId: '',
      position: exerciseIndex,
    })),
  }));
  for (const day of days) {
    for (const item of day.exercises) item.planDayId = day.id;
  }
  const copy: WorkoutPlanDetail = {
    ...source,
    id: planIdNew,
    userId,
    name: `${source.name} (copia)`,
    isActive: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    days,
  };
  await savePlanDetail(copy);
  return copy;
}

export async function setPlanActive(planId: string | null): Promise<void> {
  const db = getDb();
  const plans = await db.plans.toArray();
  const timestamp = nowIso();
  for (const plan of plans) {
    const shouldBeActive = plan.id === planId;
    if (plan.isActive === shouldBeActive) continue;
    const detail = await loadPlanDetail(plan.id);
    if (!detail) continue;
    await savePlanDetail({
      ...detail,
      isActive: shouldBeActive,
      updatedAt: timestamp,
    });
  }
}

export async function updatePlanInfo(
  planId: string,
  patch: Partial<Pick<WorkoutPlan, 'name' | 'description' | 'notes'>>,
): Promise<void> {
  const detail = await loadPlanDetail(planId);
  if (!detail) throw new Error('La rutina no existe.');
  await savePlanDetail({
    ...detail,
    ...patch,
    name: patch.name !== undefined ? patch.name.trim() || detail.name : detail.name,
    updatedAt: nowIso(),
  });
}

export async function addPlanDay(planId: string, name: string): Promise<string> {
  const detail = await loadPlanDetail(planId);
  if (!detail) throw new Error('La rutina no existe.');
  const dayId = newId();
  detail.days.push({
    id: dayId,
    planId,
    name: name.trim() || `Día ${detail.days.length + 1}`,
    position: detail.days.length,
    notes: '',
    exercises: [],
  });
  detail.updatedAt = nowIso();
  await savePlanDetail(detail);
  return dayId;
}

export async function renamePlanDay(planId: string, dayId: string, name: string): Promise<void> {
  const detail = await loadPlanDetail(planId);
  if (!detail) throw new Error('La rutina no existe.');
  const day = detail.days.find((item) => item.id === dayId);
  if (!day) throw new Error('El día no existe.');
  day.name = name.trim() || day.name;
  detail.updatedAt = nowIso();
  await savePlanDetail(detail);
}

export async function deletePlanDay(planId: string, dayId: string): Promise<void> {
  const detail = await loadPlanDetail(planId);
  if (!detail) throw new Error('La rutina no existe.');
  detail.days = detail.days
    .filter((day) => day.id !== dayId)
    .map((day, index) => ({ ...day, position: index }));
  detail.updatedAt = nowIso();
  await savePlanDetail(detail);
}

export async function movePlanDay(
  planId: string,
  dayId: string,
  direction: -1 | 1,
): Promise<void> {
  const detail = await loadPlanDetail(planId);
  if (!detail) throw new Error('La rutina no existe.');
  const index = detail.days.findIndex((day) => day.id === dayId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= detail.days.length) return;
  const [moved] = detail.days.splice(index, 1);
  if (moved) detail.days.splice(target, 0, moved);
  detail.days.forEach((day, dayIndex) => {
    day.position = dayIndex;
  });
  detail.updatedAt = nowIso();
  await savePlanDetail(detail);
}

export async function addPlanExercise(
  planId: string,
  dayId: string,
  exercise: Exercise,
): Promise<void> {
  const detail = await loadPlanDetail(planId);
  if (!detail) throw new Error('La rutina no existe.');
  const day = detail.days.find((item) => item.id === dayId);
  if (!day) throw new Error('El día no existe.');
  day.exercises.push({
    id: newId(),
    planDayId: dayId,
    exerciseId: exercise.source === 'global' ? exercise.id : null,
    userExerciseId: exercise.source === 'custom' ? exercise.id : null,
    nameSnapshot: exercise.name,
    primaryMuscle: exercise.primaryMuscle,
    position: day.exercises.length,
    targetSets: 3,
    targetReps: '8-12',
    restSeconds: 90,
    notes: '',
    exercise,
  });
  detail.updatedAt = nowIso();
  await savePlanDetail(detail);
}

export async function updatePlanExercise(
  planId: string,
  planExerciseId: string,
  patch: Partial<{
    targetSets: number;
    targetReps: string;
    restSeconds: number;
    notes: string;
  }>,
): Promise<void> {
  const detail = await loadPlanDetail(planId);
  if (!detail) throw new Error('La rutina no existe.');
  for (const day of detail.days) {
    const item = day.exercises.find((exercise) => exercise.id === planExerciseId);
    if (item) {
      Object.assign(item, patch);
      detail.updatedAt = nowIso();
      await savePlanDetail(detail);
      return;
    }
  }
  throw new Error('El ejercicio de la rutina no existe.');
}

export async function deletePlanExercise(
  planId: string,
  planExerciseId: string,
): Promise<void> {
  const detail = await loadPlanDetail(planId);
  if (!detail) throw new Error('La rutina no existe.');
  for (const day of detail.days) {
    const index = day.exercises.findIndex((exercise) => exercise.id === planExerciseId);
    if (index >= 0) {
      day.exercises.splice(index, 1);
      day.exercises.forEach((item, itemIndex) => {
        item.position = itemIndex;
      });
      detail.updatedAt = nowIso();
      await savePlanDetail(detail);
      return;
    }
  }
}

export async function movePlanExercise(
  planId: string,
  planExerciseId: string,
  direction: -1 | 1,
): Promise<void> {
  const detail = await loadPlanDetail(planId);
  if (!detail) throw new Error('La rutina no existe.');
  for (const day of detail.days) {
    const index = day.exercises.findIndex((exercise) => exercise.id === planExerciseId);
    if (index < 0) continue;
    const target = index + direction;
    if (target < 0 || target >= day.exercises.length) return;
    const [moved] = day.exercises.splice(index, 1);
    if (moved) day.exercises.splice(target, 0, moved);
    day.exercises.forEach((item, itemIndex) => {
      item.position = itemIndex;
    });
    detail.updatedAt = nowIso();
    await savePlanDetail(detail);
    return;
  }
}
