"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ScoreCard } from "@/components/dados/score-card";
import { BioAgeCard } from "@/components/dados/bio-age-card";
import { CategoryList } from "@/components/dados/category-list";
import { BiomarkersSummary } from "@/components/dados/biomarkers-summary";
import { BiomarkerRow } from "@/components/dados/biomarker-row";

// 3D Canvas precisa de WebGL — só renderiza no client. SSR causa React #418
// (hydration mismatch) porque o Three.js gera DOM diferente no servidor.
const BodyAvatar3D = dynamic(
  () => import("@/components/dados/body-avatar-3d").then((m) => m.BodyAvatar3D),
  { ssr: false },
);
import { Card } from "@/components/ui/card";
import {
  CATEGORIES,
  type Biomarker,
  type CategoryGrade,
  type Patient,
} from "@/lib/mock-data";
import { formatDatePtBR } from "@/lib/utils";

// Mapping grade da categoria → cor de destaque do avatar.
// A = "Ótimo" (verde), B = "Normal" (amarelo), C = "Atenção" (laranja),
// D = "Fora" (vermelho). Cores espelham var(--color-status-*) do CSS.
const GRADE_COLORS: Record<CategoryGrade, string> = {
  A: "#0E7B45", // status-optimal
  B: "#E6B845", // status-normal
  C: "#F39A50", // warning (entre normal e out)
  D: "#E85D5D", // status-out
};

interface DadosViewProps {
  patient: Patient;
  biomarkers: Biomarker[];
  stats: { total: number; optimal: number; normal: number; out: number };
}

const ORGAN_CATEGORY_IDS = new Set([
  "all",
  "heart",
  "brain",
  "liver",
  "kidneys",
  "lungs",
  "intestine",
  "pancreas",
]);
const visibleCategories = CATEGORIES.filter((c) =>
  ORGAN_CATEGORY_IDS.has(c.id),
);

export function DadosView({ patient, biomarkers, stats }: DadosViewProps) {
  const [categoryId, setCategoryId] = useState<string>("all");

  const filtered = useMemo(() => {
    if (categoryId === "all") return biomarkers;
    return biomarkers.filter((b) => b.categoryId === categoryId);
  }, [categoryId, biomarkers]);

  // Cor de destaque no avatar baseada no grade da categoria selecionada.
  // Default verde A se categoria sem grade (ex: "all" sem dados).
  const activeColor = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.id === categoryId);
    return GRADE_COLORS[cat?.grade ?? "A"];
  }, [categoryId]);

  const renderBiomarkersCard = () => (
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
  );

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
      {/* ──────────────────────────────────────────────────────────────────
          MOBILE (< lg) — layout compacto inspirado no mockup:
          header grande + lista compacta de categorias com avatar à direita
          + KPI compacto (score/idade biológica) + lista de biomarcadores.
          ────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 lg:hidden">
        <header>
          <h1 className="text-[32px] leading-[1.05] font-semibold tracking-tight">
            Seus Dados
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            {stats.total} biomarcadores · {formatDatePtBR(patient.latestExamDate)}
          </p>
        </header>

        {/*
          Lista de categorias (shortLabels) à esquerda + avatar 3D à direita.
          Avatar tem altura própria pra não esticar a lista (auto rows).
        */}
        <div className="grid grid-cols-[1fr_140px] items-start gap-3">
          <CategoryList
            categories={visibleCategories}
            activeId={categoryId}
            onChange={setCategoryId}
            compact
          />
          <BodyAvatar3D
            sex={patient.sex}
            activeCategoryId={categoryId}
            activeColor={activeColor}
            className="w-full max-w-[140px]"
          />
        </div>

        {/* KPI compacto — score + idade biológica em duas colunas grandes */}
        <div className="grid grid-cols-2 gap-4 px-1">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-[40px] leading-none font-semibold tracking-tight text-ink">
                {patient.longevifyScore}
              </span>
              <span className="text-[16px] text-muted">/100</span>
            </div>
            <p className="mt-1 text-[13px] text-muted">pontuação longevify</p>
          </div>
          <div>
            <div className="text-[40px] leading-none font-semibold tracking-tight text-ink">
              {patient.biologicalAge}
            </div>
            <p className="mt-1 text-[13px] text-muted">idade biológica</p>
          </div>
        </div>

        {renderBiomarkersCard()}
      </div>

      {/* ──────────────────────────────────────────────────────────────────
          DESKTOP (lg+) — grid de 3 colunas: categorias | avatar | section.
          Nada muda do que já existia.
          ────────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:grid lg:grid-cols-[260px_280px_1fr] lg:gap-8">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <CategoryList
            categories={visibleCategories}
            activeId={categoryId}
            onChange={setCategoryId}
          />
        </aside>

        <aside className="lg:sticky lg:top-24 lg:flex lg:items-start lg:justify-center lg:self-start">
          <BodyAvatar3D
            sex={patient.sex}
            activeCategoryId={categoryId}
            activeColor={activeColor}
            className="w-[280px]"
          />
        </aside>

        <section className="flex min-w-0 flex-col gap-6">
          {/* page header */}
          <div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-[28px] font-semibold tracking-tight">
                {patient.firstName}
              </h1>
              <span className="text-[16px] text-muted">— Dados de Saúde</span>
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
              scoreHistory={patient.scoreHistory}
            />
            <BioAgeCard
              biologicalAge={patient.biologicalAge}
              chronologicalAge={patient.chronologicalAge}
              biologicalAgeHistory={patient.biologicalAgeHistory}
              organBioAges={patient.organBioAges}
            />
          </div>

          {renderBiomarkersCard()}
        </section>
      </div>
    </div>
  );
}
