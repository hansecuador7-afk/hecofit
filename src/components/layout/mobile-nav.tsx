import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ALL_NAV_ITEMS, MOBILE_NAV_ITEMS } from '@/app/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { mode } = useAuth();
  const extraActive = ALL_NAV_ITEMS.filter(
    (item) => !MOBILE_NAV_ITEMS.some((main) => main.to === item.to),
  ).some((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)));

  return (
    <>
      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-panel/90 backdrop-blur-xl lg:hidden"
        aria-label="Navegación móvil"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-2 pt-1.5">
          {MOBILE_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[10px] font-medium transition-colors',
                  isActive ? 'text-accent' : 'text-muted hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-8 w-12 items-center justify-center rounded-full transition-colors',
                      isActive && 'bg-accent/12',
                    )}
                  >
                    <item.icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.4 : 1.8} />
                  </span>
                  <span>{item.shortLabel ?? item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              'flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[10px] font-medium transition-colors',
              extraActive ? 'text-accent' : 'text-muted hover:text-foreground',
            )}
            aria-label="Abrir más opciones"
          >
            <span
              className={cn(
                'flex h-8 w-12 items-center justify-center rounded-full',
                extraActive && 'bg-accent/12',
              )}
            >
              <Menu className="h-[19px] w-[19px]" />
            </span>
            <span>Más</span>
          </button>
        </div>
      </nav>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Explorar HECOFIT</DialogTitle>
            <p className="text-sm text-muted">Todas tus herramientas de entrenamiento.</p>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {ALL_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl border p-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-accent/30 bg-accent/10 text-foreground'
                      : 'border-border bg-surface/40 text-muted hover:bg-surface hover:text-foreground',
                  )
                }
              >
                <item.icon className="h-4 w-4 text-accent" />
                {item.label}
              </NavLink>
            ))}
          </div>
          {mode === 'local' && (
            <div className="mt-4 rounded-xl border border-border bg-surface/40 p-3 text-xs leading-relaxed text-muted">
              <strong className="text-foreground">Modo local:</strong> tus datos se guardan en este
              dispositivo. Puedes conectar Supabase desde Perfil para sincronizar en la nube.
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium text-muted"
          >
            <X className="h-4 w-4" /> Cerrar
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
