"use client";

import { Building2, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/products";
import type { CollectionLocation } from "@/lib/scheduling/slots";

interface LocationPickerProps {
  value: CollectionLocation;
  onChange: (next: CollectionLocation) => void;
  homeFeeBRL?: number;
}

const OPTIONS: {
  id: CollectionLocation;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "home",
    title: "Em domicílio",
    description:
      "Profissional Longevify vai até você no horário escolhido. Conforto + sem deslocamento.",
    icon: Home,
  },
  {
    id: "lab",
    title: "Laboratório parceiro",
    description:
      "Coleta na unidade Longevify mais próxima. Sem custo adicional e mais horários disponíveis.",
    icon: Building2,
  },
];

export function LocationPicker({
  value,
  onChange,
  homeFeeBRL = 120,
}: LocationPickerProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const selected = value === opt.id;
        const fee = opt.id === "home" ? homeFeeBRL : 0;
        return (
          <button
            type="button"
            key={opt.id}
            onClick={() => onChange(opt.id)}
            aria-pressed={selected}
            className={cn(
              "flex flex-col gap-2 rounded-2xl border p-4 text-left transition-colors",
              selected
                ? "border-brand-600 bg-brand-50 shadow-[0_8px_24px_-12px_rgba(13,40,24,.18)]"
                : "border-border bg-white hover:border-brand-300 hover:bg-brand-50/40",
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-xl",
                  selected
                    ? "bg-brand-700 text-white"
                    : "bg-brand-100 text-brand-700",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  fee > 0
                    ? "bg-amber-100 text-amber-800"
                    : "bg-brand-100 text-brand-800",
                )}
              >
                {fee > 0 ? `+${formatBRL(fee)}` : "Sem custo extra"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold leading-tight text-ink">
                {opt.title}
              </span>
              <span className="text-[12.5px] leading-snug text-muted">
                {opt.description}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
