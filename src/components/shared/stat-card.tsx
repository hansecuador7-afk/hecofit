import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'accent',
  footer,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: LucideIcon;
  accent?: 'accent' | 'success' | 'warning' | 'info' | 'violet';
  footer?: ReactNode;
  className?: string;
}) {
  const accentClasses = {
    accent: 'bg-accent/10 text-accent border-accent/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    info: 'bg-sky-400/10 text-sky-400 border-sky-400/20',
    violet: 'bg-violet-400/10 text-violet-400 border-violet-400/20',
  }[accent];

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/80 bg-panel p-4 transition-colors hover:border-border-strong sm:p-5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl border', accentClasses)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 font-display text-2xl font-semibold tracking-tight tabular sm:text-[28px]">
        {value}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
