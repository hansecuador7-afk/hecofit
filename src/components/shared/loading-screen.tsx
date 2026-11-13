import { LogoMark } from '@/components/shared/logo';

export function LoadingScreen({ label = 'Preparando tu espacio' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-2xl bg-accent/20" />
        <LogoMark className="relative h-14 w-14 rounded-2xl" />
      </div>
      <p className="mt-6 font-display text-lg font-semibold">HECOFIT</p>
      <p className="mt-1 text-sm text-muted">{label}…</p>
      <div className="mt-5 h-1 w-36 overflow-hidden rounded-full bg-surface">
        <div className="h-full w-1/2 animate-[loading_1.1s_ease-in-out_infinite] rounded-full bg-accent" />
      </div>
      <style>{`@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <LogoMark className="h-10 w-10 animate-pulse" />
        <p className="text-xs font-medium text-muted">Cargando…</p>
      </div>
    </div>
  );
}
