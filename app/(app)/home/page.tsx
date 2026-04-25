import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  Plus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreCard } from "@/components/dados/score-card";
import { BioAgeCard } from "@/components/dados/bio-age-card";
import { RecommendationsSection } from "@/components/loja/recommendations-section";
import { GoalsSummary } from "@/components/wearables/goals-summary";
import { BIOMARKERS, PATIENT, biomarkersStats } from "@/lib/mock-data";
import { getRecommendedProducts } from "@/lib/product-recommender";
import { formatDatePtBR } from "@/lib/utils";

export default function HomePage() {
  const recommendations = getRecommendedProducts(BIOMARKERS, 3);
  const stats = biomarkersStats();

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10">
      <header className="flex flex-col gap-1 pb-8">
        <span className="text-[13px] text-muted">Olá, {PATIENT.firstName}</span>
        <h1 className="text-[40px] leading-[1.05] font-semibold tracking-tight">
          Sua saúde hoje
        </h1>
      </header>

      {/* 1. SAÚDE — destaque principal */}
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
            Painel de saúde
          </h2>
          <Link
            href="/dados"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-900"
          >
            Ver todos os dados <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

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

        {/* mini-summary dos biomarcadores em uma linha */}
        <Card className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <span className="font-medium text-ink">{stats.total} biomarcadores</span>
            no último painel · {formatDatePtBR(PATIENT.latestExamDate)}
          </div>
          <div className="flex items-center gap-4 text-[13px]">
            <SummaryStat
              value={stats.optimal}
              label="Ótimos"
              color="var(--color-status-optimal)"
            />
            <SummaryStat
              value={stats.normal}
              label="Normais"
              color="var(--color-status-normal)"
            />
            <SummaryStat
              value={stats.out}
              label="Fora"
              color="var(--color-status-out)"
            />
            <Link
              href="/dados"
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 h-8 text-[12px] font-medium text-brand-700 hover:bg-brand-100"
            >
              Detalhar
            </Link>
          </div>
        </Card>
      </section>

      {/* 2. METAS / WEARABLES — segundo bloco de saúde */}
      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
            Suas metas
          </h2>
          <Link
            href="/wearables"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-900"
          >
            Ver wearables <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <GoalsSummary />
      </section>

      {/* 3. TIMELINE / PRÓXIMOS PASSOS */}
      <section className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
            Próximos passos
          </h2>
          <Card className="flex items-center gap-4 px-5 py-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
              <FlaskConical className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <div className="text-[15px] font-medium">
                Painel de exames Longevify — plano de ação
              </div>
              <div className="text-[13px] text-muted">
                Revise suas recomendações personalizadas
              </div>
            </div>
            <Button variant="outline" size="sm">
              Revisar
            </Button>
          </Card>

          <Card className="mt-3 flex items-center gap-4 px-5 py-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Plus className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <div className="text-[15px] font-medium">Agendar novo serviço</div>
              <div className="text-[13px] text-muted">
                Exames de imagem, VO2max, DEXA
              </div>
            </div>
            <Button variant="outline" size="sm">
              Agendar
            </Button>
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
            Este mês
          </h2>
          <Card className="flex items-center gap-4 px-5 py-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#DFF5E9] text-[#0E7B45]">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <div className="text-[15px] font-medium">
                Coleta Longevify — Painel Completo
              </div>
              <div className="text-[13px] text-muted">
                Realizada em {formatDatePtBR(PATIENT.latestExamDate)} · 12:00
              </div>
            </div>
            <Button variant="outline" size="sm">
              Detalhes
            </Button>
          </Card>

          <Card className="mt-3 flex flex-col gap-2 px-5 py-4 text-[13px] text-muted">
            <div className="text-[12px] font-medium uppercase tracking-wide text-muted/80">
              Próximos 3 meses
            </div>
            <div>• Segunda coleta agendada para o 2º semestre</div>
            <div>• Check-in com a equipe Longevify em 30 dias</div>
            <div>• Atualização do protocolo após novos resultados</div>
          </Card>
        </div>
      </section>

      {/* 4. RECOMENDAÇÕES DE PRODUTOS — sempre por último, com bulk-add e assinatura */}
      <RecommendationsSection
        recommendations={recommendations}
        limit={3}
        className="mt-12"
      />
    </div>
  );
}

function SummaryStat({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span
        className="font-semibold"
        style={{ color: `color-mix(in srgb, ${color} 90%, black)` }}
      >
        {value}
      </span>
      <span className="text-muted">{label}</span>
    </span>
  );
}
