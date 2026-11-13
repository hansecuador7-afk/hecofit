import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldError, Input, Label, Select, Textarea } from '@/components/ui/input';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  customExerciseSchema,
  type CustomExerciseFormValues,
} from '@/features/exercises/schemas';
import {
  DIFFICULTY_LABELS,
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
} from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import { newId, nowIso } from '@/lib/utils';
import { saveCustomExercise } from '@/services/sync';
import {
  DIFFICULTIES,
  EQUIPMENT,
  MUSCLE_GROUPS,
  type Difficulty,
  type Exercise,
  type MuscleGroup,
} from '@/types/models';

export function CustomExerciseDialog({
  open,
  onOpenChange,
  exercise,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise?: Exercise | null;
  onSaved?: (exercise: Exercise) => void;
}) {
  const { user } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const isEditing = Boolean(exercise);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomExerciseFormValues>({
    resolver: zodResolver(customExerciseSchema),
    defaultValues: {
      name: '',
      description: '',
      primaryMuscle: 'chest',
      secondaryMuscles: [],
      equipment: 'barbell',
      instructions: '',
      difficulty: '',
    },
  });

  const primaryMuscle = watch('primaryMuscle');
  const secondaryMuscles = watch('secondaryMuscles');

  useEffect(() => {
    if (!open) return;
    reset({
      name: exercise?.name ?? '',
      description: exercise?.description ?? '',
      primaryMuscle: exercise?.primaryMuscle ?? 'chest',
      secondaryMuscles: exercise?.secondaryMuscles ?? [],
      equipment: exercise?.equipment ?? 'barbell',
      instructions: exercise?.instructions ?? '',
      difficulty: exercise?.difficulty ?? '',
    });
    setFormError(null);
  }, [open, exercise, reset]);

  const toggleSecondary = (muscle: MuscleGroup) => {
    const current = secondaryMuscles ?? [];
    if (current.includes(muscle)) {
      setValue(
        'secondaryMuscles',
        current.filter((item) => item !== muscle),
        { shouldValidate: true },
      );
    } else {
      setValue('secondaryMuscles', [...current, muscle], { shouldValidate: true });
    }
  };

  const onSubmit = async (values: CustomExerciseFormValues) => {
    if (!user) return;
    setFormError(null);
    try {
      const timestamp = nowIso();
      const saved: Exercise = {
        id: exercise?.id ?? newId(),
        name: values.name.trim(),
        description: values.description.trim(),
        primaryMuscle: values.primaryMuscle,
        secondaryMuscles: values.secondaryMuscles.filter(
          (muscle) => muscle !== values.primaryMuscle,
        ),
        equipment: values.equipment,
        instructions: values.instructions.trim(),
        imageUrl: exercise?.imageUrl ?? null,
        difficulty: (values.difficulty || null) as Difficulty | null,
        source: 'custom',
        userId: user.id,
        createdAt: exercise?.createdAt ?? timestamp,
        updatedAt: timestamp,
      };
      await saveCustomExercise(saved);
      toast.success(isEditing ? 'Ejercicio actualizado' : 'Ejercicio personalizado creado');
      onSaved?.(saved);
      onOpenChange(false);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar ejercicio' : 'Nuevo ejercicio personalizado'}</DialogTitle>
          <DialogDescription>
            Añade un ejercicio propio a tu biblioteca. Solo tú podrás verlo y utilizarlo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="custom-name">Nombre *</Label>
            <Input id="custom-name" placeholder="Ej. Press inclinado en máquina" {...register('name')} />
            <FieldError>{errors.name?.message}</FieldError>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="custom-muscle">Grupo muscular principal *</Label>
              <Select id="custom-muscle" {...register('primaryMuscle')}>
                {MUSCLE_GROUPS.map((muscle) => (
                  <option key={muscle} value={muscle}>
                    {MUSCLE_LABELS[muscle]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-equipment">Equipamiento *</Label>
              <Select id="custom-equipment" {...register('equipment')}>
                {EQUIPMENT.map((equipment) => (
                  <option key={equipment} value={equipment}>
                    {EQUIPMENT_LABELS[equipment]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Músculos secundarios</Label>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.filter((muscle) => muscle !== primaryMuscle).map((muscle) => {
                const active = secondaryMuscles?.includes(muscle);
                return (
                  <button
                    key={muscle}
                    type="button"
                    onClick={() => toggleSecondary(muscle)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      active
                        ? 'border-accent/30 bg-accent/10 text-accent'
                        : 'border-border bg-surface/40 text-muted hover:text-foreground'
                    }`}
                  >
                    {MUSCLE_LABELS[muscle]}
                  </button>
                );
              })}
            </div>
            <FieldError>{errors.secondaryMuscles?.message}</FieldError>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custom-difficulty">Dificultad</Label>
            <Select id="custom-difficulty" {...register('difficulty')}>
              <option value="">Sin especificar</option>
              {DIFFICULTIES.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {DIFFICULTY_LABELS[difficulty]}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custom-description">Descripción</Label>
            <Textarea
              id="custom-description"
              rows={2}
              placeholder="Breve descripción del ejercicio"
              {...register('description')}
            />
            <FieldError>{errors.description?.message}</FieldError>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custom-instructions">Instrucciones técnicas</Label>
            <Textarea
              id="custom-instructions"
              rows={4}
              placeholder="Postura, recorrido, errores a evitar…"
              {...register('instructions')}
            />
            <FieldError>{errors.instructions?.message}</FieldError>
          </div>

          {formError && (
            <div className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-xs text-danger">
              {formError}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEditing ? 'Guardar cambios' : <><Plus className="h-4 w-4" /> Crear ejercicio</>}
            </Button>
          </DialogFooter>
        </form>

        <Badge variant="secondary" className="mt-2">
          Biblioteca personal · Privada
        </Badge>
      </DialogContent>
    </Dialog>
  );
}
