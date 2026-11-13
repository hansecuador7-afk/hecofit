import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('HECOFIT UI error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-background px-6">
          <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="mt-4 font-display text-xl font-semibold">Algo no ha ido bien</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              La interfaz encontró un error inesperado. Tus datos guardados no se han perdido.
            </p>
            {this.state.message && (
              <p className="mt-3 rounded-lg bg-surface p-2.5 text-left text-[11px] text-muted">
                {this.state.message}
              </p>
            )}
            <Button className="mt-5 w-full" onClick={() => window.location.reload()}>
              <RotateCcw className="h-4 w-4" /> Recargar HECOFIT
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
