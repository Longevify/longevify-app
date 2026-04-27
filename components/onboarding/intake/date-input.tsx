"use client";

import { cn } from "@/lib/utils";
import { BRDateInput } from "@/components/ui/br-date-input";

interface DateInputProps {
  value?: string; // ISO yyyy-mm-dd
  onChange: (v: string) => void;
  max?: string;
  min?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Date picker amigável com máscara dd/mm/aaaa em pt-BR.
 * Internamente usa BRDateInput; emite ISO yyyy-mm-dd via onChange.
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
      <BRDateInput
        value={value ?? ""}
        onChange={onChange}
        min={min}
        max={max}
        className="[&_input]:rounded-2xl [&_input]:border-border [&_input]:bg-brand-50/30 [&_input]:pl-4 [&_input]:focus:border-brand-400 [&_input]:focus:bg-white"
      />
    </div>
  );
}
