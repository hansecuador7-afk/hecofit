import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#FF8A5B] to-[#FF4D0D] text-[#0B0D10] shadow-[0_8px_24px_-10px_rgba(255,107,53,0.8)]',
        className,
      )}
      aria-hidden
    >
      <span className="font-display text-lg font-black leading-none tracking-[-0.08em]">HF</span>
      <span className="absolute inset-x-0 bottom-0 h-1/3 bg-black/10" />
    </div>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark className="h-9 w-9" />
      {!compact && (
        <div className="leading-none">
          <span className="font-display text-[17px] font-bold tracking-[0.08em]">HECOFIT</span>
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.22em] text-muted">
            Train smarter
          </span>
        </div>
      )}
    </div>
  );
}
