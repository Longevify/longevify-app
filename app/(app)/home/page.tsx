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
import { CompactHealthSummary } from "@/components/home/compact-health-summary";
import { DailyProgressGrid } from "@/components/home/daily-progress-grid";
import { MonthlyGoals } from "@/components/home/monthly-goals";
import { EvolutionCard } from "@/components/home/evolution-card";
import { BIOMARKERS } from "@/lib/mock-data";
import { loadDadosForUser } from "@/lib/dados/server";
import { generateProtocolTasks } from "@/lib/protocolo/tasks";
import { getStreakDays } from "@/lib/protocolo/streak";
import { DAILY_METRICS } from "@/lib/wearables-mock";

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
import { formatDatePtBR } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getUserBookings } from "@/lib/scheduling/bookings";
import { BookingCard } from "@/components/scheduling/booking-card";

/**
 * Lucas (2026-05-20): "quero refazer a aba home, quero que o longevify
 * score e idade biológica fiquem menores, o progresso diário fique
 * mais bonito, sendo mais visual, e tenha um card para cada quesito
 * de saúde: sono, exercício, to-do list feita e a fazer, no que tange
 * a questão da loja, deixe na aba de loja e não na aba home, abaixo
 * dessas coisas que eu falei para fazer na aba home, coloque metas
 * para o mês e evolução geral, tem que ser bem gameficado, o cara
 * tem que gostar de usar o app para ver que ta melhorando."
 *
 * Nova layout:
 *   1. Header (Olá, X — Sua saúde hoje)
 *   2. CompactHealthSummary (score + bio age — 2 cards pequenos lado a lado)
 *   3. DailyProgressGrid (sono / exercício / to-do feita / to-do pendente)
 *   4. MonthlyGoals (gameficação — 4 missões mensais com ring de progresso)
 *   5. EvolutionCard (sparklines de score + bio age + conquistas)
 *   6. Próximos passos (timeline + agendar serviço)
 *
 * RecommendationsSection saiu daqui — vai pra /loja.
 */
export default async function HomePage() {
  const user = await getCurrentUser();

  const dados = await loadDadosForUser({
    userId: user.id,
    isDemo: user.isDemo,
  });

  if (!user.isDemo && !dados.hasExams) {
    return <NewUserHome firstName={user.firstName} />;
  }

  const patient = dados.patient;
  const biomarkers = dados.biomarkers.length > 0 ? dados.biomarkers : BIOMARKERS;

  // Total de tasks rule-based (pro DailyProgressGrid calcular % de
  // conclusão). Client lê o localStorage pra saber done.
  const tasks = generateProtocolTasks(biomarkers);
  const totalTasks = tasks.length;

  // Dados de wearables (mock — última entrada do DAILY_METRICS).
  // TODO: substituir por fetch real do Apple Health/Oura quando
  // conexões wearables estiverem ativas em produção.
  const latestMetric = DAILY_METRICS[DAILY_METRICS.length - 1];
  const sleepMinutes = latestMetric?.sleepMinutes ?? 0;
  const exerciseMinutes =
    (latestMetric?.zone2Minutes ?? 0) +
    Math.round((latestMetric?.steps ?? 0) / 130); // ~130 passos/min ritmo médio

  // Stats pra gameficação
  const biomarkersOptimal = biomarkers.filter(
    (b) => b.status === "optimal",
  ).length;
  const previousScore =
    patient.scoreHistory[patient.scoreHistory.length - 2]?.score ??
    patient.longevifyScore;
  const bioAgeDelta = +(
    patient.chronologicalAge - patient.biologicalAge
  ).toFixed(1);

  // Streak REAL: lê task_completions do Supabase, conta dias consecutivos
  // com pelo menos 1 task feita. Demo (mock) pula a query e usa fallback
  // estimado pelo score pra UX da demo não ficar zerada.
  const streakDays = user.isDemo
    ? Math.min(30, Math.max(1, Math.floor(patient.longevifyScore / 4)))
    : await getStreakDays(user.id);

  return (
    <div className="mx-auto w-full max-w-[920px] px-4 py-6 sm:px-6 sm:py-10">
      <PostExamStories
        patient={patient}
        prefetchedInsights={dados.insights}
      />

      <header className="flex flex-col gap-1 pb-5 sm:pb-7">
        <span className="text-[13px] text-muted">Olá, {user.firstName}</span>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-[26px] leading-[1.1] font-semibold tracking-tight sm:text-[34px] sm:leading-[1.05]">
            Sua saúde hoje
          </h1>
          <ReplayStoriesButton patient={patient} />
        </div>
      </header>

      {/* 1. Resumo compacto — Score + Idade biológica (menores) */}
      <CompactHealthSummary
        score={patient.longevifyScore}
        scoreStatus={patient.scoreStatus}
        scoreHistory={patient.scoreHistory}
        organScores={patient.organScores}
        biologicalAge={patient.biologicalAge}
        chronologicalAge={patient.chronologicalAge}
        biologicalAgeHistory={patient.biologicalAgeHistory}
        organBioAges={patient.organBioAges}
      />

      {/* 2. Progresso diário — 4 cards (sono, exercício, to-do feita, pendente) */}
      <section className="mt-6">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
            Progresso de hoje
          </h2>
          <span className="text-[11px] text-zinc-500">
            atualizado agora
          </span>
        </div>
        <DailyProgressGrid
          sleepMinutes={sleepMinutes}
          sleepTargetMinutes={450}
          exerciseMinutes={exerciseMinutes}
          exerciseTargetMinutes={30}
          totalTasks={totalTasks}
        />
      </section>

      {/* 3. Metas do mês — gameficação com ring de progresso */}
      <MonthlyGoals
        scoreNow={patient.longevifyScore}
        scoreLastMonth={previousScore}
        biomarkersOptimal={biomarkersOptimal}
        biomarkersTotal={biomarkers.length}
        streakDays={streakDays}
        biologicalAgeDelta={bioAgeDelta}
        className="mt-8"
      />

      {/* 4. Evolução geral — sparklines + conquistas */}
      <EvolutionCard
        scoreHistory={patient.scoreHistory}
        biologicalAgeHistory={patient.biologicalAgeHistory}
        chronologicalAge={patient.chronologicalAge}
        className="mt-6"
      />

      {/* 5. Próximos passos / Este mês — timeline operacional */}
      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                Revisar protocolo
              </div>
              <div className="text-[13px] text-muted">
                {totalTasks} ações personalizadas pra você
              </div>
            </div>
            <Link href="/protocolo">
              <Button variant="outline" size="sm">
                Abrir
              </Button>
            </Link>
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
            <Link href="/coleta/agendar">
              <Button variant="outline" size="sm">
                Agendar
              </Button>
            </Link>
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
                Coleta Longevify
              </div>
              <div className="text-[13px] text-muted">
                Realizada em {formatDatePtBR(patient.latestExamDate)}
              </div>
            </div>
            <Link href="/dados">
              <Button variant="outline" size="sm">
                Detalhes
              </Button>
            </Link>
          </Card>

          <Card className="mt-3 flex flex-col gap-1.5 px-5 py-4 text-[13px] text-muted">
            <div className="text-[12px] font-medium uppercase tracking-wide text-muted/80">
              Próximos 6 meses
            </div>
            <div>• Próxima coleta em ~6 meses (2 coletas/ano)</div>
            <div>• Teleorientação com médico em 30 dias</div>
            <div>• Atualização do protocolo após nova coleta</div>
          </Card>
        </div>
      </section>

      {/* Lucas (2026-05-20): "no que tange a questão da loja, deixe na
          aba de loja e não na aba home" — RecommendationsSection
          removido daqui. CTA pra loja como balcão final. */}
      <section className="mt-8">
        <Link
          href="/loja"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/60 to-emerald-50/30 px-5 py-4 transition hover:border-brand-300 hover:shadow-[0_8px_24px_-15px_rgba(31,93,63,.3)]"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-700 ring-1 ring-brand-200">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <div className="text-[14px] font-semibold text-ink">
                Produtos recomendados pra você
              </div>
              <div className="text-[12px] text-muted">
                Selecionados a partir dos seus biomarcadores
              </div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-brand-700 transition group-hover:translate-x-0.5" />
        </Link>
      </section>
    </div>
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
