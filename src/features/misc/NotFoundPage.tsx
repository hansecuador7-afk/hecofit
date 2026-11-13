import { ArrowLeft, Compass, Home, SearchX } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { LogoMark } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 py-16 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />
      <LogoMark className="h-14 w-14" />
      <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
        Error 404
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Esta página no existe
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        La dirección que has abierto no corresponde a ninguna pantalla de HECOFIT. Puede que el
        enlace esté mal escrito o que la página se haya movido.
      </p>

      <div className="mt-7 flex flex-col gap-2 sm:flex-row">
        <Button asChild>
          <Link to="/">
            <Home className="h-4 w-4" /> Ir al dashboard
          </Link>
        </Button>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Volver atrás
        </Button>
      </div>

      <div className="mt-10 grid w-full max-w-md grid-cols-3 gap-2 text-left">
        {[
          { to: '/workouts', label: 'Entrenar', icon: Compass },
          { to: '/history', label: 'Historial', icon: SearchX },
          { to: '/profile', label: 'Ajustes', icon: Home },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="group rounded-xl border border-border bg-panel/60 p-3 transition-colors hover:border-accent/30 hover:bg-surface/50"
          >
            <item.icon className="h-4 w-4 text-muted transition-colors group-hover:text-accent" />
            <p className="mt-2 text-xs font-semibold">{item.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
