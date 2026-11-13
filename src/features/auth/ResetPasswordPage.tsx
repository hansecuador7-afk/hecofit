import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2, KeyRound, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthLayout } from '@/features/auth/auth-layout';
import { useAuth } from '@/features/auth/AuthProvider';
import { PasswordField } from '@/features/auth/password-field';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/features/auth/schemas';
import { Button } from '@/components/ui/button';
import { FieldError, Label } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/errors';

export default function ResetPasswordPage() {
  const { user, mode, recoveryMode, updatePassword, finishRecovery, loading } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setFormError(null);
    try {
      await updatePassword(values.password, values.currentPassword);
      toast.success('Contraseña actualizada correctamente');
      if (recoveryMode) {
        finishRecovery();
      } else {
        navigate('/profile?tab=seguridad');
      }
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <AuthLayout
        eyebrow="Enlace de recuperación"
        title="Este enlace no es válido"
        subtitle="Puede haber caducado o haberse abierto en otro navegador."
      >
        <div className="rounded-2xl border border-warning/20 bg-warning/[0.06] p-5">
          <ShieldAlert className="h-6 w-6 text-warning" />
          <p className="mt-3 text-sm font-semibold">Solicita un enlace nuevo</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Los enlaces de recuperación caducan por seguridad y solo pueden usarse una vez. Vuelve a
            solicitar la recuperación desde la pantalla de acceso.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <Button asChild size="lg">
            <Link to="/forgot-password">Solicitar otro enlace</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/login">
              <ArrowLeft className="h-4 w-4" /> Volver al acceso
            </Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow={recoveryMode ? 'Nueva contraseña' : 'Seguridad'}
      title={recoveryMode ? 'Crea una contraseña nueva' : 'Cambia tu contraseña'}
      subtitle="Elige una contraseña que no uses en otros servicios. Mínimo 8 caracteres, con letras y números."
    >
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-success/20 bg-success/[0.06] px-3.5 py-2.5 text-xs text-success">
        <CheckCircle2 className="h-4 w-4" /> Sesión verificada para {user.email}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {mode === 'local' && (
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Contraseña actual</Label>
            <PasswordField
              id="currentPassword"
              autoComplete="current-password"
              placeholder="Tu contraseña actual"
              aria-invalid={Boolean(errors.currentPassword)}
              {...register('currentPassword')}
            />
            <FieldError>{errors.currentPassword?.message}</FieldError>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="password">Nueva contraseña</Label>
          <PasswordField
            id="password"
            autoComplete="new-password"
            placeholder="Nueva contraseña"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Repite la nueva contraseña</Label>
          <PasswordField
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Repite la contraseña"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register('confirmPassword')}
          />
          <FieldError>{errors.confirmPassword?.message}</FieldError>
        </div>

        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-danger"
          >
            {formError}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          <KeyRound className="h-4 w-4" /> Guardar contraseña
        </Button>
      </form>

      {!recoveryMode && (
        <Button asChild variant="ghost" className="mt-3 w-full">
          <Link to="/profile">
            <ArrowLeft className="h-4 w-4" /> Volver al perfil
          </Link>
        </Button>
      )}
    </AuthLayout>
  );
}
