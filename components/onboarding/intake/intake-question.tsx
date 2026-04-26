"use client";

import { cn } from "@/lib/utils";

interface IntakeQuestionProps {
  label: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  full?: boolean;
  children: React.ReactNode;
}

/**
 * Wrapper genérico de uma pergunta — label, hint, badge "Opcional" e
 * mensagem de erro inline. Usar dentro de cada step do intake.
 */
export function IntakeQuestion({
  label,
  hint,
  optional,
  error,
  full,
  children,
}: IntakeQuestionProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        full ? "sm:col-span-2" : "",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        {optional ? (
          <span className="rounded-full border border-border bg-white px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-muted">
            Opcional
          </span>
        ) : null}
      </div>
      {hint ? (
        <p className="text-[12px] leading-snug text-muted">{hint}</p>
      ) : null}
      {children}
      {error ? (
        <p className="text-[12px] font-medium text-[#B6333A]">{error}</p>
      ) : null}
    </div>
  );
}
