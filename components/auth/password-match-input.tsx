"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type MatchState = "neutral" | "match" | "mismatch";

interface PasswordMatchInputProps {
  label: string;
  name: string;
  value: string;
  compareTo: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  autoComplete?: string;
}

/**
 * Input de confirmação de senha com indicador visual em tempo real:
 *  - neutro (sem cor) enquanto pelo menos um dos campos está vazio
 *  - vermelho com X quando os dois estão preenchidos e diferem
 *  - verde com ✓ quando os dois estão preenchidos e iguais
 *
 * Mantém a mesma API de `name`/`value`/`onChange` pra plugar em formularios
 * com server actions (o input nativo participa do FormData normalmente).
 */
export function PasswordMatchInput({
  label,
  name,
  value,
  compareTo,
  onChange,
  required,
  hint,
  placeholder = "••••••••",
  autoComplete = "new-password",
}: PasswordMatchInputProps) {
  const state: MatchState =
    value.length === 0 || compareTo.length === 0
      ? "neutral"
      : value === compareTo
        ? "match"
        : "mismatch";

  return (
    <label htmlFor={name} className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <div className="relative">
        <input
          id={name}
          name={name}
          type="password"
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-11 w-full rounded-full border bg-white px-4 pr-10 text-sm text-ink",
            "placeholder:text-muted/60 focus:outline-none focus:ring-2",
            state === "neutral" &&
              "border-border focus:ring-brand-500/30 focus:border-brand-500",
            state === "match" &&
              "border-[#1F9D55] focus:ring-[#1F9D55]/25 focus:border-[#1F9D55]",
            state === "mismatch" &&
              "border-[color:var(--color-status-out)] focus:ring-[color:var(--color-status-out)]/25 focus:border-[color:var(--color-status-out)]",
          )}
        />
        {state === "match" ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-full bg-[#1F9D55] text-white"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        ) : state === "mismatch" ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-full bg-[color:var(--color-status-out)] text-white"
          >
            <X className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        ) : null}
      </div>
      {state === "match" ? (
        <span className="text-[12px] text-[#1F9D55]">As senhas coincidem.</span>
      ) : state === "mismatch" ? (
        <span className="text-[12px] text-[color:var(--color-status-out)]">
          As senhas não coincidem.
        </span>
      ) : hint ? (
        <span className="text-[12px] text-muted">{hint}</span>
      ) : null}
    </label>
  );
}
