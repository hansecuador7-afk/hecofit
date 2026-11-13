import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, HardDrive, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthLayout } from '@/features/auth/auth-layout';
import { useAuth } from '@/features/auth/AuthProvider';
import { PasswordField } from '@/features/auth/password-field';
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const { signIn, mode, cloudAvailable } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      await signIn(values.email.trim(), values.password);
      toast.success('Bienvenido de nuevo a HECOFIT');
      navigate(from, { replace: true });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo iniciar sesión');
    }
  };

  return (
    <AuthLayout
      eyebrow="Acceso"
      title="Vuelve a tu mejor versión"
      subtitle="Inicia sesión para retomar tus entrenamientos donde los dejaste."
      footer={
        <>
          ¿Aún no tienes cuenta?{' '}
          <Link to="/register" className="font-semibold text-accent hover:underline">
            Crear cuenta gratis
          </Link>
        </>
      }
    >
      {mode === 'local' && (
        <div className="mb-5 flex gap-3 rounded-xl border border-border bg-surface/50 p-3.5">
          <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div className="text-xs leading-relaxed text-muted">
            <p className="font-semibold text-foreground">Este dispositivo usa el modo local</p>
            <p className="mt-0.5">
              No hay un servidor configurado. Tu cuenta y tus datos se guardan aquí. Puedes conectar
              Supabase más tarde sin perder nada.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              className="pl-10"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
          </div>
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            {cloudAvailable ? (
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-accent hover:underline"
              >
                ¿La olvidaste?
              </Link>
            ) : (
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-muted hover:text-foreground"
              >
                Ayuda
              </Link>
            )}
          </div>
          <PasswordField
            id="password"
            autoComplete="current-password"
            placeholder="Tu contraseña"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-danger"
          >
            {formError}
          </div>
        )}

        <Button type="submit" className={cn('w-full')} size="lg" loading={isSubmitting}>
          Entrar a HECOFIT <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <div className="mt-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted/70">
          {mode === 'local' ? '100% en tu dispositivo' : 'Sincronización segura'}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
        {mode === 'local'
          ? 'Tu contraseña se protege con derivación PBKDF2. Nunca se guarda en texto plano.'
          : 'Sesión protegida por Supabase Auth. Puedes cerrarla desde tu perfil en cualquier momento.'}
      </p>
    </AuthLayout>
  );
}
