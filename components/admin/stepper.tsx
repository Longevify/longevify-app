import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  steps: { id: string; label: string }[];
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="flex items-center gap-3">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.id} className="flex items-center gap-3">
            <span
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full border text-[12px] font-semibold transition-colors",
                done &&
                  "border-brand-600 bg-brand-600 text-white",
                active &&
                  "border-brand-900 bg-brand-900 text-white",
                !done &&
                  !active &&
                  "border-border bg-surface text-muted",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "text-[13px]",
                active ? "font-semibold text-ink" : "text-muted",
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 ? (
              <span className="h-px w-8 bg-border" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
