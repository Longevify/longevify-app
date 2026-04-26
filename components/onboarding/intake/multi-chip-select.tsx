"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChipOption<V extends string = string> {
  value: V;
  label: string;
}

interface MultiChipSelectProps<V extends string = string> {
  options: readonly ChipOption<V>[];
  values: V[];
  onChange: (next: V[]) => void;
  // ids que ao serem selecionados limpam todos os outros (ex: "nenhuma")
  exclusive?: V[];
}

/**
 * Multi-select em formato de chips. Suporta opções "exclusivas"
 * (ex: "nenhuma" desmarca o resto e vice-versa).
 */
export function MultiChipSelect<V extends string = string>({
  options,
  values,
  onChange,
  exclusive,
}: MultiChipSelectProps<V>) {
  function toggle(v: V) {
    const isExclusive = exclusive?.includes(v);
    if (isExclusive) {
      onChange(values.includes(v) ? [] : [v]);
      return;
    }
    if (values.includes(v)) {
      onChange(values.filter((x) => x !== v));
    } else {
      // selecionar item normal limpa exclusives
      const cleaned = exclusive
        ? values.filter((x) => !exclusive.includes(x))
        : values;
      onChange([...cleaned, v]);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = values.includes(opt.value);
        return (
          <button
            type="button"
            key={opt.value}
            onClick={() => toggle(opt.value)}
            aria-pressed={selected}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition-colors",
              selected
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-border bg-white text-ink hover:border-brand-400 hover:bg-brand-50",
            )}
          >
            {selected ? <Check className="h-3 w-3" /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
