"use client";

import { cn } from "@/lib/utils";
import type { AddressInput } from "@/app/(app)/coleta/agendar/actions";

const UF_LIST = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

interface AddressFormProps {
  value: AddressInput;
  onChange: (next: AddressInput) => void;
}

const inputClass =
  "h-11 w-full rounded-2xl border border-border bg-brand-50/30 px-4 text-[14px] text-ink outline-none transition-colors focus:border-brand-400 focus:bg-white placeholder:text-muted/60";

const labelClass = "flex flex-col gap-1.5";
const labelTextClass = "text-[12px] font-medium text-muted";

function formatZip(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 5) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return digits;
}

export function AddressForm({ value, onChange }: AddressFormProps) {
  function set<K extends keyof AddressInput>(key: K, val: AddressInput[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Linha 1: Estado + Cidade */}
      <div className="grid grid-cols-[120px_1fr] gap-3 sm:grid-cols-[120px_1fr]">
        <label className={labelClass}>
          <span className={labelTextClass}>Estado (UF)</span>
          <select
            value={value.state}
            onChange={(e) => set("state", e.target.value)}
            className={cn(inputClass, "cursor-pointer")}
          >
            <option value="">UF</option>
            {UF_LIST.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>Cidade</span>
          <input
            type="text"
            value={value.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="São Paulo"
            className={inputClass}
          />
        </label>
      </div>

      {/* Linha 2: CEP */}
      <label className={cn(labelClass, "sm:max-w-[200px]")}>
        <span className={labelTextClass}>CEP (opcional)</span>
        <input
          type="text"
          value={value.zip ?? ""}
          onChange={(e) => set("zip", formatZip(e.target.value))}
          placeholder="00000-000"
          inputMode="numeric"
          className={inputClass}
        />
      </label>

      {/* Linha 3: Rua + número */}
      <label className={labelClass}>
        <span className={labelTextClass}>Rua e número</span>
        <input
          type="text"
          value={value.street}
          onChange={(e) => set("street", e.target.value)}
          placeholder="Rua das Flores, 123"
          className={inputClass}
        />
      </label>

      {/* Linha 4: Complemento 1 */}
      <label className={labelClass}>
        <span className={labelTextClass}>Complemento 1 (opcional)</span>
        <input
          type="text"
          value={value.complement ?? ""}
          onChange={(e) => set("complement", e.target.value)}
          placeholder="Apto 502, Bloco B"
          className={inputClass}
        />
      </label>

      {/* Linha 5: Complemento 2 / Referência */}
      <label className={labelClass}>
        <span className={labelTextClass}>
          Complemento 2 / Ponto de referência (opcional)
        </span>
        <input
          type="text"
          value={value.reference ?? ""}
          onChange={(e) => set("reference", e.target.value)}
          placeholder="Próximo ao mercado Pão de Açúcar"
          className={inputClass}
        />
      </label>
    </div>
  );
}
