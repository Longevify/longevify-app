"use client";

import { cn } from "@/lib/utils";

interface Props {
  suggestions: string[];
  onPick: (s: string) => void;
  className?: string;
  disabled?: boolean;
}

export function SuggestionPills({
  suggestions,
  onPick,
  className,
  disabled,
}: Props) {
  return (
    {/* H8: grid 2 colunas em mobile para evitar pills ocupando ~100% width */}
    <div className={cn("grid grid-cols-2 gap-2 sm:flex sm:flex-wrap", className)}>
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onPick(s)}
          className={cn(
            "rounded-full border border-border bg-white/80 px-4 h-9 text-[13px] text-ink",
            "hover:bg-brand-50 hover:border-brand-300 transition-colors",
            "disabled:opacity-50 disabled:pointer-events-none",
          )}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
