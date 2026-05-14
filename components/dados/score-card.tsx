"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScoreDetailPopup } from "@/components/dados/score-detail-popup";
import type { ScorePoint } from "@/lib/mock-data";

interface ScoreCardProps {
  score: number;
  status: "on-track" | "attention" | "at-risk";
  scoreHistory?: ScorePoint[];
  className?: string;
}

export function ScoreCard({ score, status, scoreHistory, className }: ScoreCardProps) {
  const [open, setOpen] = useState(false);

  const statusLabel =
    status === "on-track"
      ? "On Track"
      : status === "attention"
        ? "Atenção"
        : "Em Risco";

  // position the progress thumb along the 0-100 bar
  const thumbPct = Math.min(Math.max(score, 0), 100);

  return (
    <>
      <article
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-label="Ver histórico do Longevify Score"
        className={cn(
          // border-transparent: alinha caixa de conteúdo com BioAgeCard (que tem border-border).
          // Sem isso, box-sizing: border-box subtrai 2px da BioAgeCard e a barra interna fica desalinhada.
          "relative overflow-hidden rounded-[20px] border border-transparent p-6",
          "bg-gradient-to-br from-[#143D28] via-[#0F3020] to-[#0C2418] text-white",
          "shadow-[0_1px_2px_rgba(13,40,24,.08)]",
          "cursor-pointer select-none",
          "transition-transform hover:scale-[1.015] active:scale-[0.99]",
          className,
        )}
      >
        <div className="text-[11px] font-semibold tracking-[0.14em] text-white/70 uppercase">
          Longevify Score
        </div>
        <div className="mt-3 flex items-end gap-3">
          <span className="text-[56px] leading-none font-semibold tracking-tight">
            {score}
          </span>
          <span className="mb-2 inline-flex items-center rounded-full bg-white/10 px-3 h-7 text-[12px] font-medium text-white/90 backdrop-blur">
            {statusLabel}
          </span>
        </div>
        <div className="mt-6">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: "100%",
                background:
                  "linear-gradient(90deg, #E85D5D 0%, #F39A50 25%, #E6B845 50%, #79C98E 75%, #10B981 100%)",
              }}
            />
            <div
              className="absolute -top-1 h-3.5 w-[2px] bg-white"
              style={{ left: `calc(${thumbPct}% - 1px)` }}
            />
          </div>
        </div>

        {/* Hint */}
        <div className="absolute bottom-3 right-4 text-[10px] text-white/35 font-medium">
          Toque para detalhar
        </div>
      </article>

      <ScoreDetailPopup
        open={open}
        onClose={() => setOpen(false)}
        score={score}
        status={status}
        history={scoreHistory ?? []}
      />
    </>
  );
}
