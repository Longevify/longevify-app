"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Question } from "@/lib/questionnaires/definitions";

interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  value: number | undefined;
  onSelect: (value: number) => void;
}

export function QuestionCard({
  question,
  index,
  total,
  value,
  onSelect,
}: QuestionCardProps) {
  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-100 text-[13px] font-semibold text-brand-700">
          {index + 1}
        </span>
        <div className="min-w-0">
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted">
            Pergunta {index + 1} / {total}
          </span>
          <p className="mt-1 text-[16px] font-medium leading-snug text-ink">
            {question.text}
          </p>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Opções de resposta</legend>
        {question.options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-[14px] transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
                selected
                  ? "border-brand-500 bg-brand-50 text-ink"
                  : "border-border bg-white text-ink hover:border-brand-300 hover:bg-brand-50/40",
              )}
              aria-pressed={selected}
            >
              <span>{opt.label}</span>
              <span
                className={cn(
                  "grid h-5 w-5 place-items-center rounded-full border transition-colors",
                  selected
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-border bg-white text-transparent",
                )}
                aria-hidden="true"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              </span>
            </button>
          );
        })}
      </fieldset>
    </Card>
  );
}
