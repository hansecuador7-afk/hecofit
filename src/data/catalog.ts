import type { Difficulty, Equipment, Exercise, MuscleGroup } from '@/types/models';
import seed from './exercises.seed.json';

interface SeedExercise {
  id: string;
  name: string;
  description: string;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string;
  instructions: string;
  image_url: string | null;
  difficulty: string | null;
}

const CATALOG_TIMESTAMP = '2026-01-01T00:00:00.000Z';

export const GLOBAL_EXERCISES: Exercise[] = (seed as SeedExercise[]).map((item) => ({
  id: item.id,
  name: item.name,
  description: item.description,
  primaryMuscle: item.primary_muscle as MuscleGroup,
  secondaryMuscles: item.secondary_muscles as MuscleGroup[],
  equipment: item.equipment as Equipment,
  instructions: item.instructions,
  imageUrl: item.image_url,
  difficulty: item.difficulty as Difficulty | null,
  source: 'global',
  userId: null,
  createdAt: CATALOG_TIMESTAMP,
  updatedAt: CATALOG_TIMESTAMP,
}));
