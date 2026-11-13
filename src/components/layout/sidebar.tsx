import { ChevronRight, Dumbbell, Plus } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/shared/logo';
import { UserMenu } from '@/components/layout/user-menu';
import { ElapsedTime } from '@/components/layout/elapsed-time';
import { NAV_SECTIONS } from '@/app/navigation';
import { useActiveWorkout } from '@/hooks/useHecoData';
import { cn } from '@/lib/utils';
import { WORKOUT_STATUS_LABELS } from '@/lib/constants';

export function Sidebar() {
  const activeWorkout = useActiveWorkout();
  const navigate = useNavigate();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-border/80 bg-panel/60 lg:flex">
      <div className="flex h-16 items-center border-b border-border/70 px-5">
        <NavLink to="/" aria-label="HECOFIT — Inicio">
          <Logo />
        </NavLink>
      </div>

      <div className="px-4 pt-5">
        <button
          type="button"
          onClick={() => navigate(activeWorkout ? `/workouts/${activeWorkout.id}` : '/workouts/new')}
          className="group flex w-full items-center justify-between rounded-xl bg-accent px-4 py-3 text-left text-sm font-semibold text-accent-foreground shadow-[0_12px_30px_-14px_rgba(255,107,53,0.8)] transition-all hover:bg-accent-hover active:scale-[0.99]"
        >
          <span className="flex items-center gap-2.5">
            <Dumbbell className="h-4 w-4" />
            {activeWorkout ? 'Continuar sesión' : 'Entrenar ahora'}
          </span>
          {activeWorkout ? (
            <ElapsedTime startedAt={activeWorkout.startedAt ?? activeWorkout.createdAt} className="tabular text-xs font-bold" />
          ) : (
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
          )}
        </button>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-5" aria-label="Navegación principal">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/70">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors',
                      isActive
                        ? 'bg-surface text-foreground'
                        : 'text-muted hover:bg-surface/60 hover:text-foreground',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent" />
                      )}
                      <item.icon
                        className={cn(
                          'h-[18px] w-[18px] shrink-0 transition-colors',
                          isActive ? 'text-accent' : 'text-muted group-hover:text-foreground',
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="h-3.5 w-3.5 text-muted" />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {activeWorkout && (
        <div className="mx-3 mb-2 rounded-xl border border-accent/20 bg-accent/[0.06] p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
              {WORKOUT_STATUS_LABELS[activeWorkout.status]}
            </p>
          </div>
          <p className="mt-1 truncate text-sm font-semibold">{activeWorkout.name}</p>
          <div className="mt-1 flex items-center justify-between">
            <ElapsedTime
              startedAt={activeWorkout.startedAt ?? activeWorkout.createdAt}
              className="tabular text-xs text-muted"
            />
            <button
              type="button"
              onClick={() => navigate(`/workouts/${activeWorkout.id}`)}
              className="text-[11px] font-semibold text-accent hover:underline"
            >
              Abrir
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-border/70 p-3">
        <UserMenu />
      </div>
    </aside>
  );
}
