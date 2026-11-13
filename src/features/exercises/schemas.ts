import { z } from 'zod';
import { DIFFICULTIES, EQUIPMENT, MUSCLE_GROUPS } from '@/types/models';

export const customExerciseSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(80, 'El nombre no puede superar los 80 caracteres.'),
  description: z.string().max(1000, 'La descripción es demasiado larga.'),
  primaryMuscle: z.enum(MUSCLE_GROUPS),
  secondaryMuscles: z.array(z.enum(MUSCLE_GROUPS)).max(8, 'Selecciona como máximo 8 músculos.'),
  equipment: z.enum(EQUIPMENT),
  instructions: z.string().max(3000, 'Las instrucciones son demasiado largas.'),
  difficulty: z.enum([...DIFFICULTIES, '']),
});

export type CustomExerciseFormValues = z.infer<typeof customExerciseSchema>;
