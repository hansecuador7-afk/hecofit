import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthProvider';
import { playRestAlarm } from '@/lib/audio';
import { cn, formatTimer } from '@/lib/utils';
import { useRestTimerStore } from '@/stores/restTimerStore';

export function RestTimerBar() {
  const { settings } = useAuth();
  const {
    status,
    endsAt,
    remainingSeconds,
    durationSeconds,
    label,
    pause,
    resume,
    addTime,
    complete,
    skip,
    restart,
  } = useRestTimerStore();
  const [now, setNow] = useState(Date.now());
  const completedRef = useRef<string | null>(null);
  const [dismissedCompletion, setDismissedCompletion] = useState(false);

  const remaining =
    status === 'running' && endsAt
      ? Math.max(0, Math.ceil((endsAt - now) / 1000))
      : remainingSeconds;

  useEffect(() => {
    if (status !== 'running') return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status !== 'running' || !endsAt) return;
    if (Date.now() >= endsAt) {
      const marker = `${endsAt}`;
      if (completedRef.current !== marker) {
        completedRef.current = marker;
        complete();
        if (settings?.soundEnabled !== false) playRestAlarm();
        toast.success('Descanso completado. ¡A por la siguiente serie!', { icon: '🔥' });
        if (
          settings?.notificationsEnabled &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          try {
            const notification = new Notification('Descanso completado', {
              body: label ? `${label}: ya puedes empezar la siguiente serie.` : 'Ya puedes empezar la siguiente serie.',
              icon: new URL('icons/icon-192.png', document.baseURI).href,
              tag: 'hecofit-rest-timer',
            });
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          } catch {
            // Algunos navegadores bloquean notificaciones fuera de una interacción.
          }
        }
      }
    }
  }, [now, status, endsAt, complete, settings?.soundEnabled, settings?.notificationsEnabled, label]);

  if (status === 'idle') return null;
  if (status === 'completed' && dismissedCompletion) return null;

  const progress =
    status === 'completed'
      ? 0
      : Math.min(100, Math.max(0, ((durationSeconds - remaining) / durationSeconds) * 100));

  return (
    <div className="fixed inset-x-0 bottom-[68px] z-40 px-3 lg:bottom-5 lg:left-auto lg:right-5 lg:px-0">
      <div
        className={cn(
          'mx-auto w-full max-w-md overflow-hidden rounded-2xl border bg-panel/95 shadow-2xl backdrop-blur-xl lg:w-[360px]',
          status === 'completed' ? 'border-success/40' : 'border-border',
        )}
      >
        <div className="h-1 w-full bg-surface">
          <div
            className={cn(
              'h-full transition-[width] duration-300',
              status === 'completed' ? 'bg-success' : 'bg-accent',
            )}
            style={{ width: `${status === 'completed' ? 100 : progress}%` }}
          />
        </div>
        <div className="flex items-center gap-3 p-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              status === 'completed'
                ? 'bg-success/10 text-success'
                : status === 'paused'
                  ? 'bg-warning/10 text-warning'
                  : 'bg-accent/10 text-accent',
            )}
          >
            <Timer className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted">
              {status === 'completed'
                ? 'Descanso completado'
                : status === 'paused'
                  ? 'Descanso en pausa'
                  : 'Descansando'}{' '}
              {label ? `· ${label}` : ''}
            </p>
            <p className="tabular font-display text-xl font-semibold leading-tight">
              {status === 'completed' ? '¡Listo!' : formatTimer(remaining)}
            </p>
          </div>
          {status === 'completed' ? (
            <Button size="icon-sm" variant="ghost" onClick={() => setDismissedCompletion(true)}>
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-0.5">
              <Button size="icon-sm" variant="ghost" onClick={() => addTime(-15)} aria-label="Quitar 15 segundos">
                <span className="text-[11px] font-bold">-15</span>
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => addTime(15)} aria-label="Añadir 15 segundos">
                <span className="text-[11px] font-bold">+15</span>
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => (status === 'paused' ? resume() : pause())}
                aria-label={status === 'paused' ? 'Reanudar descanso' : 'Pausar descanso'}
              >
                {status === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={restart} aria-label="Reiniciar descanso">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={skip} aria-label="Omitir descanso">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
