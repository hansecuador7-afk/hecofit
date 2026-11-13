import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  CheckCircle2,
  Cloud,
  Database,
  ExternalLink,
  HardDrive,
  KeyRound,
  ShieldCheck,
  Unplug,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Logo } from '@/components/shared/logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label } from '@/components/ui/input';
import { setupSchema, type SetupFormValues } from '@/features/auth/schemas';
import {
  clearSupabaseConfig,
  isCloudConfigured,
  isValidPublicKey,
  isValidSupabaseUrl,
  saveSupabaseConfig,
  supabaseConfig,
} from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';

const steps = [
  {
    icon: Cloud,
    title: 'Crea el proyecto',
    description:
      'Entra en supabase.com, crea un proyecto gratuito y elige una región cercana a tus usuarios.',
    link: 'https://supabase.com/dashboard',
    linkLabel: 'Abrir Supabase',
  },
  {
    icon: Database,
    title: 'Ejecuta las migraciones',
    description:
      'En el SQL Editor, ejecuta los archivos de supabase/migrations en orden y después supabase/seed.sql. Crean tablas, políticas RLS y el catálogo inicial.',
  },
  {
    icon: KeyRound,
    title: 'Copia las claves públicas',
    description:
      'En Project Settings → API, copia la Project URL y la clave anon o publishable. Nunca uses la service_role en el frontend.',
  },
];

export default function SetupPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const envConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: { url: '', anonKey: '' },
  });

  const onSubmit = async (values: SetupFormValues) => {
    setFormError(null);
    if (!isValidSupabaseUrl(values.url)) {
      setFormError('La URL debe tener el formato https://<proyecto>.supabase.co');
      return;
    }
    if (!isValidPublicKey(values.anonKey)) {
      setFormError('La clave no es válida. Usa la clave anon o publishable, no service_role.');
      return;
    }
    try {
      saveSupabaseConfig({ url: values.url, anonKey: values.anonKey });
      setSaved(true);
      toast.success('Configuración guardada. Recargando HECOFIT…');
      window.setTimeout(() => {
        window.location.hash = '#/login';
        window.location.reload();
      }, 800);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const disconnect = () => {
    clearSupabaseConfig();
    toast.success('Conexión local eliminada');
    window.setTimeout(() => window.location.reload(), 400);
  };

  if (isCloudConfigured && saved) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-5">
        <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold">Supabase conectado</h1>
          <p className="mt-2 text-sm text-muted">Recargando la aplicación para activar la nube…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Logo />
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Link>
          </Button>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-panel p-5 sm:p-7">
          <Badge variant={isCloudConfigured ? 'success' : 'secondary'}>
            {isCloudConfigured ? <Cloud className="h-3 w-3" /> : <HardDrive className="h-3 w-3" />}
            {isCloudConfigured ? 'Nube conectada' : 'Configuración de la nube'}
          </Badge>
          <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {isCloudConfigured ? 'Tu proyecto de Supabase está conectado' : 'Conecta tu proyecto de Supabase'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            HECOFIT funciona sin nube en modo local, pero con Supabase obtienes cuentas multiusuario,
            inicio de sesión por correo, aislamiento de datos con RLS y sincronización entre
            dispositivos.
          </p>

          {isCloudConfigured ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-border bg-surface/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Proyecto activo
                </p>
                <p className="mt-1 break-all font-mono text-sm text-foreground">
                  {supabaseConfig?.url ?? 'Variables de entorno'}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-success">
                  <ShieldCheck className="h-3.5 w-3.5" /> Clave pública validada · RLS obligatorio en
                  la base de datos
                </p>
              </div>
              {envConfigured ? (
                <p className="text-xs leading-relaxed text-muted">
                  La conexión está definida mediante variables de entorno (VITE_SUPABASE_URL y
                  VITE_SUPABASE_ANON_KEY). Para cambiarla, actualiza las variables del build o los
                  secretos de GitHub Actions.
                </p>
              ) : (
                <Button variant="secondary" onClick={disconnect}>
                  <Unplug className="h-4 w-4" /> Desconectar y volver al modo local
                </Button>
              )}
              <Button className="w-full" size="lg" onClick={() => navigate('/login')}>
                Ir a iniciar sesión
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {steps.map((step, index) => (
                  <div key={step.title} className="rounded-xl border border-border bg-surface/30 p-3.5">
                    <div className="flex items-center justify-between">
                      <step.icon className="h-4 w-4 text-accent" />
                      <span className="font-display text-xs font-bold text-muted/60">0{index + 1}</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold">{step.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">{step.description}</p>
                    {step.link && (
                      <a
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                      >
                        {step.linkLabel} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="url">Project URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://abcdefgh.supabase.co"
                    autoComplete="url"
                    {...register('url')}
                  />
                  <FieldError>{errors.url?.message}</FieldError>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="anonKey">Clave pública (anon / publishable)</Label>
                  <Input
                    id="anonKey"
                    type="password"
                    placeholder="eyJhbGciOi… o sb_publishable_…"
                    autoComplete="off"
                    {...register('anonKey')}
                  />
                  <FieldError>{errors.anonKey?.message}</FieldError>
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
                  <Cloud className="h-4 w-4" /> Conectar Supabase
                </Button>
              </form>

              <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/[0.05] p-3 text-[11px] leading-relaxed text-muted">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>
                  La clave anon es pública y está diseñada para el navegador. La seguridad real la
                  aportan las políticas RLS. Nunca introduzcas aquí la clave <code>service_role</code>.
                  La configuración se guarda solo en este navegador.
                </span>
              </div>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-muted">
          ¿Prefieres no configurar nada?{' '}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            Usa el modo local
          </Link>
        </p>
      </div>
    </div>
  );
}
