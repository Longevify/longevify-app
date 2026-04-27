"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface BRDateInputProps {
  /** Valor controlado em formato ISO YYYY-MM-DD (ou string vazia). */
  value: string;
  onChange: (isoValue: string) => void;
  label?: string;
  hint?: string;
  error?: string;
  /** Usado pelo hidden input para server actions receberem YYYY-MM-DD. */
  name?: string;
  required?: boolean;
  /** Limite mínimo em ISO YYYY-MM-DD. */
  min?: string;
  /** Limite máximo em ISO YYYY-MM-DD. */
  max?: string;
  id?: string;
  className?: string;
}

/** Converte "YYYY-MM-DD" → "DD/MM/YYYY". Retorna "" se inválido. */
function isoToDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

/** Converte "DD/MM/YYYY" → "YYYY-MM-DD". Retorna "" se incompleto. */
function displayToIso(display: string): string {
  const digits = display.replace(/\D/g, "");
  if (digits.length !== 8) return "";
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  return `${y}-${m}-${d}`;
}

/** Aplica máscara DD/MM/YYYY a uma string de dígitos (máx 8). */
function applyMask(digits: string): string {
  const d = digits.slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Valida se DD/MM/YYYY é uma data real. */
function isValidDate(display: string): boolean {
  const digits = display.replace(/\D/g, "");
  if (digits.length !== 8) return false;
  const day = parseInt(digits.slice(0, 2), 10);
  const month = parseInt(digits.slice(2, 4), 10);
  const year = parseInt(digits.slice(4, 8), 10);
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  // Valida dia conforme mês/ano (considera bissexto)
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** Verifica range min/max (ambos ISO). */
function isInRange(iso: string, min?: string, max?: string): boolean {
  if (!iso) return true;
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
}

export function BRDateInput({
  value,
  onChange,
  label,
  hint,
  error,
  name,
  required,
  min,
  max,
  id,
  className,
}: BRDateInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  // Estado interno de exibição: DD/MM/YYYY
  const [display, setDisplay] = useState<string>(() => isoToDisplay(value));
  const [touched, setTouched] = useState(false);
  const lastIso = useRef<string>(value);

  // Sincroniza valor externo → display quando muda por fora
  if (value !== lastIso.current) {
    lastIso.current = value;
    const next = isoToDisplay(value);
    // Só atualiza se diferente para evitar loop
    if (next !== display) {
      setDisplay(next);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Extrai apenas dígitos
    const digits = raw.replace(/\D/g, "");
    const masked = applyMask(digits);
    setDisplay(masked);

    const iso = displayToIso(masked);
    if (iso && isValidDate(masked) && isInRange(iso, min, max)) {
      onChange(iso);
      lastIso.current = iso;
    } else {
      // Limpa o valor externo quando incompleto/inválido
      onChange("");
      lastIso.current = "";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Permite: backspace, delete, tab, escape, enter, setas, home, end
    const allowed = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ];
    if (allowed.includes(e.key)) return;
    // Bloqueia tudo que não é dígito (inclui "/" pois a máscara coloca sozinha)
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  }

  const isComplete = display.replace(/\D/g, "").length === 8;
  const isValid = isComplete && isValidDate(display) && isInRange(displayToIso(display), min, max);
  const showError = error ?? (touched && isComplete && !isValid
    ? "Data inválida"
    : undefined);

  // ISO value a gravar no hidden input
  const hiddenValue = isValid ? displayToIso(display) : "";

  return (
    <label htmlFor={inputId} className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <span className="text-[12px] font-medium text-muted">{label}</span>
      )}
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTouched(true)}
        placeholder="dd/mm/aaaa"
        maxLength={10}
        required={required}
        autoComplete="bday"
        className={cn(
          "h-11 rounded-full border border-border bg-white px-4 text-sm text-ink",
          "placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500",
          showError &&
            "border-[color:var(--color-status-out)] focus:ring-[color:var(--color-status-out)]/20",
        )}
      />
      {/* Hidden input para server actions: sempre envia YYYY-MM-DD */}
      {name && (
        <input type="hidden" name={name} value={hiddenValue} />
      )}
      {showError ? (
        <span className="text-[12px] text-[color:var(--color-status-out)]">
          {showError}
        </span>
      ) : hint ? (
        <span className="text-[12px] text-muted">{hint}</span>
      ) : null}
    </label>
  );
}
