import * as React from "react";

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

/** DSD §4 input — border, radius, focus ring, error state. */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, hint, error, id, className, ...props }, ref) {
    const inputId = id ?? props.name;
    return (
      <div>
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-[var(--color-text)]"
        >
          {label}
        </label>
        {hint && (
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{hint}</p>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            "mt-1.5 block w-full rounded-control border bg-white px-3 py-2.5",
            "text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/60",
            "border-[var(--color-border)]",
            "focus-visible:outline-none focus-visible:[outline:2px_solid_var(--color-primary)] focus-visible:[outline-offset:2px]",
            error && "border-[var(--color-error)]",
            className,
          )}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-[var(--color-error)]">
            {error}
          </p>
        )}
      </div>
    );
  },
);
