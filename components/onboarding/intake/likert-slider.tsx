"use client";

import { cn } from "@/lib/utils";

interface LikertSliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: number | undefined;
  onChange: (v: number) => void;
  unit?: string;
  minLabel?: string;
  maxLabel?: string;
  className?: string;
}

/**
 * Slider amigável com display do valor + ancoras nos extremos. Usado
 * pra escalas Likert (1-10), horas de sono, doses/semana etc.
 */
export function LikertSlider({
  min = 1,
  max = 10,
  step = 1,
  value,
  onChange,
  unit,
  minLabel,
  maxLabel,
  className,
}: LikertSliderProps) {
  const display = value ?? Math.round((min + max) / 2);
  const filled = ((display - min) / (max - min)) * 100;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-end justify-between">
        <span className="text-[12px] text-muted">{minLabel ?? min}</span>
        <span className="text-[22px] font-semibold tabular-nums text-ink">
          {display}
          {unit ? <span className="ml-1 text-[12px] text-muted">{unit}</span> : null}
        </span>
        <span className="text-[12px] text-muted">{maxLabel ?? max}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={display}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-600"
        style={{
          background: `linear-gradient(to right, var(--color-brand-300) 0%, var(--color-brand-500) ${filled}%, var(--color-border) ${filled}%, var(--color-border) 100%)`,
        }}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={display}
      />
    </div>
  );
}
