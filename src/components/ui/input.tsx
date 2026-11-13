import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-xl border border-border bg-surface/60 px-3.5 py-2 text-sm text-foreground outline-none transition-all placeholder:text-muted/70 hover:border-border-strong focus:border-accent/70 focus:bg-surface focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[96px] w-full resize-y rounded-xl border border-border bg-surface/60 px-3.5 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted/70 hover:border-border-strong focus:border-accent/70 focus:bg-surface focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-sm font-medium text-foreground/90 leading-none', className)}
      {...props}
    />
  ),
);
Label.displayName = 'Label';

export const FieldError = ({ children }: { children?: React.ReactNode }) => {
  if (!children) return null;
  return (
    <p role="alert" className="text-xs font-medium text-danger">
      {children}
    </p>
  );
};

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'flex h-11 w-full appearance-none rounded-xl border border-border bg-surface/60 px-3.5 pr-10 text-sm text-foreground outline-none transition-all hover:border-border-strong focus:border-accent/70 focus:bg-surface focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </div>
));
Select.displayName = 'Select';

export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        'h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border border-border-strong bg-surface transition-colors checked:border-accent checked:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50',
        "checked:bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230B0D10' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E\")] checked:bg-center checked:bg-no-repeat",
        className,
      )}
      {...props}
    />
  ),
);
Checkbox.displayName = 'Checkbox';
