import { z } from 'zod';

export const emailSchema = z
  .string()
  .min(1, 'Introduce tu correo electrónico.')
  .email('Introduce un correo electrónico válido.')
  .max(254, 'El correo es demasiado largo.');

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña no puede superar los 72 caracteres.')
  .regex(/[A-Za-z]/, 'Incluye al menos una letra.')
  .regex(/[0-9]/, 'Incluye al menos un número.');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Introduce tu contraseña.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres.')
      .max(60, 'El nombre no puede superar los 60 caracteres.'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Repite la contraseña.'),
    acceptTerms: z.boolean().refine((value) => value === true, {
      message: 'Debes aceptar las condiciones para crear la cuenta.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Repite la contraseña.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const setupSchema = z.object({
  url: z
    .string()
    .min(1, 'Introduce la URL del proyecto.')
    .url('Introduce una URL válida.')
    .refine((value) => value.startsWith('https://'), 'La URL debe usar HTTPS.'),
  anonKey: z.string().min(20, 'Introduce la clave pública del proyecto.'),
});
export type SetupFormValues = z.infer<typeof setupSchema>;
