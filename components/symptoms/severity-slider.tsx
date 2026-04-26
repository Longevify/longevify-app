"use client";

import { cn } from "@/lib/utils";

interface SeveritySliderProps {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}

export function SeveritySlider({
  value,
  onChange,
  className,
}: SeveritySliderProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-muted">Severidade</span>
        <span className="text-[14px] font-semibold tabular-nums">
          {value}
          <span className="text-[12px] font-normal text-muted"> / 10</span>
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-brand-100 accent-brand-500"
      />
      <div className="flex items-center justify-between text-[10.5px] text-muted">
        <span>leve</span>
        <span>moderado</span>
        <span>intenso</span>
      </div>
    </div>
  );
}
