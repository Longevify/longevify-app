"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Calendar, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useCurrentUser } from "@/lib/auth/user-context";

export default function DadosPage() {
  const user = useCurrentUser();
  const [categoryId, setCategoryId] = useState<string>("all");
  const [range, setRange] = useState<TimeRange>("year");

  const stats = biomarkersStats();
  const filtered = useMemo(() => {
    if (categoryId === "all") return BIOMARKERS;
    return BIOMARKERS.filter((b) => b.categoryId === categoryId);
  }, [categoryId]);

  // Usuário real sem exame ainda → empty state em vez do mock do João
  if (!user.isDemo) {
    return (
      <div className="mx-auto w-full max-w-[820px] px-6 py-12">
        <header className="pb-6">
          <span className="text-[13px] text-muted">Dados clínicos</span>
          <h1 className="mt-1 text-[40px] leading-[1.05] font-semibold tracking-tight">
            Seu painel ainda está vazio
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] text-muted">
            Esta tela vai mostrar mais de 100 biomarcadores, evolução temporal,
            faixas ótima/normal/fora e recomendações por categoria — assim que
            seu primeiro exame for processado.
          </p>
        </header>
        <Card className="flex flex-col items-start gap-4 border-brand-200 bg-brand-50/40 p-6">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-brand-700">
            <FlaskConical className="h-6 w-6" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-[18px] font-semibold tracking-tight">
              Faça sua primeira coleta
            </h2>
            <p className="text-[14px] text-muted">
              Coleta domiciliar com profissional Longevify ou no laboratório
              parceiro. Resultado processado em até 5 dias úteis.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/coleta/agendar">
              <Button variant="primary">
                <Calendar className="h-4 w-4" />
                Agendar coleta
              </Button>
            </Link>
            <Link href="/loja">
              <Button variant="outline">Ver tipos de painel</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

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
