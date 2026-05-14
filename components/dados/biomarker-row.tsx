"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Biomarker, BiomarkerStatus } from "@/lib/mock-data";
import { BiomarkerDetailPopup } from "@/components/dados/biomarker-detail-popup";

// ─── Cores por status ────────────────────────────────────────────────────────

const STATUS_TEXT_COLOR: Record<BiomarkerStatus, string> = {
  optimal: "text-emerald-600",
  normal: "text-amber-500",
  out: "text-rose-500",
};

const STATUS_DOT_COLOR: Record<BiomarkerStatus, string> = {
  optimal: "bg-emerald-500",
  normal: "bg-amber-500",
  out: "bg-rose-500",
};

const STATUS_LABEL: Record<BiomarkerStatus, string> = {
  optimal: "Ótimo",
  normal: "Normal",
  out: "Fora",
};

// ─── Range bar mini horizontal ───────────────────────────────────────────────

function MiniRangeBar({ biomarker }: { biomarker: Biomarker }) {
  const optMin = biomarker.optimalRange?.[0];
  const optMax = biomarker.optimalRange?.[1];
  const normMin = biomarker.normalRange?.[0];
  const normMax = biomarker.normalRange?.[1];

  const allBounds = [optMin, optMax, normMin, normMax, biomarker.value].filter(
    (v): v is number => typeof v === "number",
  );
  const rawMin = Math.min(...allBounds);
  const rawMax = Math.max(...allBounds);
  const span = rawMax - rawMin;
  const pad = Math.max(span * 0.1, rawMax * 0.05, 1);
  const yMin = Math.max(0, rawMin - pad);
  const yMax = rawMax + pad;
  const range = yMax - yMin;

  function pct(v: number): number {
    return ((v - yMin) / range) * 100;
  }

  const dotPct = pct(biomarker.value);
  const statusColor =
    biomarker.status === "optimal"
      ? "#10b981"
      : biomarker.status === "normal"
        ? "#f59e0b"
        : "#f43f5e";

  return (
    <div className="relative h-6 w-full">
      <div className="absolute inset-y-1/2 left-0 right-0 h-[3px] -translate-y-1/2 rounded-full bg-zinc-100" />
      {typeof optMin === "number" && typeof optMax === "number" && (
        <div
          className="absolute inset-y-1/2 h-[3px] -translate-y-1/2 rounded-full bg-emerald-200"
          style={{
            left: `${pct(optMin)}%`,
            width: `${pct(optMax) - pct(optMin)}%`,
          }}
        />
      )}
      {typeof normMin === "number" && typeof normMax === "number" && (
        <div
          className="absolute inset-y-1/2 h-[3px] -translate-y-1/2 rounded-full bg-amber-200"
          style={{
            left: `${pct(normMin)}%`,
            width: `${pct(normMax) - pct(normMin)}%`,
          }}
        />
      )}
      {typeof optMax === "number" && (
        <span
          className="absolute h-3 w-[1.5px] -translate-y-1/2 bg-emerald-400"
          style={{ left: `${pct(optMax)}%`, top: "50%" }}
        />
      )}
      {typeof normMax === "number" && (
        <span
          className="absolute h-3 w-[1.5px] -translate-y-1/2 bg-amber-400"
          style={{ left: `${pct(normMax)}%`, top: "50%" }}
        />
      )}
      <div
        className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
        style={{
          left: `${dotPct}%`,
          top: "50%",
          backgroundColor: statusColor,
        }}
      />
    </div>
  );
}

// ─── Row principal ───────────────────────────────────────────────────────────
//
// Comportamento (Lucas 2026-05):
//   - Click no botão Eye (à esquerda do valor) → abre POPUP rápido
//   - Click em qualquer outro lugar da row → vai pra ANÁLISE COMPLETA
//     (página dedicada /dados/[biomarkerId])
//
// Visual: o wrapper é um <Link>; o botão Eye é um <button> que faz
// e.preventDefault() pra interceptar antes do Link navegar.

export function BiomarkerRow({
  biomarker,
  related,
  className,
}: {
  biomarker: Biomarker;
  related?: Biomarker[];
  className?: string;
}) {
  const [popupOpen, setPopupOpen] = useState(false);

  function handleQuickPreview(e: React.MouseEvent | React.KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPopupOpen(true);
  }

  return (
    <>
      <Link
        href={`/dados/${biomarker.id}`}
        className={cn(
          "grid w-full items-center gap-3 px-5 py-4 text-left transition-colors",
          "grid-cols-[minmax(0,1fr)_auto_auto_auto_140px] sm:grid-cols-[minmax(0,1fr)_auto_auto_120px_180px]",
          "border-b border-zinc-100 last:border-none",
          "hover:bg-zinc-50/70",
          className,
        )}
      >
        {/* Nome */}
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold text-zinc-900 leading-tight">
            {biomarker.name}
          </div>
        </div>

        {/* Status pill */}
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              STATUS_DOT_COLOR[biomarker.status],
            )}
          />
          <span
            className={cn(
              "text-[12px] font-medium",
              STATUS_TEXT_COLOR[biomarker.status],
            )}
          >
            {STATUS_LABEL[biomarker.status]}
          </span>
        </div>

        {/* Botão "Análise rápida" — ícone olho minimalista */}
        <button
          type="button"
          onClick={handleQuickPreview}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleQuickPreview(e);
          }}
          aria-label={`Análise rápida de ${biomarker.name}`}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-brand-700"
        >
          <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />
        </button>

        {/* Valor + unit */}
        <div className="hidden text-right text-[14px] font-semibold tabular-nums text-zinc-900 sm:block">
          {(+biomarker.value.toFixed(2)).toString()}
          <span className="ml-1 text-[11px] font-normal text-zinc-400">
            {biomarker.unit}
          </span>
        </div>

        {/* Range bar */}
        <div className="w-[140px] sm:w-[180px]">
          <MiniRangeBar biomarker={biomarker} />
        </div>
      </Link>

      {popupOpen && (
        <BiomarkerDetailPopup
          biomarker={biomarker}
          related={related ?? []}
          onClose={() => setPopupOpen(false)}
        />
      )}
    </>
  );
}
