"use client";

import { useState } from "react";
import { TrendingDown, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { BioAgeDetailPopup } from "@/components/dados/bioage-detail-popup";
import type { BioAgePoint, OrganBioAge } from "@/lib/mock-data";

interface BioAgeCardProps {
  biologicalAge: number;
  chronologicalAge: number;
  biologicalAgeHistory: BioAgePoint[];
  organBioAges: OrganBioAge[];
  className?: string;
}

export function BioAgeCard({
  biologicalAge,
  chronologicalAge,
  biologicalAgeHistory,
  organBioAges,
  className,
}: BioAgeCardProps) {
  const [open, setOpen] = useState(false);

  const diff = +(chronologicalAge - biologicalAge).toFixed(1);
  const younger = diff > 0;
  const relative =
    diff === 0
      ? "igual à sua idade real"
      : younger
        ? `${Math.abs(diff)} anos mais jovem`
        : `${Math.abs(diff)} anos mais velho`;

  // Lucas (2026-05-20): "a barra de idade biológica deve ir de 0 a 100".
  // Range completo da vida pra contextualizar visualmente — 20-60 antes
  // amplificava demais diferenças pequenas.
  const min = 0;
  const max = 100;
  const pct = ((biologicalAge - min) / (max - min)) * 100;
  const chronoPct = ((chronologicalAge - min) / (max - min)) * 100;

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
          "group relative overflow-hidden rounded-[24px] border border-zinc-200/80 bg-white p-6",
          "shadow-[0_10px_40px_-15px_rgba(13,40,24,.18)]",
          "cursor-pointer transition-all duration-300 hover:shadow-[0_20px_50px_-15px_rgba(13,40,24,.22)] hover:-translate-y-0.5",
          className,
        )}
      >
        <span className="pointer-events-none absolute right-5 top-5 text-emerald-400">
          <Calendar className="h-4 w-4" />
        </span>
        <span className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-100/40 blur-3xl" />

        <div className="relative text-[10px] font-semibold tracking-[0.18em] text-zinc-500 uppercase">
          Idade Biológica
        </div>

        <div className="relative mt-3 flex items-end gap-3">
          <span className="bg-gradient-to-b from-zinc-900 to-zinc-700 bg-clip-text text-[64px] leading-none font-semibold tracking-tight text-transparent">
            {biologicalAge}
          </span>
          <div className="mb-2 flex flex-col gap-1">
            <span className="text-[10.5px] font-medium text-zinc-500">
              anos
            </span>
            <span
              className={cn(
                "inline-flex w-fit items-center gap-1 text-[10.5px] font-semibold",
                younger
                  ? "text-emerald-600"
                  : diff < 0
                    ? "text-rose-500"
                    : "text-zinc-500",
              )}
            >
              {younger && <TrendingDown className="h-3 w-3" />}
              {relative}
            </span>
          </div>
        </div>

        <div className="relative mt-7 pb-2">
          <div className="relative h-1.5 w-full">
            <div className="absolute inset-0 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: "100%",
                  background:
                    "linear-gradient(90deg, #10B981 0%, #79C98E 40%, #E6B845 70%, #E85D5D 100%)",
                }}
              />
            </div>
            {/* Marker da idade cronológica (linha vertical sutil) */}
            <div
              className="absolute top-1/2 h-5 w-[1.5px] -translate-y-1/2 bg-zinc-400/70"
              style={{ left: `${chronoPct}%` }}
              title={`Cronológica ${chronologicalAge}`}
            />
            {/* Thumb FORA da barra — círculo branco saliente */}
            <div
              className="absolute top-1/2 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,.15)] ring-2 ring-emerald-500"
              style={{ left: `${pct}%` }}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[9.5px] font-medium text-zinc-400">
            <span>20</span>
            <span>40</span>
            <span>60</span>
          </div>
        </div>
      </article>

      <BioAgeDetailPopup
        open={open}
        onClose={() => setOpen(false)}
        biologicalAge={biologicalAge}
        chronologicalAge={chronologicalAge}
        biologicalAgeHistory={biologicalAgeHistory}
        organBioAges={organBioAges}
      />
    </>
  );
}
