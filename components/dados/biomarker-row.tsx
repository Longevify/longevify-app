"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Biomarker, BiomarkerStatus } from "@/lib/mock-data";
import { BiomarkerDetailPopup } from "@/components/dados/biomarker-detail-popup";

// ─── Cores por status (alinhadas com o resto do app) ─────────────────────────

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
//
// Estilo direto do app Superpower (imagem 3): barra horizontal compacta
// mostrando faixa Ótimo + Normal + Fora, com dot colorido na posição do
// valor atual e marcador (tick) na extremidade indicando ponto de corte.

function MiniRangeBar({ biomarker }: { biomarker: Biomarker }) {
  const optMin = biomarker.optimalRange?.[0];
  const optMax = biomarker.optimalRange?.[1];
  const normMin = biomarker.normalRange?.[0];
  const normMax = biomarker.normalRange?.[1];

  // Domain visual: pega min/max das faixas (com padding) ou só valores conhecidos
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
      {/* Track base — cinza claro */}
      <div className="absolute inset-y-1/2 left-0 right-0 h-[3px] -translate-y-1/2 rounded-full bg-zinc-100" />

      {/* Faixa Ótimo — verde sutil */}
      {typeof optMin === "number" && typeof optMax === "number" && (
        <div
          className="absolute inset-y-1/2 h-[3px] -translate-y-1/2 rounded-full bg-emerald-200"
          style={{
            left: `${pct(optMin)}%`,
            width: `${pct(optMax) - pct(optMin)}%`,
          }}
        />
      )}

      {/* Faixa Normal — amarelo sutil */}
      {typeof normMin === "number" && typeof normMax === "number" && (
        <div
          className="absolute inset-y-1/2 h-[3px] -translate-y-1/2 rounded-full bg-amber-200"
          style={{
            left: `${pct(normMin)}%`,
            width: `${pct(normMax) - pct(normMin)}%`,
          }}
        />
      )}

      {/* Tick endpoints (pequenas linhas verticais nas extremidades das faixas) */}
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

      {/* Dot do valor atual */}
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
// Visual inspirado em Superpower (imagem 3): nome do marcador à esquerda,
// status pill com bullet + label colorida, valor + unit, range bar mini.
// Click abre popup detalhado "What's causing this?" (em vez de navegar pra
// página separada — mantém o usuário no contexto da página dados).

export function BiomarkerRow({
  biomarker,
  related,
  className,
}: {
  biomarker: Biomarker;
  /** Outros biomarcadores correlacionados pra mostrar no popup. */
  related?: Biomarker[];
  className?: string;
}) {
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setPopupOpen(true)}
        className={cn(
          "grid w-full items-center gap-4 px-5 py-4 text-left transition-colors",
          "grid-cols-[minmax(0,1fr)_auto_auto_140px] sm:grid-cols-[minmax(0,1fr)_auto_120px_180px]",
          "border-b border-zinc-100 last:border-none",
          "hover:bg-zinc-50/70",
          className,
        )}
      >
        {/* Nome do marcador */}
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold text-zinc-900 leading-tight">
            {biomarker.name}
          </div>
        </div>

        {/* Status pill (texto colorido + bullet) */}
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

        {/* Valor + unit (à direita do status) */}
        <div className="hidden text-right text-[14px] font-semibold tabular-nums text-zinc-900 sm:block">
          {biomarker.value}
          <span className="ml-1 text-[11px] font-normal text-zinc-400">
            {biomarker.unit}
          </span>
        </div>

        {/* Range bar mini */}
        <div className="w-[140px] sm:w-[180px]">
          <MiniRangeBar biomarker={biomarker} />
        </div>
      </button>

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

// ─── Versão "link" antiga preservada pra rota /dados/[biomarkerId] ───────────
// Mantida porque a rota dedicada ainda existe (com conteúdo educativo
// expandido). O click default é abrir popup.

export function BiomarkerRowLink({
  biomarker,
  className,
}: {
  biomarker: Biomarker;
  className?: string;
}) {
  return (
    <Link
      href={`/dados/${biomarker.id}`}
      className={cn(
        "grid w-full items-center gap-4 px-5 py-4 transition-colors",
        "grid-cols-[minmax(0,1fr)_auto_auto_140px] sm:grid-cols-[minmax(0,1fr)_auto_120px_180px]",
        "border-b border-zinc-100 last:border-none",
        "hover:bg-zinc-50/70",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-[14px] font-semibold text-zinc-900 leading-tight">
          {biomarker.name}
        </div>
      </div>
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
      <div className="hidden text-right text-[14px] font-semibold tabular-nums text-zinc-900 sm:block">
        {biomarker.value}
        <span className="ml-1 text-[11px] font-normal text-zinc-400">
          {biomarker.unit}
        </span>
      </div>
      <div className="w-[140px] sm:w-[180px]">
        <MiniRangeBar biomarker={biomarker} />
      </div>
    </Link>
  );
}
