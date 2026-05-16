"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Heart,
  ClipboardCheck,
  TrendingUp,
  Apple,
  Sparkles,
  ShoppingBag,
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
import type { Product } from "@/lib/products";
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

/** Tom didático pra explicar o que o biomarcador alterado SIGNIFICA. */
function explainConcern(b: Biomarker): string {
  switch (b.id) {
    case "ldl":
      return "LDL é o colesterol que tende a depositar nas paredes das artérias. Acima de 100 mg/dL começa a aumentar risco cardiovascular a longo prazo.";
    case "apob":
      return "ApoB conta o número de partículas que carregam colesterol pro sangue — é o termômetro mais preciso de risco cardio.";
    case "vitd":
      return "Vitamina D regula osso, imunidade e humor. Abaixo de 50 ng/dL você não está com reserva ideal.";
    case "hba1c":
      return "HbA1c mostra a média da glicose dos últimos 2-3 meses. Acima de 5.7% começa a sinalizar resistência insulínica.";
    case "crp":
      return "PCR ultrassensível mede inflamação silenciosa no corpo. Inflamação crônica acelera envelhecimento.";
    case "hdl":
      return "HDL é o colesterol 'limpa-trilho' — quanto mais alto, mais proteção cardiovascular.";
    case "ferritin":
      return "Ferritina mostra suas reservas de ferro. Baixa = anemia em formação. Alta = inflamação.";
    case "testo":
      return "Testosterona regula massa magra, libido, energia e densidade óssea — em homens e mulheres.";
    default:
      return `${b.name} está fora da faixa ideal. Vamos trabalhar pra normalizar.`;
  }
}

/** Tom curto + positivo pra explicar por que o biomarcador ótimo é bom. */
function explainWinner(b: Biomarker): string {
  switch (b.id) {
    case "ldl":
      return "Seu colesterol 'ruim' tá protegido — risco cardio baixo nesse marcador.";
    case "apob":
      return "Número de partículas aterogênicas baixo — coração agradece.";
    case "vitd":
      return "Reserva de Vit D ideal — imunidade, osso e humor recebem o suficiente.";
    case "hdl":
      return "HDL alto = proteção cardiovascular natural.";
    case "ferritin":
      return "Reserva de ferro saudável — energia e oxigenação em dia.";
    case "hba1c":
      return "Glicose média ótima — sensibilidade à insulina preservada.";
    case "testo":
      return "Hormônio em faixa boa pra massa magra e disposição.";
    default:
      return `${b.name} está na faixa ideal. Continua assim.`;
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
              Bem-vindo, {patient.firstName}
            </p>
            <h2 className="text-[26px] font-semibold tracking-tight leading-[1.1]">
              Aqui está sua saúde<br />em uma página
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
              Toque na lateral pra avançar · sem pressa, fica aberto até você fechar
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
              Sua idade biológica é {patient.biologicalAge}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-white/75">
              {younger
                ? `Você está ${Math.abs(delta).toFixed(1)} anos mais jovem que sua idade cronológica. Seus biomarcadores indicam um corpo metabolicamente mais novo.`
                : `Seus biomarcadores estão envelhecendo um pouco mais rápido que sua idade cronológica. Vamos reverter isso.`}
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
            Toque em cada sistema pra ver a nota
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
              Seus pontos fortes
            </h2>
            <p className="mt-1 text-center text-[13px] text-zinc-500">
              <span className="font-semibold text-emerald-700">
                <AnimatedNumber value={winners.length} />
              </span>{" "}
              de {total} sistemas orgânicos estão indo excepcionalmente bem
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
            Pontos altos
          </div>
          <h2 className="mt-3 text-[26px] font-semibold tracking-tight text-zinc-900 leading-[1.1] story-fade-up">
            {patient.firstName}, esses resultados<br />
            estão excelentes
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-zinc-600 story-fade-up-2">
            Vamos começar pelo que tá indo bem — esses marcadores estão na
            faixa ótima e merecem ser preservados.
          </p>

          <div className="mt-7 flex flex-col gap-2.5">
            {topWinners.length === 0 ? (
              <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-[13px] text-zinc-500">
                Nenhum biomarcador em faixa ótima ainda — vamos focar nos
                pontos a melhorar pra mudar isso.
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
            Pontos a melhorar
          </div>
          <h2 className="mt-3 text-[26px] font-semibold tracking-tight text-zinc-900 leading-[1.1] story-fade-up">
            Agora, onde dá<br />
            pra ganhar mais
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-zinc-600 story-fade-up-2">
            {patient.firstName}, identificamos {topConcerns.length} marcadores
            com espaço pra otimização. Próximos slides mostram exatamente o
            que fazer com cada um — com o suplemento Longevify direto ao lado.
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
  // 7-9. FOCO POR BIOMARCADOR — 3 slides com produto Longevify lateral
  //      Lucas: "Sua vitamina D veio baixa -> logo ao lado ja tem uma
  //      opção para resolver o problema, com um botão de comprar ou
  //      assinar o suplemento de vitamina D da longevify".
  ...([0, 1, 2] as const).map((idx) => ({
    id: `focus-bio-${idx}` as const,
    theme: "light" as const,
    duration: 6000,
    render: (ctx: StoryCtx) => {
      const biomarker = ctx.topConcerns[idx];
      if (!biomarker) return null;
      const rec = ctx.recommendations.find((r) =>
        r.product.targetsBiomarkers.includes(biomarker.id),
      );
      return (
        <BiomarkerFocusSlide
          idx={idx}
          biomarker={biomarker}
          product={rec?.product}
          reason={rec?.reason}
        />
      );
    },
  })),

  // ──────────────────────────────────────────────────────────────────────────
  // 10. BUNDLE — "Resolver tudo de uma vez"
  //     Lucas: "um botão central com alguma mensagem similar a essa
  //     'resolver todos os problemas', esse botão assinará ou comprará
  //     tudo que foi recomendado".
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
            Sua trajetória
          </p>
          <h2 className="mt-2 text-[26px] font-semibold tracking-tight leading-[1.1]">
            O Longevify trabalha<br />em ciclos de 6 meses
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-white/65">
            2 coletas por ano. Tempo suficiente pra protocolo agir e
            biomarcadores responderem antes da reavaliação completa.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-2.5 text-left">
            <TimelineItem
              icon={ClipboardCheck}
              date={formatDatePtBR(patient.latestExamDate)}
              title="Coleta inicial — feita"
              detail="Painel completo · 50+ biomarcadores"
              done
              delay={150}
            />
            <TimelineItem
              icon={Apple}
              date="Próximos 6 meses"
              title="Protocolo ativo"
              detail="Hábitos diários + suplementação"
              delay={300}
            />
            <TimelineItem
              icon={TrendingUp}
              date="Em 6 meses"
              title="Segunda coleta do ano"
              detail="Reavaliação completa — Painel inteiro novamente"
              delay={450}
            />
            <TimelineItem
              icon={Heart}
              date="Contínuo"
              title="Concierge Dr. Lon"
              detail="IA médica + equipe humana 24/7 entre coletas"
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
            Pronto, {patient.firstName}?
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/75">
            Seu protocolo já está na home. Comece pela primeira ação de hoje —
            cinco minutos por dia mudam a curva.
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

// ─── BiomarkerFocusSlide — slide 7/8/9 (foco + produto lateral) ────────────

const FOCUS_THEMES = [
  {
    bg: "from-rose-50 via-white to-white",
    accent: "text-rose-600",
    accentBg: "bg-rose-100",
    ring: "border-rose-200",
    kicker: "Foco #1 — Prioridade",
  },
  {
    bg: "from-amber-50 via-white to-white",
    accent: "text-amber-700",
    accentBg: "bg-amber-100",
    ring: "border-amber-200",
    kicker: "Foco #2",
  },
  {
    bg: "from-sky-50 via-white to-white",
    accent: "text-sky-700",
    accentBg: "bg-sky-100",
    ring: "border-sky-200",
    kicker: "Foco #3",
  },
];

function BiomarkerFocusSlide({
  idx,
  biomarker,
  product,
  reason,
}: {
  idx: number;
  biomarker: Biomarker;
  product?: Product;
  reason?: string;
}) {
  const theme = FOCUS_THEMES[idx] ?? FOCUS_THEMES[0];
  const cart = useCart();

  const handleAddSingle = useCallback(
    (recurring: boolean) => {
      if (!product) return;
      cart.addItem(product.id, { recurring });
      cart.openCart();
    },
    [cart, product],
  );

  return (
    <div className={cn("flex h-full w-full bg-gradient-to-br", theme.bg)}>
      <div className="m-auto flex w-full max-w-md flex-col px-6 py-14">
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.18em]",
            theme.accent,
          )}
        >
          {theme.kicker}
        </p>

        <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-zinc-900 leading-[1.1] story-fade-up">
          Sua {biomarker.name.toLowerCase()} veio{" "}
          <span className={theme.accent}>
            {biomarker.status === "out" ? "fora da faixa" : "abaixo do ótimo"}
          </span>
        </h2>

        {/* Card resumo do biomarcador */}
        <div className="mt-4 flex items-baseline gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm story-fade-up-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Seu valor
            </div>
            <div className={cn("text-[24px] font-semibold tabular-nums", theme.accent)}>
              <AnimatedNumber value={biomarker.value} />
              <span className="ml-1 text-[12px] font-normal text-zinc-400">
                {biomarker.unit}
              </span>
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Ideal
            </div>
            <div className="text-[14px] font-semibold tabular-nums text-zinc-700">
              {biomarker.referenceLabel}
            </div>
          </div>
        </div>

        <p className="mt-4 text-[13.5px] leading-relaxed text-zinc-600 story-fade-up-2">
          {explainConcern(biomarker)}
        </p>

        {/* CARD DO PRODUTO — Lucas: "logo ao lado já tem uma opção pra
            resolver o problema, com um botão de comprar ou assinar". */}
        {product ? (
          <div
            className={cn(
              "story-pop mt-5 overflow-hidden rounded-2xl border bg-white shadow-md",
              theme.ring,
            )}
            style={{ animationDelay: "500ms" }}
          >
            <div className="flex items-start gap-3 px-4 py-3.5">
              <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl", theme.accentBg)}>
                <ShoppingBag className={cn("h-5 w-5", theme.accent)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  Solução Longevify
                </div>
                <div className="text-[14px] font-semibold leading-tight text-zinc-900">
                  {product.name}
                </div>
                {reason ? (
                  <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-zinc-500">
                    {reason}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[10px] uppercase text-zinc-400">desde</div>
                <div className="text-[16px] font-semibold tabular-nums text-zinc-900">
                  R$ {product.priceBRL}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-px bg-zinc-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddSingle(false);
                }}
                className="bg-white py-2.5 text-[13px] font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                Comprar
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddSingle(true);
                }}
                className={cn(
                  "py-2.5 text-[13px] font-semibold text-white transition",
                  "bg-gradient-to-br from-brand-600 to-brand-800 hover:from-brand-700 hover:to-brand-900",
                )}
              >
                Assinar (10% off)
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[12.5px] text-zinc-500">
            Sua equipe Longevify vai personalizar a abordagem pra esse
            marcador — você vai receber a recomendação no protocolo.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BundleSlide — slide 10 ("Resolver tudo") ──────────────────────────────

function BundleSlide({
  recommendations,
  firstName,
}: {
  recommendations: ReturnType<typeof getRecommendedProducts>;
  firstName: string;
}) {
  const cart = useCart();
  const [added, setAdded] = useState(false);

  const products = recommendations.map((r) => r.product);
  const totalOnce = products.reduce((sum, p) => sum + p.priceBRL, 0);
  const totalSubscribe = Math.round(totalOnce * 0.9); // 10% off bundle/sub

  const handleResolveAll = useCallback(
    (recurring: boolean) => {
      cart.addItems(
        products.map((p) => p.id),
        { recurring },
      );
      setAdded(true);
      setTimeout(() => {
        cart.openCart();
      }, 800);
    },
    [cart, products],
  );

  return (
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
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300 ring-1 ring-emerald-400/30">
          <Sparkles className="h-3 w-3" />
          Pacote completo
        </div>
        <h2 className="mt-3 text-[28px] font-semibold tracking-tight leading-[1.05]">
          Resolver tudo<br />de uma vez
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">
          {firstName}, juntamos os {products.length} suplementos recomendados
          pros seus marcadores num pacote único.
        </p>

        {/* Lista compacta dos produtos */}
        <div className="mt-5 flex flex-col gap-1.5 rounded-2xl border border-white/15 bg-white/[0.06] p-3 backdrop-blur-md">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 text-left"
            >
              <span className="truncate text-[12.5px] text-white/85">
                {p.name}
              </span>
              <span className="shrink-0 text-[11.5px] tabular-nums text-white/55">
                R$ {p.priceBRL}
              </span>
            </div>
          ))}
        </div>

        {/* Totais */}
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

        {/* CTAs */}
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleResolveAll(true);
            }}
            disabled={added || products.length === 0}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[14px] font-semibold transition will-change-transform hover:scale-[1.01]",
              added
                ? "bg-emerald-500 text-white"
                : "bg-white text-brand-800 hover:bg-white/90",
            )}
          >
            {added ? (
              <>
                <Check className="h-4 w-4" />
                Adicionado ao carrinho
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Assinar pacote completo
              </>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleResolveAll(false);
            }}
            disabled={added || products.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white/10 px-6 py-2.5 text-[13px] font-semibold text-white backdrop-blur-md transition hover:bg-white/20 ring-1 ring-white/20 disabled:opacity-50"
          >
            Comprar tudo de uma vez
          </button>
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
// 12 slides, mannequim colorido por status nos slides 1 e 4. Ações
// dos focos (slides 5-7) são accordeões expansíveis com detalhes.

export function PostExamStories({
  patient,
  storageKey = "longevify-stories-shown-v4",
  forceShow = false,
  onClose,
}: PostExamStoriesProps) {
  const [open, setOpen] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  // Quando o user finaliza no último slide ("Começar"), entra em
  // modo finale: stories continuam visíveis ATRÁS de uma transição
  // cinematográfica que termina chamando close() depois de 1900ms.
  const [showingFinale, setShowingFinale] = useState(false);

  // Contexto compartilhado pros slides — top concerns/winners + produtos
  // recomendados. Memo evita recalcular a cada render.
  const ctx = useMemo<StoryCtx>(() => {
    return {
      patient,
      topConcerns: pickTopConcerns(BIOMARKERS, 3),
      topWinners: pickTopWinners(BIOMARKERS, 3),
      recommendations: getRecommendedProducts(BIOMARKERS, 4),
    };
  }, [patient]);

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
