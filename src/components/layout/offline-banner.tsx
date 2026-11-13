import { AlertTriangle, RefreshCw, WifiOff, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthProvider';
import { syncEngine } from '@/services/sync';
import { useSyncStore } from '@/stores/syncStore';

export function OfflineBanner() {
  const { mode } = useAuth();
  const { online, status, pendingCount, error } = useSyncStore();
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  if (mode === 'local') return null;

  if (!online) {
    return (
      <div className="border-b border-warning/20 bg-warning/10 px-4 py-2.5 text-warning">
        <div className="mx-auto flex max-w-7xl items-center gap-2 text-xs font-medium sm:text-sm">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            Sin conexión. Tus cambios se guardan en el dispositivo
            {pendingCount > 0 ? ` (${pendingCount} pendiente${pendingCount === 1 ? '' : 's'})` : ''} y
            se sincronizarán al recuperar Internet.
          </span>
        </div>
      </div>
    );
  }

  if (status === 'error' && error && dismissedError !== error) {
    return (
      <div className="border-b border-danger/20 bg-danger/10 px-4 py-2.5 text-danger">
        <div className="mx-auto flex max-w-7xl items-center gap-2 text-xs font-medium sm:text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">No se pudo sincronizar: {error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-danger hover:bg-danger/10 hover:text-danger"
            onClick={() => void syncEngine.syncNow()}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reintentar
          </Button>
          <button
            type="button"
            onClick={() => setDismissedError(error)}
            aria-label="Ocultar aviso"
            className="rounded p-1 hover:bg-danger/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
