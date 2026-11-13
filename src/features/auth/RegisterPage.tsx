import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CheckCircle2, HardDrive, Mail, MailCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthLayout } from '@/features/auth/auth-layout';
import { useAuth } from '@/features/auth/AuthProvider';
import { PasswordField } from '@/features/auth/password-field';
import { registerSchema, type RegisterFormValues } from '@/features/auth/schemas';
import { Button } from '@/components/ui/button';
import { Checkbox, FieldError, Input, Label } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/errors';

export default function RegisterPage() {
  const { signUp, mode } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const password = watch('password');

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError(null);
    try {
      const result = await signUp({
        displayName: values.displayName.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      if (result.needsConfirmation) {
        setRegisteredEmail(values.email.trim());
        setNeedsConfirmation(true);
        return;
      }
      toast.success('Tu cuenta está lista. ¡A entrenar!');
      navigate('/', { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  if (needsConfirmation) {
    return (
      <AuthLayout
        eyebrow="Casi listo"
        title="Verifica tu correo"
        subtitle="Hemos enviado un enlace de confirmación para activar tu cuenta."
      >
        <div className="rounded-2xl border border-success/20 bg-success/[0.06] p-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <MailCheck className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-semibold">Revisa {registeredEmail}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Pulsa el enlace del correo para confirmar tu cuenta. Después podrás iniciar sesión y
            empezar a registrar entrenamientos. Si no lo ves, revisa la carpeta de spam.
          </p>
        </div>
        <Button asChild className="mt-5 w-full" size="lg">
          <Link to="/login">Volver a iniciar sesión</Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Crear cuenta"
      title="Empieza a medir lo que importa"
      subtitle="Tu historial, tus rutinas y tus récords en un único lugar."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            Iniciar sesión
          </Link>
        </>
      }
    >
      {mode === 'local' && (
        <div className="mb-5 flex gap-3 rounded-xl border border-border bg-surface/50 p-3.5">
          <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div className="text-xs leading-relaxed text-muted">
            <p className="font-semibold text-foreground">Cuenta local, sin nube</p>
            <p className="mt-0.5">
              Se creará en este navegador. Podrás exportar una copia y conectar Supabase cuando
              quieras para usarla en varios dispositivos.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Nombre visible</Label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              id="displayName"
              autoComplete="nickname"
              placeholder="Cómo quieres aparecer"
              className="pl-10"
              aria-invalid={Boolean(errors.displayName)}
              {...register('displayName')}
            />
          </div>
          <FieldError>{errors.displayName?.message}</FieldError>
        </div>

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
          <Label htmlFor="password">Contraseña</Label>
          <PasswordField
            id="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
          <FieldError>{errors.password?.message}</FieldError>
          {password && (
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[
                { label: '8+ caracteres', ok: password.length >= 8 },
                { label: 'Una letra', ok: /[A-Za-z]/.test(password) },
                { label: 'Un número', ok: /[0-9]/.test(password) },
              ].map((rule) => (
                <span
                  key={rule.label}
                  className={`flex items-center gap-1 text-[10px] font-medium ${
                    rule.ok ? 'text-success' : 'text-muted'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" /> {rule.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Repite la contraseña</Label>
          <PasswordField
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Repite tu contraseña"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register('confirmPassword')}
          />
          <FieldError>{errors.confirmPassword?.message}</FieldError>
        </div>

        <div className="flex items-start gap-2.5 pt-1">
          <Checkbox id="acceptTerms" className="mt-0.5" {...register('acceptTerms')} />
          <Label htmlFor="acceptTerms" className="text-xs font-normal leading-relaxed text-muted">
            Acepto las condiciones de uso y el tratamiento de mis datos para gestionar mi cuenta y mi
            progreso de entrenamiento.
          </Label>
        </div>
        <FieldError>{errors.acceptTerms?.message}</FieldError>

        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-danger"
          >
            {formError}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Crear mi cuenta <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </AuthLayout>
  );
}
