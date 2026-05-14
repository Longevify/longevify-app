"use client";

import { useState } from "react";
import { TrendingUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreDetailPopup } from "@/components/dados/score-detail-popup";
import type { ScorePoint, OrganScore } from "@/lib/mock-data";

interface ScoreCardProps {
  score: number;
  status: "on-track" | "attention" | "at-risk";
  scoreHistory: ScorePoint[];
  organScores: OrganScore[];
  className?: string;
}

export function ScoreCard({
  score,
  status,
  scoreHistory,
  organScores,
  className,
}: ScoreCardProps) {
  const [open, setOpen] = useState(false);

  const statusLabel =
    status === "on-track"
      ? "No caminho"
      : status === "attention"
        ? "Atenção"
        : "Em Risco";

  const thumbPct = Math.min(Math.max(score, 0), 100);

  // Compara com histórico anterior pra mostrar delta
  const previous = scoreHistory[scoreHistory.length - 2]?.score;
  const delta = previous !== undefined ? score - previous : 0;

  return (
    <>
      <article
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(true);
        }}
        className={cn(
          // Card escuro premium com gradient e borda sutil
          "group relative overflow-hidden rounded-[24px] border border-white/5 p-6",
          "bg-gradient-to-br from-[#0d2818] via-[#143D28] to-[#0F3020] text-white",
          "shadow-[0_10px_40px_-12px_rgba(13,40,24,.4)]",
          "cursor-pointer transition-all duration-300 hover:shadow-[0_20px_50px_-12px_rgba(13,40,24,.5)] hover:-translate-y-0.5",
          className,
        )}
      >
        {/* Sparkle decorativo flutuante */}
        <span className="pointer-events-none absolute right-5 top-5 text-emerald-300/40 transition group-hover:text-emerald-300/60">
          <Sparkles className="h-4 w-4" />
        </span>

        {/* Glow radial decorativo */}
        <span className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Header */}
        <div className="relative flex items-center justify-between">
          <div className="text-[10px] font-semibold tracking-[0.18em] text-white/60 uppercase">
            Longevify Score
          </div>
        </div>

        {/* Score + status */}
        <div className="relative mt-3 flex items-end gap-3">
          <span className="bg-gradient-to-b from-white to-white/80 bg-clip-text text-[64px] leading-none font-semibold tracking-tight text-transparent">
            {score}
          </span>
          <div className="mb-2 flex flex-col gap-1">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-200 backdrop-blur ring-1 ring-emerald-400/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {statusLabel}
            </span>
            {delta !== 0 && (
              <span className="inline-flex items-center gap-1 text-[10.5px] text-white/70">
                <TrendingUp
                  className={cn(
                    "h-3 w-3",
                    delta > 0 ? "text-emerald-300" : "text-rose-300 rotate-180",
                  )}
                />
                {delta > 0 ? "+" : ""}
                {delta} vs mês passado
              </span>
            )}
          </div>
        </div>

        {/* Range bar com gradient + thumb pra fora (Lucas 2026-05) */}
        <div className="relative mt-7 pb-2">
          {/* A barra tem overflow-hidden pro gradient não vazar; o thumb fica
              fora desse container — posicionado num wrapper RELATIVE com a
              barra como filho ESPECÍFICO de overflow-hidden, e o thumb como
              filho IRMÃO sem overflow */}
          <div className="relative h-1.5 w-full">
            <div className="absolute inset-0 overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: "100%",
                  background:
                    "linear-gradient(90deg, #E85D5D 0%, #F39A50 25%, #E6B845 50%, #79C98E 75%, #10B981 100%)",
                }}
              />
            </div>
            {/* Thumb FORA da barra — círculo branco saliente acima */}
            <div
              className="absolute top-1/2 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,.25)] ring-2 ring-emerald-400"
              style={{ left: `${thumbPct}%` }}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[9.5px] font-medium text-white/40">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
      </article>

      <ScoreDetailPopup
        open={open}
        onClose={() => setOpen(false)}
        score={score}
        status={status}
        scoreHistory={scoreHistory}
        organScores={organScores}
      />
    </>
  );
}
