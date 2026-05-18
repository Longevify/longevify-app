"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Heart,
  ClipboardCheck,
  TrendingUp,
  Apple,
  Sparkles,
  Check,
  ThumbsUp,
} from "lucide-react";
import { cn, formatDatePtBR } from "@/lib/utils";
import type { Biomarker, OrganScore, Patient } from "@/lib/mock-data";
import { BIOMARKERS } from "@/lib/mock-data";
import {
  StoriesMannequin,
  buildOrganStatuses,
} from "@/components/onboarding/stories-mannequin";
import { StoriesFinaleTransition } from "@/components/onboarding/stories-finale-transition";
import { getRecommendedProducts } from "@/lib/product-recommender";
import { useCart } from "@/lib/cart/store";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PostExamStoriesProps {
  patient: Patient;
  /** Localstorage flag pra não mostrar 2x. */
  storageKey?: string;
  /** Quando true, força exibição mesmo se já foi visto. Usado pelo
   *  botão "Rever apresentação" da home demo. */
  forceShow?: boolean;
  /** Callback chamado quando o user fecha. Permite ao parent resetar
   *  o forceShow. */
  onClose?: () => void;
  /** Insights pré-computados server-side (home/page.tsx). Quando
   *  presente, evita o fetch client-side e mostra análise imediato
   *  ao abrir as stories. Lucas 2026-05-18: "tem que ter sido feito
   *  no momento em que você recebeu os dados (...) o indivíduo não
   *  tenha que ficar esperando." */
  prefetchedInsights?: Record<string, BiomarkerInsightData>;
}

interface BiomarkerInsightData {
  mainMessage: string;
  whyHappened: string;
  whatToDo: string[];
  timeline: string;
}

interface StoryCtx {
  patient: Patient;
  /** Top 3 biomarcadores fora da faixa (priorizados) — pros slides de
   *  ação. */
  topConcerns: Biomarker[];
  /** Top 3 biomarcadores ótimos — pros slides de elogio. */
  topWinners: Biomarker[];
  /** Produtos recomendados a partir dos biomarcadores fora da faixa. */
  recommendations: ReturnType<typeof getRecommendedProducts>;
  /** AI-generated personalized insights por biomarcador. Pode estar
   *  vazio enquanto carrega; cada slide usa fallback estático nesse
   *  meio-tempo. */
  insights: Record<string, BiomarkerInsightData>;
  /** Loading flag — slides mostram skeleton enquanto true. */
  insightsLoading: boolean;
}

type SlideTheme = "dark" | "light" | "tinted";

interface SlideContent {
  id: string;
  theme: SlideTheme;
  /** Duração em ms — slides com mais conteúdo/animação podem precisar
   *  de mais tempo. Default 5200ms. */
  duration?: number;
  render: (ctx: StoryCtx) => React.ReactNode;
}

// ─── Animated number ─────────────────────────────────────────────────────────
//
// Conta de 0 até `value` em `duration` ms — usado nos gauges e cards.
// Easing cubic-out pra parar bonito no final. Re-monta sempre que slide
// muda (via key={slideIdx}) então roda do zero de novo.

function AnimatedNumber({
  value,
  duration = 1100,
  decimals = 0,
}: {
  value: number;
  duration?: number;
  decimals?: number;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf: number;
    const tick = (t: number) => {
      const elapsed = t - start;
      const linear = Math.min(1, elapsed / duration);
      // cubic-out
      const eased = 1 - Math.pow(1 - linear, 3);
      setCurrent(eased * value);
      if (linear < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{decimals === 0 ? Math.round(current) : current.toFixed(decimals)}</>;
}

// ─── Circular gauge (idade biológica + score) ───────────────────────────────

function CircularGauge({
  value,
  max,
  label,
  sublabel,
  color = "#3f9a6b",
  startDelay = 0,
}: {
  value: number;
  max: number;
  label: string;
  sublabel?: string;
  color?: string;
  startDelay?: number;
}) {
  const radius = 110;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setProgress(value / max), startDelay);
    return () => clearTimeout(id);
  }, [value, max, startDelay]);

  return (
    <div className="relative grid place-items-center">
      <svg
        width="260"
        height="260"
        viewBox="0 0 260 260"
        className="rotate-[-90deg]"
      >
        <circle
          cx="130"
          cy="130"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={stroke}
          strokeDasharray="2 6"
          strokeLinecap="round"
        />
        <circle
          cx="130"
          cy="130"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${progress * circumference} ${circumference}`}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 12px ${color})`,
            transition: "stroke-dasharray 1.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[58px] font-semibold leading-none text-white tracking-tight tabular-nums">
            <AnimatedNumber value={value} />
          </div>
          <div className="mt-2 text-[13px] font-medium text-white/80">
            {label}
          </div>
          {sublabel && (
            <div className="mt-1 text-[11px] text-white/60">{sublabel}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Organ chip (tap pra ver score) ─────────────────────────────────────────
//
// Animação elegante (Lucas 2026-05 — refinou a versão anterior que tinha
// rotação 360° + bounce excessivo).
//
// Comportamento ao clicar:
//   - Chip eleva sutilmente (translate-y-[-1px]) + shadow cresce
//   - Background intensifica (cor +1 shade) com transition smooth
//   - Score wrapper expande (max-w 0 → auto) com cubic-bezier iOS spring
//   - Número CONTA de 0 até valor real em 480ms (AnimatedNumber)
//   - Tudo em sync, 380ms total, ease (0.16, 1, 0.3, 1)
//
// Sem rotação, sem bounce. Só smooth elegante.

function OrganChip({
  organ,
  score,
  status,
  delayMs = 0,
}: {
  organ: string;
  score?: number;
  status: "optimal" | "normal" | "out";
  delayMs?: number;
}) {
  const [revealed, setRevealed] = useState(false);
  const colors = {
    optimal: {
      bgClosed: "bg-emerald-50 ring-emerald-200",
      bgOpen: "bg-emerald-100 ring-emerald-400 shadow-emerald-300/40",
      badge: "bg-emerald-100 text-emerald-700",
      score: "text-emerald-700",
      grade: "A",
    },
    normal: {
      bgClosed: "bg-amber-50 ring-amber-200",
      bgOpen: "bg-amber-100 ring-amber-400 shadow-amber-300/40",
      badge: "bg-amber-100 text-amber-700",
      score: "text-amber-700",
      grade: "B",
    },
    out: {
      bgClosed: "bg-rose-50 ring-rose-200",
      bgOpen: "bg-rose-100 ring-rose-400 shadow-rose-300/40",
      badge: "bg-rose-100 text-rose-700",
      score: "text-rose-700",
      grade: "C",
    },
  }[status];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setRevealed((v) => !v);
      }}
      className={cn(
        "story-pop group relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium text-zinc-700 ring-1 will-change-transform",
        // Transition smooth iOS-spring sem bounce
        "transition-[background-color,box-shadow,transform,border-color] duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        revealed
          ? cn("-translate-y-[1px] shadow-md", colors.bgOpen)
          : cn("translate-y-0 shadow-sm hover:-translate-y-[1px] hover:shadow-md", colors.bgClosed),
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span
        className={cn(
          "grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold transition-colors duration-[380ms]",
          colors.badge,
        )}
      >
        {colors.grade}
      </span>
      <span className="leading-tight">{organ}</span>
      {/* Score reveal — width expand via grid-cols trick (suporta width
          variável melhor que max-width). Number conta de 0→score quando
          revealed via AnimatedNumber, e fica oculto via grid-cols-[0fr]
          quando fechado. */}
      {typeof score === "number" ? (
        <span
          className={cn(
            "grid items-center transition-[grid-template-columns,opacity,margin-left] duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
            revealed
              ? "ml-1 grid-cols-[1fr] opacity-100"
              : "ml-0 grid-cols-[0fr] opacity-0",
          )}
          aria-hidden={!revealed}
        >
          <span className="overflow-hidden whitespace-nowrap">
            <span className="mr-0.5 text-zinc-300">·</span>
            <span
              className={cn(
                "text-[10.5px] font-semibold tabular-nums",
                colors.score,
              )}
            >
              {revealed ? <AnimatedNumber value={score} duration={480} /> : 0}
            </span>
          </span>
        </span>
      ) : null}
    </button>
  );
}

// ─── Helpers de seleção de biomarcadores ───────────────────────────────────

/**
 * Top biomarcadores FORA da faixa, priorizados por:
 *   1. status "out" antes de "normal"
 *   2. relevância clínica (LDL, ApoB, Vit D, HbA1c, CRP têm prioridade)
 *   3. distância do range ótimo
 *
 * Usado nos slides "Pontos a melhorar" e nos cards de Foco com produto.
 */
const CLINICAL_PRIORITY = new Set([
  "ldl",
  "apob",
  "vitd",
  "hba1c",
  "crp",
  "hdl",
  "testo",
  "ferritin",
]);

function pickTopConcerns(biomarkers: Biomarker[], limit: number): Biomarker[] {
  const concerning = biomarkers.filter(
    (b) => b.status === "out" || b.status === "normal",
  );
  const scored = concerning.map((b) => {
    let score = 0;
    if (b.status === "out") score += 100;
    if (b.status === "normal") score += 30;
    if (CLINICAL_PRIORITY.has(b.id)) score += 20;
    return { biomarker: b, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.biomarker);
}

/** Top biomarcadores ÓTIMOS, priorizados por relevância clínica. */
function pickTopWinners(biomarkers: Biomarker[], limit: number): Biomarker[] {
  const winners = biomarkers.filter((b) => b.status === "optimal");
  const scored = winners.map((b) => ({
    biomarker: b,
    score: CLINICAL_PRIORITY.has(b.id) ? 10 : 1,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.biomarker);
}

/** Tom conversa pra explicar o que o biomarcador alterado significa.
 *  Lucas (2026-05): "não seja tão formal no onboarding, o onboarding
 *  tem que ter um tom de conversa". */
function explainConcern(b: Biomarker): string {
  switch (b.id) {
    case "ldl":
      return "Sabe aquele colesterol que a gente fala que entope artéria? É esse aí. Acima de 100 já começa a virar problema lá na frente.";
    case "apob":
      return "Pensa assim: ApoB conta cada caminhãozinho de colesterol no seu sangue. Quanto mais caminhão, mais coisa pra grudar nas artérias.";
    case "vitd":
      return "Vit D é a vitamina do sol — mexe com osso, imunidade e até com seu humor. Abaixo de 50, dá pra subir tranquilo.";
    case "hba1c":
      return "Esse marcador é a média do seu açúcar dos últimos 3 meses. Subindo de 5.7% já é sinal que o corpo tá começando a resistir à insulina.";
    case "crp":
      return "PCR é tipo um alarme silencioso de inflamação. Você nem sente, mas é ela que acelera o envelhecimento por dentro.";
    case "hdl":
      return "Esse é o colesterol amigo — o que limpa a sujeira das suas artérias. Quanto mais alto, melhor pro coração.";
    case "ferritin":
      return "Ferritina é o tanque de reserva do seu ferro. Baixo é sinal de pré-anemia. Alto pode ser inflamação rodando.";
    case "testo":
      return "Testosterona não é só coisa de homem — ela mexe com músculo, energia, libido e osso pra todo mundo.";
    default:
      return `${b.name} tá fora do ideal. Bora trabalhar pra ajustar.`;
  }
}

/** Tom de elogio rápido, conversa. Não soa relatório clínico. */
function explainWinner(b: Biomarker): string {
  switch (b.id) {
    case "ldl":
      return "Beleza pura. Colesterol ruim baixinho — seu coração agradece.";
    case "apob":
      return "Pouco caminhão de colesterol rodando no sangue. Tá no ponto.";
    case "vitd":
      return "Vit D no ponto. Osso, imunidade e humor agradecem.";
    case "hdl":
      return "Colesterol amigo lá em cima — proteção cardio na medida.";
    case "ferritin":
      return "Tanque de ferro cheio. Energia e oxigenação em dia.";
    case "hba1c":
      return "Açúcar médio ótimo. Seu corpo tá processando insulina certinho.";
    case "testo":
      return "Hormônio em faixa boa. Músculo e disposição na medida.";
    default:
      return `${b.name} tá na faixa boa. Continua assim.`;
  }
}

// ─── Slide renders ──────────────────────────────────────────────────────────

const SLIDES: SlideContent[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // 1. WELCOME — hero card estilo "Seus pontos fortes" (Lucas pediu pra
  //    imitar a imagem que ele mandou: card com mannequin colorido + chips).
  {
    id: "welcome",
    theme: "tinted",
    duration: 5500,
    render: ({ patient }) => {
      const organStatuses = buildOrganStatuses(patient.organBioAges);
      return (
        <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center text-white">
          {/* Glow background */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div
              className="h-[600px] w-[600px] rounded-full opacity-50 blur-[60px] story-glow"
              style={{
                background:
                  "radial-gradient(circle, #3f9a6b 0%, #1f5d3f 40%, transparent 75%)",
              }}
            />
          </div>

          <div className="relative w-full max-w-[360px] story-card-in">
            <p className="mb-1 text-[12px] uppercase tracking-[0.18em] text-white/55">
              Oi, {patient.firstName}
            </p>
            <h2 className="text-[26px] font-semibold tracking-tight leading-[1.1]">
              Olha sua saúde<br />numa página só
            </h2>

            {/* Card — estilo "Seus pontos fortes" */}
            <div className="mt-6 rounded-[28px] border border-white/15 bg-white/[0.06] p-5 backdrop-blur-md shadow-[0_24px_48px_-16px_rgba(0,0,0,0.5)]">
              <div className="text-left">
                <div className="text-[12px] text-white/65">
                  {patient.firstName} {patient.lastName}
                </div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Longevify
                </div>
              </div>

              {/* Mannequim colorido por status — aspect-[3/4] pra não
                  overflow do card (Lucas 2026-05: "o boneco ainda está
                  para fora do card e descentralizado"). max-w controla
                  largura, aspect controla altura proporcional. */}
              <div className="relative mx-auto mt-2 flex w-full max-w-[220px] items-center justify-center">
                <div className="w-full">
                  <StoriesMannequin
                    sex={patient.sex}
                    organStatuses={organStatuses}
                  />
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-1 text-center text-white">
                <div>
                  <div className="text-[20px] font-semibold leading-none tabular-nums">
                    <AnimatedNumber value={patient.longevifyScore} />
                  </div>
                  <div className="mt-1 text-[9.5px] uppercase tracking-wide text-white/55">
                    Score
                  </div>
                </div>
                <div>
                  <div className="text-[20px] font-semibold leading-none tabular-nums">
                    <AnimatedNumber value={patient.biologicalAge} />
                  </div>
                  <div className="mt-1 text-[9.5px] uppercase tracking-wide text-white/55">
                    Idade biológica
                  </div>
                </div>
                <div>
                  <div className="text-[20px] font-semibold leading-none tabular-nums">
                    {patient.organScores?.length ?? 7}
                  </div>
                  <div className="mt-1 text-[9.5px] uppercase tracking-wide text-white/55">
                    Sistemas
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-5 text-[12.5px] leading-relaxed text-white/65">
              É só ir tocando pra avançar · sem pressa, fica aí o tempo que precisar
            </p>
          </div>
        </div>
      );
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. BIO AGE
  {
    id: "bioage",
    theme: "dark",
    duration: 5200,
    render: ({ patient }) => {
      const delta = patient.chronologicalAge - patient.biologicalAge;
      const younger = delta > 0;
      return (
        <div className="flex h-full w-full flex-col items-center justify-center px-8 text-center text-white">
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div
              className="h-[700px] w-[700px] rounded-full opacity-60 blur-[60px] story-glow"
              style={{
                background:
                  "radial-gradient(circle, #3f9a6b 0%, transparent 70%)",
              }}
            />
          </div>
          <div className="relative">
            <CircularGauge
              value={patient.biologicalAge}
              max={60}
              label="idade biológica"
              sublabel={
                younger
                  ? `${Math.abs(delta).toFixed(1)} anos mais jovem`
                  : `${Math.abs(delta).toFixed(1)} anos mais velho`
              }
            />
          </div>
          <div className="relative mt-10 max-w-md story-fade-up">
            <h2 className="text-[22px] font-semibold tracking-tight">
              Estimativa de idade biológica: {patient.biologicalAge}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-white/75">
              {younger
                ? `Beleza pura — pelos seus marcadores, a estimativa fica ${Math.abs(delta).toFixed(1)} anos abaixo da idade cronológica. (Lembrando: idade biológica é uma estimativa estatística baseada em fórmulas validadas como o PhenoAge — não é diagnóstico nem promessa de longevidade.)`
                : `Pelos marcadores, a estimativa indica envelhecimento ligeiramente acelerado em alguns sistemas. Dá pra trabalhar com hábitos e ajustes pra modular esse ritmo — sono, exercício, dieta, controle metabólico. Idade biológica é estimativa, não sentença.`}
            </p>
          </div>
        </div>
      );
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. LONGEVIFY SCORE — gauge + chips por órgão (tap revela score)
  {
    id: "score",
    theme: "dark",
    duration: 6000,
    render: ({ patient }) => (
      <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center text-white">
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            className="h-[700px] w-[700px] rounded-full opacity-60 blur-[60px] story-glow"
            style={{
              background:
                "radial-gradient(circle, #3f9a6b 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative">
          <CircularGauge
            value={patient.longevifyScore}
            max={100}
            label="longevify score"
            sublabel="de 100"
          />
        </div>

        <div className="relative mt-8 max-w-md">
          <h2 className="text-[20px] font-semibold tracking-tight">
            Toca em cada sistema pra ver como tá
          </h2>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {(patient.organScores ?? []).map((o, i) => (
              <OrganChip
                key={o.organ}
                organ={o.organ}
                score={o.score}
                status={o.status}
                delayMs={i * 60}
              />
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. SEUS PONTOS FORTES — mannequim colorido + chips dos órgãos otimo
  {
    id: "winners",
    theme: "light",
    duration: 5800,
    render: ({ patient }) => {
      const organStatuses = buildOrganStatuses(patient.organBioAges);
      const winners = (patient.organScores ?? []).filter(
        (o: OrganScore) => o.status === "optimal",
      );
      const total = patient.organScores?.length ?? 7;
      return (
        <div className="flex h-full w-full flex-col justify-center bg-white px-6 py-20 text-zinc-900">
          <div className="mx-auto w-full max-w-md">
            <h2 className="text-center text-[24px] font-semibold tracking-tight">
              Onde você tá mandando bem
            </h2>
            <p className="mt-1 text-center text-[13px] text-zinc-500">
              <span className="font-semibold text-emerald-700">
                <AnimatedNumber value={winners.length} />
              </span>{" "}
              de {total} sistemas tão voando — segue assim
            </p>

            <div className="story-card-in mt-8 rounded-[28px] border border-zinc-200 bg-gradient-to-b from-white to-emerald-50/40 p-6 shadow-[0_24px_48px_-24px_rgba(31,93,63,0.25)]">
              <div className="text-[11px] font-medium text-zinc-500">
                {patient.firstName} {patient.lastName}
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                Longevify
              </div>

              {/* Mannequim COLORIDO — aspect ratio nativo do BodyMannequin
                  (3:4) decide a altura, não h-fixa. Sem overflow do card
                  (Lucas 2026-05). */}
              <div className="relative mx-auto mt-3 flex w-full max-w-[240px] items-center justify-center">
                <div className="w-full">
                  <StoriesMannequin
                    sex={patient.sex}
                    organStatuses={organStatuses}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {winners.map((w, i) => (
                  <OrganChip
                    key={w.organ}
                    organ={w.organ}
                    score={w.score}
                    status="optimal"
                    delayMs={300 + i * 80}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5. GOOD BIOMARKERS — elogio dos exames que vieram melhores
  //    Lucas (2026-05): "elogiando as partes boas do exame, elencando os
  //    exames que foram melhores".
  {
    id: "good-biomarkers",
    theme: "light",
    duration: 5500,
    render: ({ topWinners, patient }) => (
      <div className="flex h-full w-full bg-gradient-to-br from-emerald-50/60 via-white to-white">
        <div className="m-auto flex w-full max-w-md flex-col px-6 py-16">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
            <ThumbsUp className="h-3 w-3" />
            Vitórias
          </div>
          <h2 className="mt-3 text-[26px] font-semibold tracking-tight text-zinc-900 leading-[1.1] story-fade-up">
            {patient.firstName}, aqui você<br />
            tá acertando em cheio
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-zinc-600 story-fade-up-2">
            Antes de falar do que dá pra melhorar, deixa eu te mostrar onde
            você tá voando. Esses três aqui você não precisa mexer — segue
            como tá.
          </p>

          <div className="mt-7 flex flex-col gap-2.5">
            {topWinners.length === 0 ? (
              <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-[13px] text-zinc-500">
                Por enquanto nenhum marcador tá na faixa ótima — mas calma,
                a gente resolve isso nos próximos slides.
              </p>
            ) : (
              topWinners.map((b, i) => (
                <BiomarkerWinnerCard
                  key={b.id}
                  biomarker={b}
                  delayMs={400 + i * 140}
                />
              ))
            )}
          </div>
        </div>
      </div>
    ),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 6. CONCERNS SUMMARY — preview dos 3 piores antes do drill-down
  {
    id: "concerns-summary",
    theme: "light",
    duration: 5500,
    render: ({ topConcerns, patient }) => (
      <div className="flex h-full w-full bg-gradient-to-br from-amber-50/40 via-white to-white">
        <div className="m-auto flex w-full max-w-md flex-col px-6 py-16">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
            <TrendingUp className="h-3 w-3" />
            Pra melhorar
          </div>
          <h2 className="mt-3 text-[26px] font-semibold tracking-tight text-zinc-900 leading-[1.1] story-fade-up">
            Agora bora pro<br />
            que importa
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-zinc-600 story-fade-up-2">
            {patient.firstName}, olha esses {topConcerns.length} aqui — são
            os marcadores onde você tem mais espaço pra ganhar. No próximo
            slide a gente já te mostra como resolver tudo de uma vez.
          </p>

          <div className="mt-7 flex flex-col gap-2.5">
            {topConcerns.map((b, i) => (
              <BiomarkerConcernPreviewCard
                key={b.id}
                biomarker={b}
                rank={i + 1}
                delayMs={400 + i * 140}
              />
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 7-12. ANÁLISE PROFUNDA POR BIOMARCADOR (AI-personalized, Lucas
  //       2026-05-17: "quero mais stories detalhando e analisando os
  //       resultados do exame de sangue (...) seja pragmático na
  //       análise e sempre relacione: O que fazer? Porque será que
  //       você teve esse resultado?")
  //
  //       Renderiza UM slide por biomarcador relevante — primeiro os
  //       3 piores (top concerns), depois os 3 melhores (top winners).
  //       Cada slide tem mensagem principal curta + botão "Saber mais"
  //       que expande com análise completa do Dr. Lon (AI).
  ...([0, 1, 2] as const).map((idx) => ({
    id: `concern-deep-${idx}` as const,
    theme: "light" as const,
    duration: 6500,
    render: (ctx: StoryCtx) => {
      const biomarker = ctx.topConcerns[idx];
      if (!biomarker) return null;
      return (
        <BiomarkerDeepDiveSlide
          biomarker={biomarker}
          insight={ctx.insights[biomarker.id]}
          loading={ctx.insightsLoading}
          variant="concern"
          position={idx + 1}
          total={ctx.topConcerns.length}
        />
      );
    },
  })),
  ...([0, 1, 2] as const).map((idx) => ({
    id: `winner-deep-${idx}` as const,
    theme: "light" as const,
    duration: 5500,
    render: (ctx: StoryCtx) => {
      const biomarker = ctx.topWinners[idx];
      if (!biomarker) return null;
      return (
        <BiomarkerDeepDiveSlide
          biomarker={biomarker}
          insight={ctx.insights[biomarker.id]}
          loading={ctx.insightsLoading}
          variant="winner"
          position={idx + 1}
          total={ctx.topWinners.length}
        />
      );
    },
  })),

  // ──────────────────────────────────────────────────────────────────────────
  // 13. BUNDLE — "Resolver tudo de uma vez" (Lucas 2026-05: consolidou os
  //    3 slides individuais por biomarcador num único slide de pacote
  //    pra "não parecer tanto uma grande propaganda"). Os problemas já
  //    foram apresentados nos slides 5 e 6; aqui é só a solução.
  {
    id: "bundle",
    theme: "tinted",
    duration: 6500,
    render: ({ recommendations, patient }) => (
      <BundleSlide
        recommendations={recommendations}
        firstName={patient.firstName}
      />
    ),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 11. PRÓXIMAS COLETAS / EVOLUÇÃO
  {
    id: "next",
    theme: "tinted",
    duration: 5200,
    render: ({ patient }) => (
      <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center text-white">
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            className="h-[600px] w-[600px] rounded-full opacity-50 blur-[60px] story-glow"
            style={{
              background:
                "radial-gradient(circle, #3f9a6b 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative w-full max-w-md story-card-in">
          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">
            Como vai rolar
          </p>
          <h2 className="mt-2 text-[26px] font-semibold tracking-tight leading-[1.1]">
            Pensa em ciclos<br />de 6 meses
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-white/65">
            Duas coletas por ano, com tempo no meio pra você seguir o
            protocolo e os marcadores responderem antes da gente medir de novo.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-2.5 text-left">
            <TimelineItem
              icon={ClipboardCheck}
              date={formatDatePtBR(patient.latestExamDate)}
              title="Sua primeira coleta — feita"
              detail="Painel completo · 50+ biomarcadores"
              done
              delay={150}
            />
            <TimelineItem
              icon={Apple}
              date="Próximos 6 meses"
              title="Vc seguindo o protocolo"
              detail="Hábitos diários + suplementação na medida"
              delay={300}
            />
            <TimelineItem
              icon={TrendingUp}
              date="Daqui 6 meses"
              title="Segunda coleta"
              detail="A gente mede tudo de novo pra ver o quanto andou"
              delay={450}
            />
            <TimelineItem
              icon={Heart}
              date="O tempo todo"
              title="Dr. Lon no celular"
              detail="Assistente IA pra dúvidas educacionais + médico parceiro credenciado em teleorientação periódica"
              delay={600}
            />
          </div>
        </div>
      </div>
    ),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 12. CTA FINAL
  {
    id: "ready",
    theme: "tinted",
    duration: 4500,
    render: ({ patient }) => (
      <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center text-white">
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            className="h-[700px] w-[700px] rounded-full opacity-70 blur-[40px] story-pulse"
            style={{
              background:
                "radial-gradient(circle, #3f9a6b 0%, #1f5d3f 40%, transparent 75%)",
            }}
          />
        </div>

        <div className="relative max-w-md story-card-in">
          <Sparkles className="mx-auto h-9 w-9 text-emerald-300" />
          <h2 className="mt-4 text-[30px] font-semibold tracking-tight leading-[1.05]">
            Bora começar, {patient.firstName}?
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/75">
            Teu protocolo já tá na home. Começa pela primeira ação de hoje —
            cinco minutos por dia já muda o jogo.
          </p>
        </div>
      </div>
    ),
  },
];

// ─── Sub-componentes interativos ────────────────────────────────────────────

/**
 * Card de ação expansível dos focos. Lucas 2026-05: "quero que os botões
 * 'próximos passos' sejam clicáveis e funcionais, aparecendo mais detalhes
 * depois". Click expande pra mostrar parágrafo de detalhe; click novo fecha.
 *
 * stopPropagation no click pra não disparar tap-zone do story (não avança
 * slide). Ícone à direita rotaciona 180° quando expanded.
 */
function FocusAction({
  label,
  detail,
  delayMs,
  ring,
  accent,
}: {
  label: string;
  detail: string;
  delayMs: number;
  ring: string;
  accent: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        "story-pop overflow-hidden rounded-2xl bg-white ring-1 transition will-change-transform",
        "shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)]",
        ring,
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-[13.5px] font-medium text-zinc-800">
          {label}
        </span>
        <span
          className={cn(
            "inline-grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-transform duration-300",
            "bg-zinc-100",
            accent,
            open && "rotate-90",
          )}
        >
          →
        </span>
      </button>
      {/* Acordeão expandido — animação height via grid-rows trick */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <p className="border-t border-zinc-100 px-4 py-3 text-[12.5px] leading-relaxed text-zinc-600">
            {detail}
          </p>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  icon: Icon,
  date,
  title,
  detail,
  done,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  date: string;
  title: string;
  detail: string;
  done?: boolean;
  delay: number;
}) {
  return (
    <div
      className="story-fade-up-3 flex items-start gap-3 rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10 backdrop-blur-md"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1",
          done
            ? "bg-emerald-500/20 text-emerald-300 ring-emerald-400/30"
            : "bg-white/10 text-white/85 ring-white/15",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 text-left">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13.5px] font-semibold text-white">{title}</span>
          {done ? (
            <span className="text-[9px] font-semibold uppercase tracking-wide text-emerald-300">
              ✓ feito
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[11.5px] text-white/65">{detail}</p>
        <p className="mt-0.5 text-[10.5px] font-medium uppercase tracking-wide text-white/50">
          {date}
        </p>
      </div>
    </div>
  );
}

// ─── BiomarkerWinnerCard — card de elogio (slide 5) ────────────────────────

function BiomarkerWinnerCard({
  biomarker,
  delayMs,
}: {
  biomarker: Biomarker;
  delayMs: number;
}) {
  return (
    <div
      className="story-pop flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(16,185,129,0.15)]"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
        <Check className="h-5 w-5" strokeWidth={2.5} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[14px] font-semibold text-zinc-900">
            {biomarker.name}
          </span>
          <span className="shrink-0 text-[13px] font-semibold tabular-nums text-emerald-700">
            {biomarker.value}
            <span className="ml-0.5 text-[10px] font-normal text-zinc-400">
              {biomarker.unit}
            </span>
          </span>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-600">
          {explainWinner(biomarker)}
        </p>
      </div>
    </div>
  );
}

// ─── BiomarkerConcernPreviewCard — preview no slide 6 ──────────────────────

function BiomarkerConcernPreviewCard({
  biomarker,
  rank,
  delayMs,
}: {
  biomarker: Biomarker;
  rank: number;
  delayMs: number;
}) {
  const isOut = biomarker.status === "out";
  return (
    <div
      className={cn(
        "story-pop flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)]",
        isOut ? "border-rose-200" : "border-amber-200",
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-full text-[16px] font-bold tabular-nums",
          isOut
            ? "bg-rose-100 text-rose-700"
            : "bg-amber-100 text-amber-700",
        )}
      >
        {rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[14px] font-semibold text-zinc-900">
            {biomarker.name}
          </span>
          <span
            className={cn(
              "shrink-0 text-[13px] font-semibold tabular-nums",
              isOut ? "text-rose-700" : "text-amber-700",
            )}
          >
            {biomarker.value}
            <span className="ml-0.5 text-[10px] font-normal text-zinc-400">
              {biomarker.unit}
            </span>
          </span>
        </div>
        <p className="mt-0.5 text-[11.5px] text-zinc-500">
          Faixa ideal: {biomarker.referenceLabel} {biomarker.unit}
        </p>
      </div>
    </div>
  );
}

// ─── BiomarkerDeepDiveSlide — análise profunda AI-personalizada ────────────
//
// Lucas (2026-05-17): "Não precisa escrever tanto, deixe a opção de ler
// mais como opcional, passe a mensagem principal de cada biomarcador e
// se ele quiser, tem um botão para expandir o texto e ler mais."
//
// Comportamento:
//   - Mostra valor + faixa ideal num card de status (verde/amarelo/vermelho)
//   - Mensagem principal (1 frase) sempre visível
//   - Botão "Saber mais" → expande mostrando:
//       • "Por que isso aconteceu?" (whyHappened — relacionado com perfil)
//       • "O que fazer?" (whatToDo — 2-3 bullets)
//       • "Quanto tempo?" (timeline)
//
// Conteúdo vem da AI (GPT-5) via /api/dados/personalized-insights.
// Loading: skeleton enquanto carrega. Fallback estático se AI falhar.

function BiomarkerDeepDiveSlide({
  biomarker,
  insight,
  loading,
  variant,
  position,
  total,
}: {
  biomarker: Biomarker;
  insight?: BiomarkerInsightData;
  loading: boolean;
  variant: "concern" | "winner";
  position: number;
  total: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isOptimal = variant === "winner";

  // Cores por variant
  const theme = isOptimal
    ? {
        kicker: "bg-emerald-100 text-emerald-700 ring-emerald-200",
        kickerLabel: `Ponto forte ${position}/${total}`,
        valueColor: "text-emerald-700",
        rangeBarFill: "bg-emerald-500",
        cardBg: "bg-gradient-to-br from-emerald-50 via-white to-white",
        statusText: "Tá na faixa ótima",
      }
    : biomarker.status === "out"
      ? {
          kicker: "bg-rose-100 text-rose-700 ring-rose-200",
          kickerLabel: `A melhorar ${position}/${total}`,
          valueColor: "text-rose-700",
          rangeBarFill: "bg-rose-500",
          cardBg: "bg-gradient-to-br from-rose-50 via-white to-white",
          statusText: "Fora da faixa",
        }
      : {
          kicker: "bg-amber-100 text-amber-700 ring-amber-200",
          kickerLabel: `A melhorar ${position}/${total}`,
          valueColor: "text-amber-700",
          rangeBarFill: "bg-amber-500",
          cardBg: "bg-gradient-to-br from-amber-50 via-white to-white",
          statusText: "Atenção (perto da faixa)",
        };

  // Calcula posição do dot na range bar (0-100%)
  const optMin = biomarker.optimalRange?.[0];
  const optMax = biomarker.optimalRange?.[1];
  const normMin = biomarker.normalRange?.[0];
  const normMax = biomarker.normalRange?.[1];
  const allBounds = [
    optMin,
    optMax,
    normMin,
    normMax,
    biomarker.value,
  ].filter((v): v is number => typeof v === "number");
  const rawMin = Math.min(...allBounds);
  const rawMax = Math.max(...allBounds);
  const span = rawMax - rawMin;
  const padding = Math.max(span * 0.1, rawMax * 0.05, 1);
  const scaleMin = Math.max(0, rawMin - padding);
  const scaleMax = rawMax + padding;
  const range = scaleMax - scaleMin;
  const dotPct = ((biomarker.value - scaleMin) / range) * 100;

  return (
    <div className={cn("flex h-full w-full", theme.cardBg)}>
      <div className="relative flex-1 overflow-y-auto overscroll-contain px-5 pt-[88px] pb-[120px]">
        <div className="mx-auto w-full max-w-md text-left">
          <div
            className={cn(
              "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ring-1",
              theme.kicker,
            )}
          >
            {theme.kickerLabel}
          </div>

          <h2 className="mt-3 text-[26px] font-semibold tracking-tight text-zinc-900 leading-[1.1] story-fade-up">
            {biomarker.name}
          </h2>

          {/* Card valor + range bar */}
          <div className="story-fade-up-2 mt-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  Seu valor
                </div>
                <div className={cn("text-[32px] font-semibold leading-none tabular-nums", theme.valueColor)}>
                  <AnimatedNumber value={biomarker.value} decimals={biomarker.value < 10 ? 1 : 0} />
                  <span className="ml-1 text-[14px] font-normal text-zinc-400">
                    {biomarker.unit}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  Ideal
                </div>
                <div className="text-[14px] font-semibold tabular-nums text-zinc-700">
                  {biomarker.referenceLabel}
                </div>
              </div>
            </div>

            {/* Range bar visual */}
            <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              {typeof optMin === "number" && typeof optMax === "number" && (
                <div
                  className="absolute inset-y-0 rounded-full bg-emerald-200"
                  style={{
                    left: `${((optMin - scaleMin) / range) * 100}%`,
                    width: `${((optMax - optMin) / range) * 100}%`,
                  }}
                />
              )}
              <div
                className={cn(
                  "absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white shadow",
                  theme.rangeBarFill,
                )}
                style={{ left: `${dotPct}%`, top: "50%" }}
              />
            </div>
            <div className="mt-2 text-[11.5px] font-medium text-zinc-500">
              {theme.statusText}
            </div>
          </div>

          {/* Mensagem principal (curta) */}
          <div className="story-fade-up-3 mt-4">
            {loading && !insight ? (
              <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 ring-1 ring-zinc-200">
                <div className="h-3 w-3 animate-pulse rounded-full bg-zinc-300" />
                <span className="text-[12.5px] text-zinc-500">
                  Dr. Lon analisando...
                </span>
              </div>
            ) : (
              <p className="text-[15.5px] font-medium leading-snug text-zinc-800">
                {insight?.mainMessage ?? "Análise não disponível agora."}
              </p>
            )}
          </div>

          {/* Botão saber mais + conteúdo expandido */}
          {insight ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((v) => !v);
                }}
                className={cn(
                  "mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition",
                  expanded
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
                )}
                aria-expanded={expanded}
              >
                {expanded ? "Fechar" : "Saber mais"}
                <ChevronRight
                  className={cn(
                    "h-3 w-3 transition-transform",
                    expanded ? "rotate-90" : "rotate-0",
                  )}
                />
              </button>

              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-out",
                  expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/60 p-4 backdrop-blur-sm">
                    <section>
                      <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                        Por que isso aconteceu?
                      </h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-zinc-700">
                        {insight.whyHappened}
                      </p>
                    </section>

                    <section>
                      <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                        O que fazer?
                      </h3>
                      <ul className="mt-1 flex flex-col gap-1.5">
                        {insight.whatToDo.map((action, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-[13px] leading-relaxed text-zinc-700"
                          >
                            <span className={cn("mt-1.5 h-1 w-1 shrink-0 rounded-full", theme.rangeBarFill)} />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section>
                      <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                        Quanto tempo pra mudar?
                      </h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-zinc-700">
                        {insight.timeline}
                      </p>
                    </section>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── BundleSlide — slide 7 ("Resolver tudo") ──────────────────────────────
//
// Lucas (2026-05-17): bulk buttons (Assinar tudo / Comprar uma vez) ficam
// no TOPO; lista de produtos individuais com botões próprios fica
// EMBAIXO; tudo num único slide scrollable.

function BundleSlide({
  recommendations,
  firstName,
}: {
  recommendations: ReturnType<typeof getRecommendedProducts>;
  firstName: string;
}) {
  const cart = useCart();
  const [bulkAdded, setBulkAdded] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const products = recommendations.map((r) => r.product);
  const totalOnce = products.reduce((sum, p) => sum + p.priceBRL, 0);
  const totalSubscribe = Math.round(totalOnce * 0.9); // 10% off bundle/sub

  const handleResolveAll = useCallback(
    (recurring: boolean) => {
      cart.addItems(
        products.map((p) => p.id),
        { recurring },
      );
      setBulkAdded(true);
      setTimeout(() => cart.openCart(), 800);
    },
    [cart, products],
  );

  const handleAddSingle = useCallback(
    (productId: string, recurring: boolean) => {
      cart.addItem(productId, { recurring });
      setAddedIds((prev) => new Set(prev).add(productId));
    },
    [cart],
  );

  return (
    <div className="relative flex h-full w-full flex-col text-white">
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div
          className="h-[600px] w-[600px] rounded-full opacity-40 blur-[60px] story-glow"
          style={{
            background:
              "radial-gradient(circle, #3f9a6b 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Container scrollable — pra caber lista grande de produtos.
          Padding top/bottom dá espaço pro header dos stories (progress
          bar + close) e pro botão "Continuar" do rodapé.

          py-[88px,120px] = ~88px top (header+logo), ~120px bottom (CTA
          do story shell). Em mobile menor (< 600px viewport height) o
          overflow garante que dá pra rolar até o último produto. */}
      <div className="relative flex-1 overflow-y-auto overscroll-contain px-5 pt-[88px] pb-[120px]">
        <div className="mx-auto w-full max-w-md story-card-in text-center">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300 ring-1 ring-emerald-400/30">
            <Sparkles className="h-3 w-3" />
            Bora resolver
          </div>
          <h2 className="mt-3 text-[26px] font-semibold tracking-tight leading-[1.05]">
            Pra cada um,<br />a gente já tem
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-white/70">
            {firstName}, pra cada marcador que tá pedindo atenção, a
            Longevify tem um suplemento — sem chute, com evidência. Pega
            tudo de uma vez (mais barato) ou escolhe um por um.
          </p>

          {/* Totais lado-a-lado */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-left">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-white/55">
                Comprar tudo
              </div>
              <div className="text-[18px] font-semibold tabular-nums text-white">
                R$ {totalOnce}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-emerald-200">
                Assinar (10% off)
              </div>
              <div className="text-[18px] font-semibold tabular-nums text-emerald-100">
                R$ {totalSubscribe}
                <span className="ml-1 text-[10px] font-normal">/mês</span>
              </div>
            </div>
          </div>

          {/* CTAs BULK no topo */}
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleResolveAll(true);
              }}
              disabled={bulkAdded || products.length === 0}
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold transition will-change-transform hover:scale-[1.01]",
                bulkAdded
                  ? "bg-emerald-500 text-white"
                  : "bg-white text-brand-800 hover:bg-white/90",
              )}
            >
              {bulkAdded ? (
                <>
                  <Check className="h-4 w-4" />
                  Tá no carrinho
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Assinar tudo (mais barato)
                </>
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleResolveAll(false);
              }}
              disabled={bulkAdded || products.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white/10 px-6 py-2.5 text-[12.5px] font-semibold text-white backdrop-blur-md transition hover:bg-white/20 ring-1 ring-white/20 disabled:opacity-50"
            >
              Só comprar uma vez tudo
            </button>
          </div>

          {/* Separador */}
          <div className="mt-6 flex items-center gap-3 text-[10.5px] uppercase tracking-[0.18em] text-white/40">
            <span className="h-px flex-1 bg-white/10" />
            <span>ou escolha um por um</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          {/* Lista de produtos com cards BRANCOS pra quebrar o verde
              monotônico do slide (Lucas 2026-05-17: "coloque um pouco
              de branco nos cards para variar desse verde").
              Mudanças vs versão anterior:
              - bg-white em vez de bg-white/[0.07] → contraste forte
              - Foto do produto (r.product.image) com fallback de ícone
              - Padding mais apertado → cards menores
              - Texto zinc-900 (escuro) em fundo branco
              - Botões mantêm o verde pra reforçar a marca */}
          <div className="mt-4 flex flex-col gap-2.5 text-left">
            {recommendations.map((r, i) => {
              const isAdded = addedIds.has(r.product.id) || bulkAdded;
              const subPrice = Math.round(r.product.priceBRL * 0.9);
              const primaryConcern = r.matchedBiomarkers[0];
              const targetLabel = primaryConcern
                ? `Pra ${primaryConcern.name}`
                : "Recomendado pra você";
              return (
                <div
                  key={r.product.id}
                  className={cn(
                    "story-pop overflow-hidden rounded-2xl bg-white transition-all",
                    "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)]",
                    isAdded
                      ? "ring-2 ring-emerald-400"
                      : "ring-1 ring-white/20 hover:ring-white/40",
                  )}
                  style={{ animationDelay: `${500 + i * 100}ms` }}
                >
                  {/* Cabeçalho — foto + info do produto */}
                  <div className="flex items-start gap-2.5 px-3 pt-3 pb-2">
                    {/* Foto do produto. Fallback pro ícone cápsula
                        quando o produto não tem imagem cadastrada. */}
                    <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-emerald-50 ring-1 ring-emerald-100">
                      {r.product.image ? (
                        <Image
                          src={r.product.image}
                          alt={r.product.name}
                          width={48}
                          height={48}
                          className="h-12 w-12 object-contain"
                        />
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="h-6 w-6 text-emerald-600"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M8.5 8.5l7 7" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[13.5px] font-semibold leading-tight text-zinc-900">
                        {r.product.name}
                      </h3>
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-100">
                        {targetLabel}
                      </div>
                    </div>
                  </div>

                  {/* Razão clínica — texto zinc num bg branco quase */}
                  <p className="px-3 pb-2.5 text-[11.5px] leading-relaxed text-zinc-600">
                    {r.reason}
                  </p>

                  {/* Botões — Comprar (cinza claro) + Assinar (verde) */}
                  <div className="grid grid-cols-2 gap-0 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddSingle(r.product.id, false);
                      }}
                      disabled={isAdded}
                      className={cn(
                        "group flex flex-col items-center gap-0.5 py-2 transition-colors",
                        isAdded
                          ? "bg-zinc-50 text-zinc-400"
                          : "bg-white text-zinc-800 hover:bg-zinc-50",
                      )}
                    >
                      {isAdded ? (
                        <span className="text-[12px] font-semibold">✓ Adicionado</span>
                      ) : (
                        <>
                          <span className="text-[9.5px] uppercase tracking-wide text-zinc-400 group-hover:text-zinc-500">
                            Comprar
                          </span>
                          <span className="text-[13px] font-semibold tabular-nums">
                            R$ {r.product.priceBRL}
                          </span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddSingle(r.product.id, true);
                      }}
                      disabled={isAdded}
                      className={cn(
                        "group relative flex flex-col items-center gap-0.5 border-l border-zinc-100 py-2 transition-colors",
                        isAdded
                          ? "bg-emerald-50 text-emerald-400"
                          : "bg-gradient-to-br from-brand-600 to-brand-800 text-white hover:from-brand-700 hover:to-brand-900",
                      )}
                    >
                      {!isAdded && (
                        <span className="absolute right-1.5 top-1 rounded-full bg-emerald-300 px-1.5 py-px text-[9px] font-bold text-emerald-900">
                          −10%
                        </span>
                      )}
                      <span className="text-[9.5px] uppercase tracking-wide opacity-75 group-hover:opacity-100">
                        Assinar
                      </span>
                      <span className="text-[13px] font-semibold tabular-nums">
                        R$ {subPrice}
                        <span className="ml-0.5 text-[9.5px] font-normal opacity-65">
                          /mês
                        </span>
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hint sutil de scroll, só quando há produtos suficientes pra
              passar do viewport (3+). Mobile small height precisa do
              cue visual. */}
          {recommendations.length >= 3 ? (
            <p className="mt-4 text-[11px] text-white/40">
              ↑ role pra ver tudo
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────
//
// Stories Instagram-style.
//
// Avanço MANUAL (Lucas 2026-05: "Quero que só dê para passar o story
// clicando, ou seja, tempo infinito se não fizer nada"). Slides só
// avançam por: tap nas bordas, botão Continuar, setas do teclado.
// Sem timer, sem auto-advance, sem hold-to-pause — fica aberto até
// o user fechar.
//
// 15 slides (Lucas 2026-05-17: adicionou 6 análises por biomarcador AI):
//   1. Overall                7-9. Análise profunda dos 3 piores (AI)
//   2. Idade biológica        10-12. Análise profunda dos 3 melhores (AI)
//   3. Score                  13. Resolver tudo (pacote)
//   4. Pontos fortes          14. Sua trajetória
//   5. Exames melhores        15. CTA final
//   6. Pontos a melhorar

export function PostExamStories({
  patient,
  storageKey = "longevify-stories-shown-v6",
  forceShow = false,
  onClose,
  prefetchedInsights,
}: PostExamStoriesProps) {
  const [open, setOpen] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  // Quando o user finaliza no último slide ("Começar"), entra em
  // modo finale: stories continuam visíveis ATRÁS de uma transição
  // cinematográfica que termina chamando close() depois de 1900ms.
  const [showingFinale, setShowingFinale] = useState(false);

  // Insights AI-personalized. Inicializa com prefetchedInsights (server-
  // side pre-fetch — Lucas 2026-05-18 pediu que análise esteja pronta
  // antes do user abrir as stories pra não esperar). Se prop vazia,
  // cai pro fetch client-side lazy como fallback.
  const [insights, setInsights] = useState<
    Record<string, BiomarkerInsightData>
  >(prefetchedInsights ?? {});
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Contexto compartilhado pros slides. Memo evita recalcular base; só
  // insights/insightsLoading mudam separadamente quando a IA responde.
  const baseCtx = useMemo(() => {
    return {
      patient,
      topConcerns: pickTopConcerns(BIOMARKERS, 3),
      topWinners: pickTopWinners(BIOMARKERS, 3),
      recommendations: getRecommendedProducts(BIOMARKERS, 4),
    };
  }, [patient]);

  const ctx: StoryCtx = {
    ...baseCtx,
    insights,
    insightsLoading,
  };

  // Fallback client-side: se NÃO veio prefetchedInsights (caso edge —
  // server component pre-fetch falhou ou não foi feito), dispara fetch
  // quando stories abre. Cenário comum: home page sem pre-fetch.
  useEffect(() => {
    if (!open) return;
    const ids = [
      ...baseCtx.topConcerns.map((b) => b.id),
      ...baseCtx.topWinners.map((b) => b.id),
    ];
    if (ids.length === 0) return;
    // Já temos insights pra todos (prefetch OU fetch anterior)? Skip.
    if (ids.every((id) => insights[id])) return;

    const controller = new AbortController();
    setInsightsLoading(true);
    fetch("/api/dados/personalized-insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        biomarkerIds: ids,
        patient: {
          firstName: patient.firstName,
          chronologicalAge: patient.chronologicalAge,
          biologicalAge: patient.biologicalAge,
          longevifyScore: patient.longevifyScore,
          sex: patient.sex,
        },
      }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: { insights?: Record<string, BiomarkerInsightData> }) => {
        if (data.insights) {
          setInsights((prev) => ({ ...prev, ...data.insights }));
        }
      })
      .catch(() => {
        // Silent fail — slides usam fallback estático local
      })
      .finally(() => {
        setInsightsLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- insights intentionally omitted to avoid refetch loop
  }, [open, baseCtx, patient]);

  // onClose como ref pra evitar recriação de close/advance quando o
  // parent passar arrow inline (fix antigo, mantido por segurança)
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Abre por forceShow OU por flag localStorage
  useEffect(() => {
    if (forceShow) {
      setOpen(true);
      setSlideIdx(0);
      setShowingFinale(false);
      return;
    }
    try {
      const shown = localStorage.getItem(storageKey);
      if (!shown) setOpen(true);
    } catch {
      // ignore
    }
  }, [storageKey, forceShow]);

  const close = useCallback(() => {
    setOpen(false);
    setShowingFinale(false);
    try {
      localStorage.setItem(storageKey, new Date().toISOString());
    } catch {
      // ignore
    }
    onCloseRef.current?.();
  }, [storageKey]);

  // Dispara a transição cinematográfica final. Não fecha imediatamente —
  // espera o overlay terminar (~1900ms) pra dar close() de verdade.
  const startFinale = useCallback(() => {
    setShowingFinale(true);
  }, []);

  const advance = useCallback(() => {
    setSlideIdx((prev) => {
      if (prev >= SLIDES.length - 1) {
        close();
        return prev;
      }
      return prev + 1;
    });
  }, [close]);

  const back = useCallback(() => {
    setSlideIdx((prev) => Math.max(0, prev - 1));
  }, []);

  // Auto-advance REMOVIDO (Lucas 2026-05: "Quero que só dê para passar
  // o story clicando, ou seja, tempo infinito se não fizer nada").
  // Slides só avançam por tap-zone, keyboard, ou botão Continuar.
  // Progress bar agora reflete posição estática (preenchido = visitado).

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") advance();
      if (e.key === "ArrowLeft") back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close, advance, back]);

  if (!open) return null;

  const Slide = SLIDES[slideIdx];
  const theme = Slide.theme;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex flex-col select-none",
        theme === "light"
          ? "bg-white"
          : theme === "tinted"
            ? "bg-gradient-to-br from-[#0d2818] via-[#143D28] to-[#0F3020]"
            : "bg-gradient-to-br from-[#0d2818] via-[#103a26] to-[#0F3020]",
      )}
    >
      {/* Header: progress bars + close. Bars são estáticas — preenchidas
          se já passou pelo slide (incluindo o atual), vazias pra futuros.
          Lucas 2026-05: sem auto-advance, sem timer animado. */}
      <header
        className="relative z-30 flex items-center gap-2 px-4 pb-2"
        style={{ paddingTop: "max(env(safe-area-inset-top), 1rem)" }}
      >
        <div className="flex flex-1 items-center gap-1.5">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 overflow-hidden rounded-full",
                theme === "light" ? "bg-zinc-200" : "bg-white/15",
              )}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300",
                  theme === "light" ? "bg-zinc-900" : "bg-white",
                )}
                style={{ width: i <= slideIdx ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
          aria-label="Fechar apresentação"
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full transition",
            theme === "light"
              ? "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              : "bg-white/10 text-white/80 hover:bg-white/20",
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Logo Longevify topo (slides dark/tinted) */}
      {theme !== "light" && (
        <div
          className="absolute left-1/2 z-20 -translate-x-1/2 text-[13px] font-semibold tracking-[0.18em] uppercase text-white/85"
          style={{
            top: "calc(max(env(safe-area-inset-top), 1rem) + 1.75rem)",
          }}
        >
          longevify
        </div>
      )}

      {/* Slide content — key={slideIdx} força remount + entrance animations */}
      <div
        key={slideIdx}
        className="story-slide-shell relative flex flex-1 items-center justify-center"
      >
        {Slide.render(ctx)}
      </div>

      <style jsx global>{`
        /* Entrance principal do slide — fade + slight slide + scale */
        .story-slide-shell > * {
          animation: storySlideIn 480ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes storySlideIn {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.97);
            filter: blur(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        /* Card hero — entrada mais grande + delay leve */
        .story-card-in {
          animation: storyCardIn 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 120ms;
        }
        @keyframes storyCardIn {
          0% {
            opacity: 0;
            transform: translateY(28px) scale(0.94);
          }
          60% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Texto secundário com fade-up staggered */
        .story-fade-up {
          animation: storyFadeUp 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 200ms;
        }
        .story-fade-up-2 {
          animation: storyFadeUp 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 320ms;
        }
        .story-fade-up-3 {
          animation: storyFadeUp 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 0ms;
        }
        @keyframes storyFadeUp {
          0% {
            opacity: 0;
            transform: translateY(16px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Pop nos chips e ações — escala + bounce leve */
        .story-pop {
          animation: storyPop 500ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
          opacity: 0;
        }
        @keyframes storyPop {
          0% {
            opacity: 0;
            transform: scale(0.7);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Glow background pulsando devagar */
        .story-glow {
          animation: storyGlow 4s ease-in-out infinite;
        }
        @keyframes storyGlow {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.05);
          }
        }

        /* CTA final — pulsa mais forte pra chamar atenção */
        .story-pulse {
          animation: storyPulse 2.4s ease-in-out infinite;
        }
        @keyframes storyPulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 0.85;
            transform: scale(1.1);
          }
        }

      `}</style>

      {/* Tap zones nas BORDAS (10% cada). Middle fica livre pros elementos
          interativos (chips, actions). */}
      <button
        type="button"
        aria-label="Anterior"
        onClick={(e) => {
          e.stopPropagation();
          back();
        }}
        className="absolute inset-y-0 left-0 z-10 w-[12%]"
      />
      <button
        type="button"
        aria-label="Próximo"
        onClick={(e) => {
          e.stopPropagation();
          advance();
        }}
        className="absolute inset-y-0 right-0 z-10 w-[12%]"
      />

      {/* Footer CTA — último slide dispara a transição cinematográfica
          em vez de fechar direto. */}
      <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center px-6">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (slideIdx === SLIDES.length - 1) startFinale();
            else advance();
          }}
          className={cn(
            "inline-flex w-full max-w-md items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[14px] font-semibold transition will-change-transform hover:scale-[1.01]",
            theme === "light"
              ? "bg-zinc-900 text-white hover:bg-zinc-800"
              : "bg-white/10 text-white backdrop-blur-md hover:bg-white/20 ring-1 ring-white/20",
          )}
        >
          {slideIdx === SLIDES.length - 1 ? "Começar" : "Continuar"}
          {slideIdx < SLIDES.length - 1 && <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Back button (não no primeiro slide) */}
      {slideIdx > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            back();
          }}
          aria-label="Voltar"
          className={cn(
            "absolute left-4 z-30 grid h-9 w-9 place-items-center rounded-full transition",
            theme === "light"
              ? "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              : "bg-white/10 text-white/80 hover:bg-white/20",
          )}
          style={{
            top: "calc(max(env(safe-area-inset-top), 1rem) + 3rem)",
          }}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Transição cinematográfica final — overlay z-[80] acima das
          stories. Quando termina, dispara close() de verdade. */}
      {showingFinale ? (
        <StoriesFinaleTransition
          firstName={patient.firstName}
          onComplete={close}
        />
      ) : null}
    </div>
  );
}
