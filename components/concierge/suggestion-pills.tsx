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
    <div className={cn("flex flex-wrap gap-2", className)}>
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
