"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OnboardingStep {
  id: string;
  label: string;
  description?: string;
}

interface OnboardingStepperProps {
  steps: OnboardingStep[];
  current: number;
  onJump?: (index: number) => void;
}

/**
 * Stepper otimizado para o wizard mobile-first. Mostra todos os steps
 * com label curto + estado (done/active/pending). No mobile vira lista
 * compacta (só números + label do atual).
 */
export function OnboardingStepper({
  steps,
  current,
  onJump,
}: OnboardingStepperProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Mobile: barra horizontal compacta */}
      <ol className="flex items-center gap-1.5 sm:hidden">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.id} className="flex flex-1 items-center">
              <span
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  done || active ? "bg-brand-600" : "bg-border",
                )}
                aria-current={active ? "step" : undefined}
              />
            </li>
          );
        })}
      </ol>
      <div className="flex items-center justify-between text-[12px] text-muted sm:hidden">
        <span>
          Passo {current + 1} de {steps.length}
        </span>
        <span className="font-medium text-ink">{steps[current]?.label}</span>
      </div>

      {/* Desktop: stepper completo com círculos */}
      <ol className="hidden flex-wrap items-center gap-2 sm:flex">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const clickable = onJump && (done || active);
          return (
            <li key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => clickable && onJump?.(i)}
                disabled={!clickable}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition-colors",
                  done && "border-brand-600 bg-brand-50 text-brand-800",
                  active && "border-brand-900 bg-brand-900 text-white",
                  !done &&
                    !active &&
                    "border-border bg-surface text-muted cursor-default",
                  clickable && "hover:border-brand-700",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold",
                    done && "bg-brand-600 text-white",
                    active && "bg-white text-brand-900",
                    !done && !active && "bg-border/40 text-muted",
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span>{s.label}</span>
              </button>
              {i < steps.length - 1 ? (
                <span className="h-px w-4 bg-border" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
