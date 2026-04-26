"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScoreCard } from "@/components/dados/score-card";
import { BioAgeCard } from "@/components/dados/bio-age-card";
import { CategoryList } from "@/components/dados/category-list";
import { BiomarkersSummary } from "@/components/dados/biomarkers-summary";
import { BiomarkerRow } from "@/components/dados/biomarker-row";
import { TimeRangeTabs, type TimeRange } from "@/components/dados/time-range";
import {
  BIOMARKERS,
  CATEGORIES,
  PATIENT,
  biomarkersStats,
} from "@/lib/mock-data";
import { formatDatePtBR } from "@/lib/utils";

export default function DadosPage() {
  const [categoryId, setCategoryId] = useState<string>("all");
  const [range, setRange] = useState<TimeRange>("year");

  const stats = biomarkersStats();
  const filtered = useMemo(() => {
    if (categoryId === "all") return BIOMARKERS;
    return BIOMARKERS.filter((b) => b.categoryId === categoryId);
  }, [categoryId]);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <CategoryList
            categories={CATEGORIES}
            activeId={categoryId}
            onChange={setCategoryId}
          />
        </aside>

        <section className="flex min-w-0 flex-col gap-6">
          {/* page header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-3">
                <h1 className="text-[28px] font-semibold tracking-tight">
                  {PATIENT.firstName}
                </h1>
                <span className="text-[16px] text-muted">
                  — Dados de Saúde
                </span>
              </div>
              <div className="mt-1 text-[13px] text-muted">
                {formatDatePtBR(PATIENT.latestExamDate)}
              </div>
            </div>
            <TimeRangeTabs value={range} onChange={setRange} />
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ScoreCard
              score={PATIENT.longevifyScore}
              status={PATIENT.scoreStatus}
            />
            <BioAgeCard
              biologicalAge={PATIENT.biologicalAge}
              chronologicalAge={PATIENT.chronologicalAge}
            />
          </div>

          {/* Biomarkers */}
          <Card className="overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <BiomarkersSummary stats={stats} />
            </div>
            <div className="mt-1">
              {filtered.map((b) => (
                <BiomarkerRow key={b.id} biomarker={b} />
              ))}
              {filtered.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted">
                  Nenhum biomarcador nessa categoria ainda.
                </div>
              ) : null}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
