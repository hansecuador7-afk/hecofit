import { Plus, Search, SlidersHorizontal, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { CustomExerciseDialog } from '@/features/exercises/CustomExerciseDialog';
import { toggleExerciseFavorite } from '@/features/exercises/exerciseService';
import { useExercises, useFavorites } from '@/hooks/useHecoData';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import type { Equipment, Exercise, MuscleGroup } from '@/types/models';
import { EQUIPMENT, MUSCLE_GROUPS } from '@/types/models';
import { toast } from 'sonner';

export function ExercisePickerDialog({
  open,
  onOpenChange,
  onSelect,
  title = 'Añadir ejercicio',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: Exercise) => void | Promise<void>;
  title?: string;
}) {
  const exercises = useExercises();
  const favorites = useFavorites();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all');
  const [equipment, setEquipment] = useState<Equipment | 'all'>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const favoriteIds = useMemo(
    () =>
      new Set(
        favorites.flatMap((favorite) =>
          favorite.exerciseId ? [favorite.exerciseId] : favorite.userExerciseId ? [favorite.userExerciseId] : [],
        ),
      ),
    [favorites],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return exercises.filter((exercise) => {
      if (muscle !== 'all' && exercise.primaryMuscle !== muscle) return false;
      if (equipment !== 'all' && exercise.equipment !== equipment) return false;
      if (favoritesOnly && !favoriteIds.has(exercise.id)) return false;
      if (!normalized) return true;
      return (
        exercise.name.toLowerCase().includes(normalized) ||
        exercise.description.toLowerCase().includes(normalized)
      );
    });
  }, [exercises, query, muscle, equipment, favoritesOnly, favoriteIds]);

  const handleSelect = async (exercise: Exercise) => {
    setBusyId(exercise.id);
    try {
      await onSelect(exercise);
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const handleFavorite = async (exercise: Exercise) => {
    try {
      const added = await toggleExerciseFavorite(exercise);
      toast.success(added ? 'Añadido a favoritos' : 'Eliminado de favoritos');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="lg" className="flex max-h-[88dvh] flex-col overflow-hidden p-0">
          <div className="border-b border-border p-5 pb-4">
            <DialogHeader className="mb-4">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                Busca en el catálogo o utiliza tus ejercicios personalizados.
              </DialogDescription>
            </DialogHeader>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre o descripción…"
                className="pl-10"
                autoFocus
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Select value={muscle} onChange={(event) => setMuscle(event.target.value as MuscleGroup | 'all')}>
                <option value="all">Todos los músculos</option>
                {MUSCLE_GROUPS.map((item) => (
                  <option key={item} value={item}>
                    {MUSCLE_LABELS[item]}
                  </option>
                ))}
              </Select>
              <Select
                value={equipment}
                onChange={(event) => setEquipment(event.target.value as Equipment | 'all')}
              >
                <option value="all">Todo el equipamiento</option>
                {EQUIPMENT.map((item) => (
                  <option key={item} value={item}>
                    {EQUIPMENT_LABELS[item]}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant={favoritesOnly ? 'default' : 'secondary'}
                className="col-span-2 sm:col-span-1"
                onClick={() => setFavoritesOnly((value) => !value)}
              >
                <Star className={cn('h-4 w-4', favoritesOnly && 'fill-current')} />
                Favoritos
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between px-5 py-2.5 text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-3 w-3" /> {filtered.length} ejercicios
            </span>
            <span className="hidden sm:inline">Toca un ejercicio para añadirlo</span>
          </div>

          <div className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4">
            {filtered.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Search className="mx-auto h-8 w-8 text-muted/50" />
                <p className="mt-3 text-sm font-medium">No hay ejercicios con esos filtros</p>
                <p className="mt-1 text-xs text-muted">Prueba otra búsqueda o crea uno personalizado.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map((exercise) => {
                  const isFavorite = favoriteIds.has(exercise.id);
                  return (
                    <div
                      key={exercise.id}
                      className="group flex items-center gap-2 rounded-xl p-2 transition-colors hover:bg-surface/70"
                    >
                      <button
                        type="button"
                        onClick={() => void handleSelect(exercise)}
                        disabled={busyId === exercise.id}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1.5 text-left"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-[11px] font-bold text-accent">
                          {exercise.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-sm font-medium">{exercise.name}</p>
                            {exercise.source === 'custom' && (
                              <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">
                                Propio
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-muted">
                            {MUSCLE_LABELS[exercise.primaryMuscle]} · {EQUIPMENT_LABELS[exercise.equipment]}
                          </p>
                        </div>
                        <Plus className="h-4 w-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleFavorite(exercise)}
                        aria-label={isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-surface',
                          isFavorite ? 'text-warning' : 'text-muted/50',
                        )}
                      >
                        <Star className={cn('h-4 w-4', isFavorite && 'fill-current')} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            <Button type="button" variant="secondary" className="w-full" onClick={() => setCustomOpen(true)}>
              <Plus className="h-4 w-4" /> Crear ejercicio personalizado
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CustomExerciseDialog
        open={customOpen}
        onOpenChange={setCustomOpen}
        onSaved={(exercise) => {
          void handleSelect(exercise);
        }}
      />
    </>
  );
}
