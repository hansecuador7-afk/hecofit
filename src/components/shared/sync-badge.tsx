import { AlertTriangle, Cloud, CloudOff, Loader2, RefreshCw, Smartphone } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/utils';
import { syncEngine } from '@/services/sync';
import { useSyncStore } from '@/stores/syncStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function SyncBadge({ compact = false }: { compact?: boolean }) {
  const { mode } = useAuth();
  const { status, pendingCount, online, error } = useSyncStore();

  if (mode === 'local') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface/70 px-2.5 text-[11px] font-semibold text-muted">
            <Smartphone className="h-3.5 w-3.5" />
            {!compact && 'Modo local'}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Los datos se guardan en este dispositivo. Conecta Supabase para sincronizar.
        </TooltipContent>
      </Tooltip>
    );
  }

  const config = !online || status === 'offline'
    ? { icon: CloudOff, label: 'Sin conexión', color: 'text-warning border-warning/25 bg-warning/10' }
    : status === 'syncing'
      ? { icon: Loader2, label: 'Sincronizando', color: 'text-sky-400 border-sky-400/25 bg-sky-400/10', spin: true }
      : status === 'pending'
        ? { icon: RefreshCw, label: `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}`, color: 'text-warning border-warning/25 bg-warning/10' }
        : status === 'error'
          ? { icon: AlertTriangle, label: 'Error de sync', color: 'text-danger border-danger/25 bg-danger/10' }
          : { icon: Cloud, label: 'Sincronizado', color: 'text-success border-success/25 bg-success/10' };

  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => {
            if (status === 'error' || status === 'pending') void syncEngine.syncNow();
          }}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-colors',
            config.color,
          )}
          aria-label={config.label}
        >
          <Icon className={cn('h-3.5 w-3.5', 'spin' in config && config.spin && 'animate-spin')} />
          {!compact && <span className="hidden sm:inline">{config.label}</span>}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {error ??
          (status === 'error'
            ? 'No se pudieron sincronizar los cambios. Pulsa para reintentar.'
            : !online
              ? 'Los cambios se guardan en el dispositivo y se enviarán al recuperar la conexión.'
              : 'Estado de sincronización con la nube')}
      </TooltipContent>
    </Tooltip>
  );
}
