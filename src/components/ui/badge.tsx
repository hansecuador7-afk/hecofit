import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-5 tracking-wide transition-colors whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-accent/25 bg-accent/12 text-accent',
        secondary: 'border-border bg-surface text-muted',
        success: 'border-success/25 bg-success/12 text-success',
        warning: 'border-warning/25 bg-warning/12 text-warning',
        danger: 'border-danger/25 bg-danger/12 text-danger',
        outline: 'border-border-strong bg-transparent text-foreground/80',
        info: 'border-sky-400/25 bg-sky-400/10 text-sky-400',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
