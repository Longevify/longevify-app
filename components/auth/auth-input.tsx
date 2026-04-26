import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  function AuthInput({ label, hint, error, className, id, ...props }, ref) {
    const inputId = id ?? props.name;
    return (
      <label htmlFor={inputId} className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">{label}</span>
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 rounded-full border border-border bg-white px-4 text-sm text-ink",
            "placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500",
            error && "border-[color:var(--color-status-out)] focus:ring-[color:var(--color-status-out)]/20",
            className,
          )}
          {...props}
        />
        {error ? (
          <span className="text-[12px] text-[color:var(--color-status-out)]">
            {error}
          </span>
        ) : hint ? (
          <span className="text-[12px] text-muted">{hint}</span>
        ) : null}
      </label>
    );
  },
);
