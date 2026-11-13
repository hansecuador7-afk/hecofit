import type {
  DateFormat,
  Difficulty,
  Equipment,
  Exercise,
  Favorite,
  MuscleGroup,
  Note,
  NoteType,
  PlanDay,
  PlanExercise,
  Profile,
  RestDay,
  SetType,
  Theme,
  UserSettings,
  WeightUnit,
  Workout,
  WorkoutExercise,
  WorkoutPlan,
  WorkoutSet,
  WorkoutStatus,
} from '@/types/models';

export interface ProfileRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettingsRow {
  user_id: string;
  weight_unit: WeightUnit;
  theme: Theme;
  rest_seconds: number;
  sound_enabled: boolean;
  auto_rest: boolean;
  date_format: DateFormat;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExerciseRow {
  id: string;
  name: string;
  description: string;
  primary_muscle: MuscleGroup;
  secondary_muscles: MuscleGroup[] | null;
  equipment: Equipment;
  instructions: string;
  image_url: string | null;
  difficulty: Difficulty | null;
  created_at: string;
}

export interface UserExerciseRow extends ExerciseRow {
  user_id: string;
  updated_at: string;
}

export interface PlanRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PlanDayRow {
  id: string;
  plan_id: string;
  name: string;
  position: number;
  notes: string;
}

export interface PlanExerciseRow {
  id: string;
  plan_day_id: string;
  exercise_id: string | null;
  user_exercise_id: string | null;
  name_snapshot: string;
  primary_muscle: MuscleGroup;
  position: number;
  target_sets: number;
  target_reps: string;
  rest_seconds: number;
  notes: string;
}

export interface WorkoutRow {
  id: string;
  user_id: string;
  plan_id: string | null;
  plan_day_id: string | null;
  name: string;
  status: WorkoutStatus;
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExerciseRow {
  id: string;
  workout_id: string;
  exercise_id: string | null;
  user_exercise_id: string | null;
  name_snapshot: string;
  primary_muscle: MuscleGroup;
  position: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface WorkoutSetRow {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  weight: number | string;
  reps: number;
  weight_unit: WeightUnit;
  set_type: SetType;
  rest_seconds: number;
  is_completed: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface FavoriteRow {
  id: string;
  user_id: string;
  exercise_id: string | null;
  user_exercise_id: string | null;
  exercise_name: string;
  created_at: string;
}

export interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  note_type: NoteType;
  workout_id: string | null;
  plan_id: string | null;
  exercise_id: string | null;
  user_exercise_id: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestDayRow {
  id: string;
  user_id: string;
  date: string;
  notes: string;
  created_at: string;
}

export function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSettings(row: SettingsRow): UserSettings {
  return {
    userId: row.user_id,
    weightUnit: row.weight_unit,
    theme: row.theme,
    restSeconds: row.rest_seconds,
    soundEnabled: row.sound_enabled,
    autoRest: row.auto_rest,
    dateFormat: row.date_format,
    notificationsEnabled: row.notifications_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapGlobalExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    primaryMuscle: row.primary_muscle,
    secondaryMuscles: row.secondary_muscles ?? [],
    equipment: row.equipment,
    instructions: row.instructions,
    imageUrl: row.image_url,
    difficulty: row.difficulty,
    source: 'global',
    userId: null,
    createdAt: row.created_at,
    updatedAt: row.created_at,
  };
}

export function mapCustomExercise(row: UserExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    primaryMuscle: row.primary_muscle,
    secondaryMuscles: row.secondary_muscles ?? [],
    equipment: row.equipment,
    instructions: row.instructions,
    imageUrl: row.image_url,
    difficulty: row.difficulty,
    source: 'custom',
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPlan(row: PlanRow): WorkoutPlan {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPlanDay(row: PlanDayRow): PlanDay {
  return {
    id: row.id,
    planId: row.plan_id,
    name: row.name,
    position: row.position,
    notes: row.notes,
  };
}

export function mapPlanExercise(row: PlanExerciseRow): PlanExercise {
  return {
    id: row.id,
    planDayId: row.plan_day_id,
    exerciseId: row.exercise_id,
    userExerciseId: row.user_exercise_id,
    nameSnapshot: row.name_snapshot,
    primaryMuscle: row.primary_muscle,
    position: row.position,
    targetSets: row.target_sets,
    targetReps: row.target_reps,
    restSeconds: row.rest_seconds,
    notes: row.notes,
  };
}

export function mapWorkout(row: WorkoutRow): Workout {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    planDayId: row.plan_day_id,
    name: row.name,
    status: row.status,
    scheduledAt: row.scheduled_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationSeconds: row.duration_seconds,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapWorkoutExercise(row: WorkoutExerciseRow): WorkoutExercise {
  return {
    id: row.id,
    workoutId: row.workout_id,
    exerciseId: row.exercise_id,
    userExerciseId: row.user_exercise_id,
    nameSnapshot: row.name_snapshot,
    primaryMuscle: row.primary_muscle,
    position: row.position,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapWorkoutSet(row: WorkoutSetRow): WorkoutSet {
  return {
    id: row.id,
    workoutExerciseId: row.workout_exercise_id,
    setNumber: row.set_number,
    weight: Number(row.weight),
    reps: row.reps,
    weightUnit: row.weight_unit,
    setType: row.set_type,
    restSeconds: row.rest_seconds,
    isCompleted: row.is_completed,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapFavorite(row: FavoriteRow): Favorite {
  return {
    id: row.id,
    userId: row.user_id,
    exerciseId: row.exercise_id,
    userExerciseId: row.user_exercise_id,
    exerciseName: row.exercise_name,
    createdAt: row.created_at,
  };
}

export function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    noteType: row.note_type,
    workoutId: row.workout_id,
    planId: row.plan_id,
    exerciseId: row.exercise_id,
    userExerciseId: row.user_exercise_id,
    pinned: row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRestDay(row: RestDayRow): RestDay {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

/* ----------------------------- Escrituras ----------------------------- */

export function planToRow(plan: WorkoutPlan): Omit<PlanRow, 'user_id'> {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    is_active: plan.isActive,
    notes: plan.notes,
    created_at: plan.createdAt,
    updated_at: plan.updatedAt,
  };
}

export function planDayToRow(day: PlanDay): PlanDayRow {
  return {
    id: day.id,
    plan_id: day.planId,
    name: day.name,
    position: day.position,
    notes: day.notes,
  };
}

export function planExerciseToRow(item: PlanExercise): PlanExerciseRow {
  return {
    id: item.id,
    plan_day_id: item.planDayId,
    exercise_id: item.exerciseId,
    user_exercise_id: item.userExerciseId,
    name_snapshot: item.nameSnapshot,
    primary_muscle: item.primaryMuscle,
    position: item.position,
    target_sets: item.targetSets,
    target_reps: item.targetReps,
    rest_seconds: item.restSeconds,
    notes: item.notes,
  };
}

export function workoutToRow(workout: Workout): Omit<WorkoutRow, 'user_id'> {
  return {
    id: workout.id,
    plan_id: workout.planId,
    plan_day_id: workout.planDayId,
    name: workout.name,
    status: workout.status,
    scheduled_at: workout.scheduledAt,
    started_at: workout.startedAt,
    finished_at: workout.finishedAt,
    duration_seconds: workout.durationSeconds,
    notes: workout.notes,
    created_at: workout.createdAt,
    updated_at: workout.updatedAt,
  };
}

export function workoutExerciseToRow(item: WorkoutExercise): WorkoutExerciseRow {
  return {
    id: item.id,
    workout_id: item.workoutId,
    exercise_id: item.exerciseId,
    user_exercise_id: item.userExerciseId,
    name_snapshot: item.nameSnapshot,
    primary_muscle: item.primaryMuscle,
    position: item.position,
    notes: item.notes,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export function workoutSetToRow(item: WorkoutSet): WorkoutSetRow {
  return {
    id: item.id,
    workout_exercise_id: item.workoutExerciseId,
    set_number: item.setNumber,
    weight: item.weight,
    reps: item.reps,
    weight_unit: item.weightUnit,
    set_type: item.setType,
    rest_seconds: item.restSeconds,
    is_completed: item.isCompleted,
    notes: item.notes,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export function noteToRow(note: Note): Omit<NoteRow, 'user_id'> {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    note_type: note.noteType,
    workout_id: note.workoutId,
    plan_id: note.planId,
    exercise_id: note.exerciseId,
    user_exercise_id: note.userExerciseId,
    pinned: note.pinned,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
  };
}

export function favoriteToRow(favorite: Favorite): Omit<FavoriteRow, 'user_id'> {
  return {
    id: favorite.id,
    exercise_id: favorite.exerciseId,
    user_exercise_id: favorite.userExerciseId,
    exercise_name: favorite.exerciseName,
    created_at: favorite.createdAt,
  };
}

export function restDayToRow(restDay: RestDay): Omit<RestDayRow, 'user_id'> {
  return {
    id: restDay.id,
    date: restDay.date,
    notes: restDay.notes,
    created_at: restDay.createdAt,
  };
}

export function customExerciseToRow(exercise: Exercise): Omit<UserExerciseRow, 'user_id'> {
  return {
    id: exercise.id,
    name: exercise.name,
    description: exercise.description,
    primary_muscle: exercise.primaryMuscle,
    secondary_muscles: exercise.secondaryMuscles,
    equipment: exercise.equipment,
    instructions: exercise.instructions,
    image_url: exercise.imageUrl,
    difficulty: exercise.difficulty,
    created_at: exercise.createdAt,
    updated_at: exercise.updatedAt,
  };
}

export function settingsToRow(settings: UserSettings): Omit<SettingsRow, 'user_id'> {
  return {
    weight_unit: settings.weightUnit,
    theme: settings.theme,
    rest_seconds: settings.restSeconds,
    sound_enabled: settings.soundEnabled,
    auto_rest: settings.autoRest,
    date_format: settings.dateFormat,
    notifications_enabled: settings.notificationsEnabled,
    created_at: settings.createdAt,
    updated_at: settings.updatedAt,
  };
}
