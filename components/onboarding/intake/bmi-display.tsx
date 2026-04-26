"use client";

import { calcBMI } from "@/lib/intake/schema";
import { cn } from "@/lib/utils";

interface BMIDisplayProps {
  heightCm?: number;
  weightKg?: number;
}

const BAND_LABEL: Record<string, string> = {
  abaixo: "Abaixo do peso",
  normal: "Faixa saudável",
  sobrepeso: "Sobrepeso",
  obesidade: "Obesidade",
};

const BAND_COLOR: Record<string, string> = {
  abaixo: "text-[#8A6A13] bg-[#FBF0D4]",
  normal: "text-[#0E7B45] bg-[#DFF5E9]",
  sobrepeso: "text-[#A85A1B] bg-[#FBE7D1]",
  obesidade: "text-[#B6333A] bg-[#FBE1E1]",
};

export function BMIDisplay({ heightCm, weightKg }: BMIDisplayProps) {
  const bmi = calcBMI(heightCm, weightKg);
  if (!bmi) return null;
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-brand-50/30 px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
          Seu IMC
        </span>
        <span className="text-[20px] font-semibold tabular-nums text-ink">
          {bmi.value.toFixed(1)}
        </span>
      </div>
      <span
        className={cn(
          "rounded-full px-3 py-1 text-[12px] font-medium",
          BAND_COLOR[bmi.band],
        )}
      >
        {BAND_LABEL[bmi.band]}
      </span>
    </div>
  );
}
