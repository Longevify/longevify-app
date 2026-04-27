"use client";

import { cn } from "@/lib/utils";

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  min,
  max,
  step,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "numeric" | "decimal" | "text";
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      className={cn(
        "h-11 rounded-2xl border border-border bg-brand-50/30 px-4 text-[14px] text-ink outline-none transition-colors focus:border-brand-400 focus:bg-white",
        className,
      )}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="resize-y rounded-2xl border border-border bg-brand-50/30 px-4 py-3 text-[14px] text-ink outline-none transition-colors focus:border-brand-400 focus:bg-white"
    />
  );
}

export interface RadioOption<V extends string = string> {
  value: V;
  label: string;
  description?: string;
}

export function RadioGrid<V extends string = string>({
  options,
  value,
  onChange,
  cols = 2,
}: {
  options: readonly RadioOption<V>[];
  value: V | undefined;
  onChange: (v: V) => void;
  cols?: 2 | 3 | 4;
}) {
  const gridCls =
    cols === 4
      ? "grid-cols-2 sm:grid-cols-4"
      : cols === 3
        ? "grid-cols-2 sm:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";
  return (
    <div className={cn("grid gap-2", gridCls)}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            type="button"
            key={opt.value}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-2xl border px-3 py-3 text-left text-[13px] font-medium transition-colors",
              selected
                ? "border-brand-700 bg-brand-50 text-brand-900"
                : "border-border bg-white text-ink hover:border-brand-300 hover:bg-brand-50/40",
            )}
          >
            <span className="block leading-tight">{opt.label}</span>
            {opt.description ? (
              <span className="mt-1 block text-[11.5px] font-normal text-muted">
                {opt.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function YesNo({
  value,
  onChange,
}: {
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 max-w-[280px]">
      {[
        { v: true, label: "Sim" },
        { v: false, label: "Não" },
      ].map((o) => {
        const selected = value === o.v;
        return (
          <button
            type="button"
            key={String(o.v)}
            onClick={() => onChange(o.v)}
            aria-pressed={selected}
            className={cn(
              "rounded-2xl border px-4 py-2.5 text-[13px] font-medium transition-colors",
              selected
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-border bg-white text-ink hover:border-brand-300 hover:bg-brand-50/40",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
