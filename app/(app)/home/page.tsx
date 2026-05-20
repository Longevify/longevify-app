import Link from "next/link";
import dynamicImport from "next/dynamic";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  FlaskConical,
  Plus,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreCard } from "@/components/dados/score-card";
import { BioAgeCard } from "@/components/dados/bio-age-card";
import { RecommendationsSection } from "@/components/loja/recommendations-section";
import { GoalsSummary } from "@/components/wearables/goals-summary";
import { BIOMARKERS, PATIENT, biomarkersStats, biomarkersStatsFor } from "@/lib/mock-data";
import { loadDadosForUser } from "@/lib/dados/server";

// Lucas (2026-05-19): "ainda ta demorando".
// PostExamStories tem 2.2k linhas + Three.js + várias libs. Era baixado
// no bundle inicial da home, mesmo quando user não ia abrir as stories
// (99% das visitas — só primeira vez ou via Replay button).
// next/dynamic → chunk separado, lazy-load.
const PostExamStories = dynamicImport(() =>
  import("@/components/onboarding/post-exam-stories").then(
    (m) => m.PostExamStories,
  ),
);
const ReplayStoriesButton = dynamicImport(
  () =>
    import("@/components/onboarding/replay-stories-button").then(
      (m) => m.ReplayStoriesButton,
    ),
  { loading: () => null },
);
import { getRecommendedProducts } from "@/lib/product-recommender";
import { formatDatePtBR } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getUserBookings } from "@/lib/scheduling/bookings";
import { BookingCard } from "@/components/scheduling/booking-card";

export default async function HomePage() {
  const user = await getCurrentUser();

  // Lucas (2026-05-20): "tudo tem que mudar com base nessas informações".
  // Carrega dados REAIS do paciente quando autenticado. Mock só pra demo.
  const dados = await loadDadosForUser({
    userId: user.id,
    isDemo: user.isDemo,
  });

  // 3 estados possíveis:
  //   - Demo (mock João Silva) → painel demonstrativo
  //   - User real COM exames → painel personalizado com dados reais
  //   - User real SEM exames → empty state (NewUserHome) pra incentivar
  //     primeira coleta
  if (!user.isDemo && !dados.hasExams) {
    return <NewUserHome firstName={user.firstName} />;
  }

  const patient = dados.patient;
  const biomarkers = dados.biomarkers;
  const recommendations = getRecommendedProducts(
    biomarkers.length > 0 ? biomarkers : BIOMARKERS,
    3,
  );
  const stats = biomarkers.length > 0 ? biomarkersStatsFor(biomarkers) : biomarkersStats();

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-10">
      {/* Apresentação Stories pós-exame — só na primeira visita (gerencia
          via localStorage). Inspirado nos stories do Superpower app. */}
      <PostExamStories patient={patient} />

      <header className="flex flex-col gap-1 pb-6 sm:pb-8">
        <span className="text-[13px] text-muted">Olá, {user.firstName}</span>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-[28px] leading-[1.1] font-semibold tracking-tight sm:text-[40px] sm:leading-[1.05]">
            Sua saúde hoje
          </h1>
          {/* Botão pra rever apresentação — só na conta demo (Lucas) */}
          <ReplayStoriesButton patient={patient} />
        </div>
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

        {/* H10: flex-col em mobile evita stats + link "Detalhar" quebrando desorganizados */}
        <Card className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <span className="font-medium text-ink">{stats.total} biomarcadores</span>
            no último painel · {formatDatePtBR(patient.latestExamDate)}
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
                Realizada em {formatDatePtBR(patient.latestExamDate)} · 12:00
              </div>
            </div>
            <Button variant="outline" size="sm">
              Detalhes
            </Button>
          </Card>

          <Card className="mt-3 flex flex-col gap-2 px-5 py-4 text-[13px] text-muted">
            <div className="text-[12px] font-medium uppercase tracking-wide text-muted/80">
              Próximos 6 meses
            </div>
            <div>• Segunda coleta do ano em ~6 meses (2 coletas/ano)</div>
            <div>• Teleorientação com médico parceiro credenciado em 30 dias</div>
            <div>• Atualização do protocolo após nova coleta</div>
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

// ──────────────────────────────────────────────────────────────────────
// NewUserHome — empty state pra paciente real que ainda não tem exame.
// Em vez de mostrar dados mock do João, oferece próximos passos claros.
// Quando o user já tem coleta agendada, troca o card "Agendar primeira
// coleta" por um card destacado com a próxima coleta + atalho pra ver
// todas em /coleta.
// ──────────────────────────────────────────────────────────────────────
async function NewUserHome({ firstName }: { firstName: string }) {
  const { upcoming } = await getUserBookings();
  const nextBooking = upcoming[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-[920px] px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-1 pb-6 sm:pb-8">
        <span className="text-[13px] text-muted">Olá, {firstName}</span>
        <h1 className="text-[28px] leading-[1.1] font-semibold tracking-tight sm:text-[40px] sm:leading-[1.05]">
          Bem-vindo ao Longevify
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          Sua plataforma de longevidade ainda está em branco — ela vai ganhar
          vida assim que você fizer sua primeira coleta. Enquanto isso, alguns
          passos pra você adiantar.
        </p>
      </header>

      {/* Hero: estado da plataforma sem dados ainda */}
      <Card className="mb-6 flex flex-col items-start gap-3 border-brand-200 bg-brand-50/40 p-6">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-brand-700">
          <Sparkles className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight">
            Você ainda não tem dados de exames aqui
          </h2>
          <p className="mt-1 text-[14px] text-muted">
            Quando seu primeiro Painel Longevify for processado, esta tela
            vai mostrar seu Longevify Score, idade biológica, biomarcadores e
            recomendações personalizadas pra você.
          </p>
        </div>
      </Card>

      {/* Próxima coleta — destaque quando já tem agendamento */}
      {nextBooking ? (
        <section className="mb-6 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
              Sua próxima coleta
            </h2>
            <Link
              href="/coleta"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-900"
            >
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <BookingCard booking={nextBooking} />
        </section>
      ) : null}

      {/* Próximos passos — quick wins */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
          Próximos passos
        </h2>

        {nextBooking ? null : (
          <Card className="flex flex-wrap items-center gap-4 px-5 py-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
              <Calendar className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-[200px]">
              <div className="text-[15px] font-medium">
                Agendar sua primeira coleta
              </div>
              <div className="text-[13px] text-muted">
                Coleta domiciliar ou em laboratório parceiro. ~5 dias úteis pra
                resultado.
              </div>
            </div>
            <Link href="/coleta/agendar">
              <Button variant="primary" size="md">
                Agendar coleta
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        )}

        <Card className="flex flex-wrap items-center gap-4 px-5 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <FlaskConical className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-[200px]">
            <div className="text-[15px] font-medium">
              Conhecer os planos Longevify
            </div>
            <div className="text-[13px] text-muted">
              Individual, Premium, Trio ou Concierge — cada um com cobertura
              clínica diferente.
            </div>
          </div>
          <Link href="/planos">
            <Button variant="outline" size="md">
              Ver planos
            </Button>
          </Link>
        </Card>

        <Card className="flex flex-wrap items-center gap-4 px-5 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E7F0FD] text-[#2562A8]">
            <Plus className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-[200px]">
            <div className="text-[15px] font-medium">
              Conectar wearable (opcional)
            </div>
            <div className="text-[13px] text-muted">
              Apple Watch ou Garmin — entendemos sono, atividade e recuperação
              entre coletas.
            </div>
          </div>
          <Link href="/wearables">
            <Button variant="outline" size="md">
              Conectar
            </Button>
          </Link>
        </Card>

        <Card className="flex flex-wrap items-center gap-4 px-5 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FCEBD8] text-[#A8651B]">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-[200px]">
            <div className="text-[15px] font-medium">
              Conversar com o Concierge IA
            </div>
            <div className="text-[13px] text-muted">
              Tire dúvidas sobre longevidade, exames e protocolos. Ele já está
              ativo, mesmo sem seus dados ainda.
            </div>
          </div>
          <Link href="/concierge">
            <Button variant="outline" size="md">
              Abrir concierge
            </Button>
          </Link>
        </Card>
      </section>
    </div>
  );
}
