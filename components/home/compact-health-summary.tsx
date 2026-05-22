"use client";

import { useState } from "react";
import { Sparkles, Calendar, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreDetailPopup } from "@/components/dados/score-detail-popup";
import { BioAgeDetailPopup } from "@/components/dados/bioage-detail-popup";
import type {
  ScorePoint,
  OrganScore,
  BioAgePoint,
  OrganBioAge,
} from "@/lib/mock-data";

/**
 * Lucas (2026-05-20): "quero que o longevify score e idade biológica
 * fiquem menores" — cards compactos.
 *
 * Lucas (2026-05-22): "os cards longevify score e idade biológica
 * sejam um pouco mais robustos e menos longos, dando mais espaço para
 * a aba de suas tarefas."
 *
 * Lucas (2026-05-22, segunda iteração): "os scores estão mais
 * alongados do que antes, eles tem que ser mais curtos e maiores de
 * altura (altura como estava antes da alteração, porém largura menor
 * do que estava antes)." → Layout vertical original (altura
 * compacta ~96px com label-em-cima / número-grande / status-pill /
 * barra-progresso embaixo). Largura menor é controlada externamente
 * via grid do home/page.tsx (coluna mais estreita).
 */

interface CompactHealthSummaryProps {
  score: number;
  scoreStatus: "on-track" | "attention" | "at-risk";
  scoreHistory: ScorePoint[];
  organScores: OrganScore[];
  biologicalAge: number;
  chronologicalAge: number;
  biologicalAgeHistory: BioAgePoint[];
  organBioAges: OrganBioAge[];
  className?: string;
}

export function CompactHealthSummary({
  score,
  scoreStatus,
  scoreHistory,
  organScores,
  biologicalAge,
  chronologicalAge,
  biologicalAgeHistory,
  organBioAges,
  className,
}: CompactHealthSummaryProps) {
  const [scoreOpen, setScoreOpen] = useState(false);
  const [bioOpen, setBioOpen] = useState(false);

  const previousScore = scoreHistory[scoreHistory.length - 2]?.score;
  const scoreDelta =
    previousScore !== undefined ? score - previousScore : 0;

  const bioDiff = +(chronologicalAge - biologicalAge).toFixed(1);
  const younger = bioDiff > 0;

  const statusLabel =
    scoreStatus === "on-track"
      ? "No caminho"
      : scoreStatus === "attention"
        ? "Atenção"
        : "Em risco";

  return (
    <>
      {/* Lucas (2026-05-22): "não está alinhado na parte de baixo" — wrapper
          ganha lg:h-full + cards usam lg:flex-1 pra dividir altura igualmente
          e match a altura do TodoSidebar (caderno) ao lado direito do grid. */}
      <div className={cn("flex flex-col gap-3 lg:h-full", className)}>
        {/* Score — escuro premium, layout vertical compacto (original) */}
        <button
          type="button"
          data-tour="score-card"
          onClick={() => setScoreOpen(true)}
          className="group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#0d2818] via-[#143D28] to-[#0F3020] p-4 text-left text-white shadow-[0_8px_24px_-12px_rgba(13,40,24,.4)] transition hover:shadow-[0_12px_30px_-12px_rgba(13,40,24,.5)] hover:-translate-y-0.5 lg:flex-1"
        >
          <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
          <span className="pointer-events-none absolute right-3 top-3 text-emerald-300/40">
            <Sparkles className="h-3.5 w-3.5" />
          </span>

          <div className="relative">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
              Longevify Score
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="bg-gradient-to-b from-white to-white/80 bg-clip-text text-[34px] font-semibold leading-none tracking-tight text-transparent">
                {score}
              </span>
              {scoreDelta !== 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-200">
                  <TrendingUp
                    className={cn(
                      "h-3 w-3",
                      scoreDelta > 0
                        ? "text-emerald-300"
                        : "rotate-180 text-rose-300",
                    )}
                  />
                  {scoreDelta > 0 ? "+" : ""}
                  {scoreDelta}
                </span>
              )}
            </div>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 ring-1 ring-emerald-400/20">
              <span className="h-1 w-1 rounded-full bg-emerald-400" />
              {statusLabel}
            </div>

            <div className="relative mt-3 pb-1">
              <div className="relative h-1 w-full">
                <div className="absolute inset-0 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: "100%",
                      background:
                        "linear-gradient(90deg, #E85D5D 0%, #F39A50 25%, #E6B845 50%, #79C98E 75%, #10B981 100%)",
                    }}
                  />
                </div>
                <div
                  className="absolute top-1/2 grid h-3 w-3 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,.3)] ring-2 ring-emerald-400"
                  style={{ left: `${Math.max(0, Math.min(100, score))}%` }}
                >
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                </div>
              </div>
              <div className="mt-1 flex justify-between text-[8.5px] font-medium text-white/40">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </button>

        {/* Bio Age — clean white, layout vertical compacto (original) */}
        <button
          type="button"
          data-tour="bio-age-card"
          onClick={() => setBioOpen(true)}
          className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 text-left shadow-[0_8px_24px_-15px_rgba(13,40,24,.18)] transition hover:shadow-[0_12px_30px_-15px_rgba(13,40,24,.22)] hover:-translate-y-0.5 lg:flex-1"
        >
          <span className="pointer-events-none absolute right-3 top-3 text-emerald-400">
            <Calendar className="h-3.5 w-3.5" />
          </span>

          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Idade Biológica
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[34px] font-semibold leading-none tracking-tight text-zinc-900">
              {biologicalAge}
            </span>
            <span className="text-[12px] text-zinc-500">anos</span>
          </div>
          <div
            className={cn(
              "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              younger
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : bioDiff === 0
                  ? "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200"
                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
            )}
          >
            {bioDiff === 0
              ? "igual à cronológica"
              : younger
                ? `${Math.abs(bioDiff)}a mais jovem`
                : `${Math.abs(bioDiff)}a mais velho`}
          </div>

          <div className="relative mt-3 pb-1">
            <div className="relative h-1 w-full">
              <div className="absolute inset-0 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: "100%",
                    background:
                      "linear-gradient(90deg, #10B981 0%, #79C98E 30%, #E6B845 60%, #F39A50 80%, #E85D5D 100%)",
                  }}
                />
              </div>
              <div
                className="absolute top-1/2 h-2 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-400/60"
                style={{
                  left: `${Math.max(0, Math.min(100, chronologicalAge))}%`,
                }}
                aria-label={`Idade cronológica: ${chronologicalAge}`}
              />
              <div
                className={cn(
                  "absolute top-1/2 grid h-3 w-3 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,.25)] ring-2",
                  younger ? "ring-emerald-500" : "ring-amber-500",
                )}
                style={{
                  left: `${Math.max(0, Math.min(100, biologicalAge))}%`,
                }}
              >
                <span
                  className={cn(
                    "h-1 w-1 rounded-full",
                    younger ? "bg-emerald-500" : "bg-amber-500",
                  )}
                />
              </div>
            </div>
            <div className="mt-1 flex justify-between text-[8.5px] font-medium text-zinc-400">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </button>
      </div>

      <ScoreDetailPopup
        open={scoreOpen}
        onClose={() => setScoreOpen(false)}
        score={score}
        status={scoreStatus}
        scoreHistory={scoreHistory}
        organScores={organScores}
      />
      <BioAgeDetailPopup
        open={bioOpen}
        onClose={() => setBioOpen(false)}
        biologicalAge={biologicalAge}
        chronologicalAge={chronologicalAge}
        biologicalAgeHistory={biologicalAgeHistory}
        organBioAges={organBioAges}
      />
    </>
  );
}
