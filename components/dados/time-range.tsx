"use client";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { id: "month", label: "Mês" },
  { id: "quarter", label: "Trim." },
  { id: "year", label: "Ano" },
] as const;

export type TimeRange = (typeof OPTIONS)[number]["id"];

export function TimeRangeTabs({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-white p-1">
      {OPTIONS.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded-full px-4 h-7 text-[12px] font-medium transition-colors",
              active
                ? "bg-brand-900 text-white"
                : "text-muted hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
