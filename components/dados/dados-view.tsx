"use client";

import { useMemo, useState } from "react";
import { ScoreCard } from "@/components/dados/score-card";
import { BioAgeCard } from "@/components/dados/bio-age-card";
import { CategoryList } from "@/components/dados/category-list";
import { BiomarkersSummary } from "@/components/dados/biomarkers-summary";
import { BiomarkerRow } from "@/components/dados/biomarker-row";
import { Card } from "@/components/ui/card";
import {
  CATEGORIES,
  type Biomarker,
  type Patient,
} from "@/lib/mock-data";
import { formatDatePtBR } from "@/lib/utils";

interface DadosViewProps {
  patient: Patient;
  biomarkers: Biomarker[];
  stats: { total: number; optimal: number; normal: number; out: number };
}

export function DadosView({ patient, biomarkers, stats }: DadosViewProps) {
  const [categoryId, setCategoryId] = useState<string>("all");

  const filtered = useMemo(() => {
    if (categoryId === "all") return biomarkers;
    return biomarkers.filter((b) => b.categoryId === categoryId);
  }, [categoryId, biomarkers]);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        {/* M1: aside oculto em mobile — em 390px empilhava no topo antes do conteúdo */}
        <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          <CategoryList
            categories={CATEGORIES}
            activeId={categoryId}
            onChange={setCategoryId}
          />
        </aside>

        <section className="flex min-w-0 flex-col gap-6">
          {/* page header */}
          <div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-[28px] font-semibold tracking-tight">
                {patient.firstName}
              </h1>
              <span className="text-[16px] text-muted">
                — Dados de Saúde
              </span>
            </div>
            <div className="mt-1 text-[13px] text-muted">
              {formatDatePtBR(patient.latestExamDate)}
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ScoreCard
              score={patient.longevifyScore}
              status={patient.scoreStatus}
            />
            <BioAgeCard
              biologicalAge={patient.biologicalAge}
              chronologicalAge={patient.chronologicalAge}
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
