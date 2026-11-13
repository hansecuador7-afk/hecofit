import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, HardDrive, Mail, MailCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { AuthLayout } from '@/features/auth/auth-layout';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '@/features/auth/schemas';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/errors';

export default function ForgotPasswordPage() {
  const { requestPasswordReset, cloudAvailable } = useAuth();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setFormError(null);
    try {
      await requestPasswordReset(values.email.trim());
      setSent(true);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  if (!cloudAvailable) {
    return (
      <AuthLayout
        eyebrow="Recuperación"
        title="Tu cuenta vive en este dispositivo"
        subtitle="El modo local no utiliza correo electrónico para recuperar el acceso."
      >
        <div className="rounded-2xl border border-border bg-surface/40 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <HardDrive className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-sm font-semibold">¿Olvidaste la contraseña local?</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Por seguridad, la contraseña local no se puede recuperar ni enviar por correo. Si todavía
            tienes la sesión abierta, puedes cambiarla desde Perfil → Seguridad. Tus entrenamientos
            guardados no se eliminan.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Para usar HECOFIT en varios dispositivos con recuperación por correo, conecta un proyecto
            de Supabase desde los ajustes.
          </p>
        </div>
        <div className="mt-5 flex gap-2">
          <Button asChild variant="secondary" className="flex-1">
            <Link to="/login">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Link>
          </Button>
          <Button asChild className="flex-1">
            <Link to="/setup">Conectar Supabase</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (sent) {
    return (
      <AuthLayout
        eyebrow="Correo enviado"
        title="Revisa tu bandeja de entrada"
        subtitle={`Hemos enviado instrucciones a ${getValues('email')}.`}
      >
        <div className="rounded-2xl border border-success/20 bg-success/[0.06] p-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <MailCheck className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-semibold">Enlace de recuperación enviado</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Pulsa el enlace del correo para crear una contraseña nueva. El enlace caduca por
            seguridad. Si no llega en unos minutos, revisa el spam o vuelve a intentarlo.
          </p>
        </div>
        <Button asChild variant="secondary" className="mt-5 w-full">
          <Link to="/login">Volver a iniciar sesión</Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Recuperación"
      title="Recupera tu acceso"
      subtitle="Introduce el correo con el que creaste tu cuenta y te enviaremos un enlace seguro."
      footer={
        <Link to="/login" className="font-semibold text-accent hover:underline">
          Volver a iniciar sesión
        </Link>
      }
    >
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
        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-danger"
          >
            {formError}
          </div>
        )}
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Enviar enlace de recuperación
        </Button>
      </form>
      <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
        Por seguridad, nunca te pediremos tu contraseña por correo.
      </p>
    </AuthLayout>
  );
}
