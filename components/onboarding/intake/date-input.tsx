"use client";

import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateInputProps {
  value?: string; // ISO yyyy-mm-dd
  onChange: (v: string) => void;
  max?: string;
  min?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Date picker amigável (input nativo type="date") com label visual
 * formatada em pt-BR.
 */
export function DateInput({
  value,
  onChange,
  max,
  min,
  className,
}: DateInputProps) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
        <Calendar className="h-4 w-4" />
      </span>
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        max={max}
        min={min}
        className="h-11 w-full rounded-2xl border border-border bg-brand-50/30 pl-10 pr-3 text-[14px] text-ink outline-none transition-colors focus:border-brand-400 focus:bg-white"
      />
    </div>
  );
}
