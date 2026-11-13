import { Activity, CloudOff, Layers3, ShieldCheck, TrendingUp, Wifi } from 'lucide-react';
import type { ReactNode } from 'react';
import { Logo } from '@/components/shared/logo';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Activity,
    title: 'Registro serie a serie',
    description: 'Peso, repeticiones, tipo de serie y descansos sin fricción.',
  },
  {
    icon: TrendingUp,
    title: 'Progreso con datos reales',
    description: 'Volumen, cargas y frecuencia calculados desde tu historial.',
  },
  {
    icon: CloudOff,
    title: 'Funciona sin conexión',
    description: 'Entrena sin señal y sincroniza automáticamente al volver.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacidad por diseño',
    description: 'Cada cuenta accede únicamente a sus propios datos.',
  },
];

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  eyebrow?: string;
}) {
  const { mode, cloudAvailable } = useAuth();

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden border-r border-white/[0.06] bg-[#0B0D10] px-12 py-10 text-[#F5F7FA] lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-grid opacity-60" aria-hidden />
        <div
          className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-accent/20 blur-[120px]"
          aria-hidden
        />
        <div
          className="absolute -bottom-20 left-1/4 h-[300px] w-[300px] rounded-full bg-[#FF4D0D]/10 blur-[100px]"
          aria-hidden
        />
        <div className="relative z-10">
          <Logo />
        </div>

        <div className="relative z-10 my-auto max-w-xl py-12">
          <Badge className="border-accent/25 bg-accent/10 text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Plataforma de entrenamiento
          </Badge>
          <h1 className="mt-5 font-display text-[46px] font-semibold leading-[1.02] tracking-[-0.04em]">
            Cada serie cuenta.
            <br />
            <span className="text-gradient">Cada progreso importa.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[#929BA8]">
            HECOFIT convierte tus entrenamientos en información útil: rutinas organizadas, sesiones
            medidas al segundo y estadísticas que reflejan lo que realmente levantas.
          </p>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5 backdrop-blur-sm"
              >
                <feature.icon className="h-4 w-4 text-accent" />
                <p className="mt-2.5 text-[13px] font-semibold">{feature.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#929BA8]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-[11px] text-[#929BA8]">
          <span className="flex items-center gap-1.5">
            <Wifi className="h-3.5 w-3.5 text-success" /> PWA instalable
          </span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <span className="flex items-center gap-1.5">
            <Layers3 className="h-3.5 w-3.5 text-accent" /> Offline-first
          </span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <span>HECOFIT © {new Date().getFullYear()}</span>
        </div>
      </section>

      <section className="relative flex min-h-dvh flex-col px-5 py-8 sm:px-8 lg:px-12">
        <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(255,107,53,0.08),transparent)] lg:hidden" />
        <div className="relative z-10 mb-8 flex items-center justify-between lg:hidden">
          <Logo />
          {mode === 'local' ? (
            <Badge variant="secondary">Modo local</Badge>
          ) : (
            <Badge variant="success">
              <CloudOff className="h-3 w-3" /> Nube
            </Badge>
          )}
        </div>

        <div className="relative z-10 my-auto w-full max-w-[420px] self-center">
          {eyebrow && (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              {eyebrow}
            </p>
          )}
          <h2 className="font-display text-[30px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">
            {title}
          </h2>
          {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>}

          <div className={cn('mt-7')}>{children}</div>

          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        </div>

        <div className="relative z-10 mt-8 flex flex-col items-center gap-2 text-center text-[11px] text-muted/70">
          <p>
            {cloudAvailable
              ? 'Conexión segura con Supabase · Tus datos están protegidos con RLS.'
              : 'Modo local · Sin servidor configurado. Tus datos permanecen en este dispositivo.'}
          </p>
          {!cloudAvailable && (
            <a href="#/setup" className="font-semibold text-accent hover:underline">
              Conectar Supabase
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
