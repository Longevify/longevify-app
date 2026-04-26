"use client";

import { AlertTriangle } from "lucide-react";
import {
  BIOMARKER_CATALOG,
  classifyValue,
  isSanityWarning,
} from "@/lib/admin/biomarker-catalog";
import type { ExamBiomarkerValue } from "@/lib/admin/types";
import { BiomarkerStatusPreview } from "./biomarker-status-preview";

interface BiomarkerInputGridProps {
  values: Record<string, string>; // raw user input
  onChange: (id: string, raw: string) => void;
}

export function BiomarkerInputGrid({
  values,
  onChange,
}: BiomarkerInputGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {BIOMARKER_CATALOG.map((meta) => {
        const raw = values[meta.id] ?? "";
        const parsed = raw.trim() === "" ? NaN : Number(raw.replace(",", "."));
        const hasValue = Number.isFinite(parsed);
        const status = hasValue ? classifyValue(meta, parsed) : undefined;
        const sanityWarn = hasValue && isSanityWarning(meta, parsed);

        return (
          <div
            key={meta.id}
            className="flex flex-col gap-2 rounded-[14px] border border-border bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-ink">
                  {meta.name}
                </div>
                <div className="text-[11px] text-muted">
                  {meta.category} · Ref. {meta.referenceLabel}
                </div>
              </div>
              <BiomarkerStatusPreview status={status} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={raw}
                placeholder="—"
                onChange={(e) => onChange(meta.id, e.target.value)}
                className="h-10 w-full rounded-full border border-border bg-white px-4 text-[14px] tabular-nums outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                aria-label={`Valor de ${meta.name}`}
              />
              <span className="min-w-[52px] shrink-0 text-right text-[12px] text-muted">
                {meta.unit}
              </span>
            </div>
            {sanityWarn ? (
              <div className="flex items-center gap-2 text-[11px] text-[#B6333A]">
                <AlertTriangle className="h-3.5 w-3.5" />
                Valor fora da faixa de sanidade (máx plausível:{" "}
                {meta.sanityMax} {meta.unit}). Confirme antes de publicar.
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Converte o state bruto (strings) pra lista de ExamBiomarkerValue.
 * Ignora campos vazios/inválidos.
 */
export function computeExamValues(
  raw: Record<string, string>,
): ExamBiomarkerValue[] {
  const out: ExamBiomarkerValue[] = [];
  for (const meta of BIOMARKER_CATALOG) {
    const s = raw[meta.id];
    if (!s || s.trim() === "") continue;
    const n = Number(s.replace(",", "."));
    if (!Number.isFinite(n)) continue;
    out.push({
      biomarkerId: meta.id,
      value: n,
      status: classifyValue(meta, n),
    });
  }
  return out;
}
