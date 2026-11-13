export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'full_body',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
  'other',
] as const;

export type Equipment = (typeof EQUIPMENT)[number];

export const SET_TYPES = [
  'warmup',
  'effective',
  'approximation',
  'drop',
  'failure',
  'custom',
] as const;

export type SetType = (typeof SET_TYPES)[number];

export const WORKOUT_STATUSES = [
  'scheduled',
  'in_progress',
  'paused',
  'finished',
  'cancelled',
] as const;

export type WorkoutStatus = (typeof WORKOUT_STATUSES)[number];

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const WEIGHT_UNITS = ['kg', 'lb'] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

export type Theme = 'dark' | 'light';
export type DateFormat = 'dd/MM/yyyy' | 'yyyy-MM-dd' | 'MM/dd/yyyy';
export type ExerciseSource = 'global' | 'custom';
export type NoteType = 'general' | 'workout' | 'routine' | 'exercise';
export type AppMode = 'cloud' | 'local';

export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  userId: string;
  weightUnit: WeightUnit;
  theme: Theme;
  restSeconds: number;
  soundEnabled: boolean;
  autoRest: boolean;
  dateFormat: DateFormat;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  instructions: string;
  imageUrl: string | null;
  difficulty: Difficulty | null;
  source: ExerciseSource;
  /** Presente sólo en ejercicios personalizados. */
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseInput {
  name: string;
  description: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  instructions: string;
  difficulty: Difficulty | null;
}

export interface WorkoutPlan {
  id: string;
  userId: string;
  name: string;
  description: string;
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanDay {
  id: string;
  planId: string;
  name: string;
  position: number;
  notes: string;
}

export interface PlanExercise {
  id: string;
  planDayId: string;
  exerciseId: string | null;
  userExerciseId: string | null;
  nameSnapshot: string;
  primaryMuscle: MuscleGroup;
  position: number;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  notes: string;
}

export interface PlanExerciseWithExercise extends PlanExercise {
  exercise: Exercise | null;
}

export interface PlanDayWithExercises extends PlanDay {
  exercises: PlanExerciseWithExercise[];
}

export interface WorkoutPlanDetail extends WorkoutPlan {
  days: PlanDayWithExercises[];
}

export interface Workout {
  id: string;
  userId: string;
  planId: string | null;
  planDayId: string | null;
  name: string;
  status: WorkoutStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  durationSeconds: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string | null;
  userExerciseId: string | null;
  nameSnapshot: string;
  primaryMuscle: MuscleGroup;
  position: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSet {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  weightUnit: WeightUnit;
  setType: SetType;
  restSeconds: number;
  isCompleted: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutExerciseWithSets extends WorkoutExercise {
  sets: WorkoutSet[];
  exercise: Exercise | null;
}

export interface WorkoutDetail extends Workout {
  exercises: WorkoutExerciseWithSets[];
  planName: string | null;
}

export interface WorkoutSnapshot {
  workout: Workout;
  exercises: Array<WorkoutExercise & { sets: WorkoutSet[] }>;
}

export interface Favorite {
  id: string;
  userId: string;
  exerciseId: string | null;
  userExerciseId: string | null;
  exerciseName: string;
  createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  body: string;
  noteType: NoteType;
  workoutId: string | null;
  planId: string | null;
  exerciseId: string | null;
  userExerciseId: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RestDay {
  id: string;
  userId: string;
  date: string;
  notes: string;
  createdAt: string;
}

export type PendingEntity =
  | 'workout'
  | 'plan'
  | 'note'
  | 'restDay'
  | 'favorite'
  | 'customExercise'
  | 'settings'
  | 'profile';

export interface PendingOperation {
  id: string;
  entity: PendingEntity;
  operation: 'upsert' | 'delete';
  entityId: string;
  payload: unknown;
  createdAt: string;
  attempts: number;
  lastError: string | null;
}

export interface LocalAccount {
  id: string;
  email: string;
  displayName: string;
  salt: string;
  passwordHash: string;
  iterations: number;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'pending' | 'error' | 'local';

export interface SyncState {
  status: SyncStatus;
  online: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  error: string | null;
}

export interface BackupPayload {
  app: 'HECOFIT';
  version: 1;
  exportedAt: string;
  mode: AppMode;
  profile: Profile | null;
  settings: UserSettings | null;
  exercises: Exercise[];
  plans: WorkoutPlanDetail[];
  workouts: WorkoutSnapshot[];
  favorites: Favorite[];
  notes: Note[];
  restDays: RestDay[];
}
