import type {
  DateFormat,
  Difficulty,
  Equipment,
  MuscleGroup,
  SetType,
  WeightUnit,
  WorkoutStatus,
} from '@/types/models';

export const APP_NAME = 'HECOFIT';
export const APP_TAGLINE = 'Entrenamiento inteligente';
export const DEFAULT_REST_SECONDS = 90;
export const MIN_REST_SECONDS = 15;
export const MAX_REST_SECONDS = 600;
export const HISTORY_PAGE_SIZE = 12;
export const WEEKLY_STREAK_LOOKBACK = 520;
export const MAX_WEIGHT = 2000;
export const MAX_REPS = 1000;

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebrazos',
  abs: 'Abdomen',
  quads: 'Cuádriceps',
  hamstrings: 'Isquiotibiales',
  glutes: 'Glúteos',
  calves: 'Pantorrillas',
  full_body: 'Cuerpo completo',
};

export const MUSCLE_SHORT_LABELS: Record<MuscleGroup, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombro',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebrazo',
  abs: 'Abdomen',
  quads: 'Cuádriceps',
  hamstrings: 'Isquio',
  glutes: 'Glúteos',
  calves: 'Pantorrilla',
  full_body: 'Full body',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuernas',
  machine: 'Máquina',
  cable: 'Polea',
  bodyweight: 'Peso corporal',
  kettlebell: 'Kettlebell',
  band: 'Banda elástica',
  other: 'Otro',
};

export const SET_TYPE_LABELS: Record<SetType, string> = {
  warmup: 'Calentamiento',
  effective: 'Efectiva',
  approximation: 'Aproximación',
  drop: 'Descarga',
  failure: 'Fallo muscular',
  custom: 'Personalizada',
};

export const WORKOUT_STATUS_LABELS: Record<WorkoutStatus, string> = {
  scheduled: 'Programado',
  in_progress: 'En curso',
  paused: 'Pausado',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

export const WEIGHT_UNIT_LABELS: Record<WeightUnit, string> = {
  kg: 'kilogramos (kg)',
  lb: 'libras (lb)',
};

export const DATE_FORMAT_OPTIONS: Array<{ value: DateFormat; label: string }> = [
  { value: 'dd/MM/yyyy', label: '31/12/2026 (DD/MM/AAAA)' },
  { value: 'yyyy-MM-dd', label: '2026-12-31 (AAAA-MM-DD)' },
  { value: 'MM/dd/yyyy', label: '12/31/2026 (MM/DD/AAAA)' },
];

export const CHART_COLORS = {
  accent: '#FF6B35',
  accentSoft: '#FF8A5B',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#38BDF8',
  violet: '#A78BFA',
  muted: '#929BA8',
};

export const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  chest: '#FF6B35',
  back: '#38BDF8',
  shoulders: '#A78BFA',
  biceps: '#22C55E',
  triceps: '#F59E0B',
  forearms: '#F472B6',
  abs: '#2DD4BF',
  quads: '#FB7185',
  hamstrings: '#818CF8',
  glutes: '#FACC15',
  calves: '#34D399',
  full_body: '#94A3B8',
};

export const REST_PRESETS = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300];

export const LB_PER_KG = 2.2046226218;

export const QUICK_NOTES = [
  'Buena técnica',
  'Subir carga la próxima sesión',
  'Molestia leve',
  'Series al fallo',
  'Descanso corto',
];
