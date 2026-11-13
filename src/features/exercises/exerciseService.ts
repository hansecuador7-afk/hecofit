import { getActiveUserId, getDb } from '@/database/db';
import { newId, nowIso } from '@/lib/utils';
import { deleteFavorite, saveFavorite } from '@/services/sync';
import type { Exercise, Favorite } from '@/types/models';

export async function findFavoriteForExercise(exercise: Exercise): Promise<Favorite | null> {
  const favorites = await getDb().favorites.toArray();
  return (
    favorites.find((favorite) =>
      exercise.source === 'global'
        ? favorite.exerciseId === exercise.id
        : favorite.userExerciseId === exercise.id,
    ) ?? null
  );
}

export async function toggleExerciseFavorite(exercise: Exercise): Promise<boolean> {
  if (!exercise) return false;
  const existing = await findFavoriteForExercise(exercise);
  if (existing) {
    await deleteFavorite(existing.id);
    return false;
  }
  const favorite: Favorite = {
    id: newId(),
    userId: getActiveUserId() ?? exercise.userId ?? '',
    exerciseId: exercise.source === 'global' ? exercise.id : null,
    userExerciseId: exercise.source === 'custom' ? exercise.id : null,
    exerciseName: exercise.name,
    createdAt: nowIso(),
  };
  await saveFavorite(favorite);
  return true;
}
