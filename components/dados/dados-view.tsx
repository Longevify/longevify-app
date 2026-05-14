"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ScoreCard } from "@/components/dados/score-card";
import { BioAgeCard } from "@/components/dados/bio-age-card";
import { ScoreDetailPopup } from "@/components/dados/score-detail-popup";
import { BioAgeDetailPopup } from "@/components/dados/bioage-detail-popup";
import { CategoryList } from "@/components/dados/category-list";
import { BiomarkersSummary } from "@/components/dados/biomarkers-summary";
import { BiomarkerRow } from "@/components/dados/biomarker-row";
import { Card } from "@/components/ui/card";

// BodyMannequin é Three.js Canvas — precisa SSR off pra evitar hydration
// mismatch (React #418) que o Three.js dispara renderizando WebGL diferente
// no servidor.
const BodyMannequin = dynamic(
  () =>
    import("@/components/dados/body-mannequin").then((m) => m.BodyMannequin),
  { ssr: false },
);
import {
  CATEGORIES,
  type Biomarker,
  type CategoryGrade,
  type Patient,
} from "@/lib/mock-data";
import { cn, formatDatePtBR } from "@/lib/utils";

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
  // Override de sexo só no modo demo — permite Lucas visualizar male/female
  // sem trocar o mock. Default usa patient.sex.
  const [sexOverride, setSexOverride] = useState<typeof patient.sex | null>(
    null,
  );
  const displaySex = sexOverride ?? patient.sex;
  // KPI mobile clicáveis — abrem o popup vertical de detalhe (mesmo dos cards desktop)
  const [scorePopupOpen, setScorePopupOpen] = useState(false);
  const [bioAgePopupOpen, setBioAgePopupOpen] = useState(false);

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

  // Toggle de sexo (só visível no demo) — pra Lucas comparar male/female
  const renderSexToggle = () => (
    <div className="flex items-center gap-1 rounded-full border border-border bg-surface/80 p-1 backdrop-blur">
      <button
        type="button"
        onClick={() => setSexOverride("male")}
        className={cn(
          "rounded-full px-3 h-7 text-[12px] font-medium transition",
          displaySex === "male"
            ? "bg-brand-700 text-white"
            : "text-muted hover:text-ink",
        )}
      >
        ♂ Masculino
      </button>
      <button
        type="button"
        onClick={() => setSexOverride("female")}
        className={cn(
          "rounded-full px-3 h-7 text-[12px] font-medium transition",
          displaySex === "female"
            ? "bg-brand-700 text-white"
            : "text-muted hover:text-ink",
        )}
      >
        ♀ Feminino
      </button>
    </div>
  );

  const renderBiomarkersCard = () => (
    <Card className="overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <BiomarkersSummary stats={stats} />
      </div>
      <div className="mt-1">
        {filtered.map((b) => (
          <BiomarkerRow
            key={b.id}
            biomarker={b}
            related={biomarkers.filter(
              (other) =>
                other.id !== b.id && other.categoryId === b.categoryId,
            )}
          />
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
          <div className="flex flex-col items-center gap-2">
            {/* Ring sutil ao redor do avatar tinge na cor do grade da
                categoria ativa — mesma técnica do antigo BodyAvatar3D. */}
            <div
              className="relative w-full max-w-[140px] rounded-2xl transition-shadow"
              style={{
                boxShadow:
                  categoryId === "all"
                    ? "none"
                    : `0 0 0 2px ${activeColor}22, 0 12px 32px -10px ${activeColor}55`,
              }}
            >
              <BodyMannequin sex={displaySex} />
            </div>
            {renderSexToggle()}
          </div>
        </div>

        {/* KPI compacto — score + idade biológica em duas colunas clicáveis.
            Clique abre os popups verticais (mesmos dos cards do desktop). */}
        <div className="grid grid-cols-2 gap-4 px-1">
          <button
            type="button"
            onClick={() => setScorePopupOpen(true)}
            className="text-left transition-opacity hover:opacity-80 active:opacity-60"
          >
            <div className="flex items-baseline gap-1">
              <span className="text-[40px] leading-none font-semibold tracking-tight text-ink">
                {patient.longevifyScore}
              </span>
              <span className="text-[16px] text-muted">/100</span>
            </div>
            <p className="mt-1 text-[13px] text-muted">pontuação longevify</p>
          </button>
          <button
            type="button"
            onClick={() => setBioAgePopupOpen(true)}
            className="text-left transition-opacity hover:opacity-80 active:opacity-60"
          >
            <div className="text-[40px] leading-none font-semibold tracking-tight text-ink">
              {patient.biologicalAge}
            </div>
            <p className="mt-1 text-[13px] text-muted">idade biológica</p>
          </button>
        </div>

        {/* Popups compartilhados entre os KPIs mobile (clique nos números acima
            ou nos ScoreCard/BioAgeCard do desktop dispara) */}
        <ScoreDetailPopup
          open={scorePopupOpen}
          onClose={() => setScorePopupOpen(false)}
          score={patient.longevifyScore}
          status={patient.scoreStatus}
          scoreHistory={patient.scoreHistory}
          organScores={patient.organScores}
        />
        <BioAgeDetailPopup
          open={bioAgePopupOpen}
          onClose={() => setBioAgePopupOpen(false)}
          biologicalAge={patient.biologicalAge}
          chronologicalAge={patient.chronologicalAge}
          biologicalAgeHistory={patient.biologicalAgeHistory}
          organBioAges={patient.organBioAges}
        />

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

        <aside className="lg:sticky lg:top-24 lg:flex lg:flex-col lg:items-center lg:gap-3 lg:self-start">
          <div
            className="relative w-[280px] rounded-2xl transition-shadow"
            style={{
              boxShadow:
                categoryId === "all"
                  ? "none"
                  : `0 0 0 2px ${activeColor}22, 0 12px 32px -10px ${activeColor}55`,
            }}
          >
            <BodyMannequin sex={displaySex} />
          </div>
          {renderSexToggle()}
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
              organScores={patient.organScores}
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
