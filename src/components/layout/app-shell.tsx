import { Download } from 'lucide-react';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { OfflineBanner } from '@/components/layout/offline-banner';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { UserMenu } from '@/components/layout/user-menu';
import { SyncBadge } from '@/components/shared/sync-badge';
import { LogoMark } from '@/components/shared/logo';
import { RestTimerBar } from '@/features/workouts/rest-timer-bar';
import { Button } from '@/components/ui/button';
import { getPageTitle } from '@/app/navigation';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatLongDate } from '@/lib/dates';

export function AppShell() {
  const location = useLocation();
  const { profile } = useAuth();
  const { canInstall, promptInstall } = useInstallPrompt();
  const title = getPageTitle(location.pathname);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="relative min-h-dvh bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[420px] bg-[radial-gradient(ellipse_70%_100%_at_50%_-20%,rgba(255,107,53,0.13),transparent_70%)]"
      />
      <Sidebar />
      <div className="relative lg:pl-[264px]">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="lg:hidden">
                <LogoMark className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-[15px] font-semibold leading-tight sm:text-base">
                  {title}
                </p>
                <p className="hidden text-[11px] text-muted sm:block">
                  {profile?.displayName ? `Hola, ${profile.displayName.split(' ')[0]}` : 'Tu progreso, en tus manos'} · {formatLongDate(new Date())}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {canInstall && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden text-xs md:inline-flex"
                  onClick={() => void promptInstall()}
                >
                  <Download className="h-3.5 w-3.5" /> Instalar app
                </Button>
              )}
              <SyncBadge />
              <ThemeToggle />
              <div className="ml-1 border-l border-border pl-1.5">
                <UserMenu compact />
              </div>
            </div>
          </div>
        </header>
        <OfflineBanner />
        <main className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">
          <div key={location.pathname} className="animate-in-fade">
            <Outlet />
          </div>
        </main>
      </div>
      <RestTimerBar />
      <MobileNav />
    </div>
  );
}
