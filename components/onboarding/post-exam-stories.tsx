"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Heart,
  ClipboardCheck,
  Activity,
  TrendingUp,
  Apple,
  Sparkles,
} from "lucide-react";
import { cn, formatDatePtBR } from "@/lib/utils";
import type {
  Patient,
  OrganScore,
} from "@/lib/mock-data";
import {
  StoriesMannequin,
  buildOrganStatuses,
} from "@/components/onboarding/stories-mannequin";
import { StoriesFinaleTransition } from "@/components/onboarding/stories-finale-transition";

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

type SlideTheme = "dark" | "light" | "tinted";

interface SlideContent {
  id: string;
  theme: SlideTheme;
  /** Duração em ms — slides com mais conteúdo/animação podem precisar
   *  de mais tempo. Default 5200ms. */
  duration?: number;
  render: (patient: Patient) => React.ReactNode;
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

// ─── Slide renders ──────────────────────────────────────────────────────────

const SLIDES: SlideContent[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // 1. WELCOME — hero card estilo "Seus pontos fortes" (Lucas pediu pra
  //    imitar a imagem que ele mandou: card com mannequin colorido + chips).
  {
    id: "welcome",
    theme: "tinted",
    duration: 5500,
    render: (patient) => {
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
    render: (patient) => {
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
    render: (patient) => (
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
    render: (patient) => {
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
  // 5-7. FOCOS — 3 slides separados pros 3 órgãos com mais espaço
  ...((): SlideContent[] => {
    const focusVariants = [
      {
        idx: 0,
        bg: "from-rose-50 via-white to-white",
        accent: "text-rose-500",
        ring: "ring-rose-200",
        title: (organ: string) => `Foco #1 — ${organ}`,
        kicker: "Prioridade máxima",
        desc: (organ: string) =>
          `${organ} é o sistema com mais espaço pra ganho. Vamos construir uma base aqui com 2-3 intervenções diretas nas próximas 4 semanas.`,
        actions: [
          {
            label: "Suplementação direcionada",
            detail:
              "Identificamos os 2-3 suplementos que mais movem a agulha pro seu marcador prioritário. Doses calibradas pro seu peso e perfil. Chega em casa com QR code pra confirmar a tomada diária no app.",
          },
          {
            label: "Hábito diário (15 min)",
            detail:
              "Um único hábito específico, cientificamente ligado ao marcador prioritário — pode ser Zona 2, sol matinal, sauna ou meditação. 15 minutos por dia, com lembrete e check-in no app.",
          },
          {
            label: "Reavaliar em 60 dias",
            detail:
              "Em 8 semanas você refaz só os 3-4 marcadores que estamos otimizando. Sem coleta completa nova. A gente confirma se a intervenção funcionou e ajusta o protocolo.",
          },
        ],
      },
      {
        idx: 1,
        bg: "from-amber-50 via-white to-white",
        accent: "text-amber-600",
        ring: "ring-amber-200",
        title: (organ: string) => `Foco #2 — ${organ}`,
        kicker: "Refinar marcadores",
        desc: (organ: string) =>
          `${organ} tem oportunidade clara com intervenções específicas. Já está perto da faixa ótima — pequenos ajustes movem a agulha.`,
        actions: [
          {
            label: "Ajuste fino na nutrição",
            detail:
              "Não é dieta nova — são 2-3 ajustes pontuais que afetam diretamente o marcador secundário. Ex: trocar gordura saturada por azeite + 30g de fibra solúvel/dia pra LDL borderline.",
          },
          {
            label: "Acompanhar biomarcador-chave",
            detail:
              "Definimos UM biomarcador como termômetro do progresso. Toda coleta nova ele aparece em destaque na home, com tendência clara de subida ou descida.",
          },
          {
            label: "Resposta em ~6 semanas",
            detail:
              "Marcadores secundários respondem mais rápido que os primários — em 6 semanas você já vê movimento na curva, mesmo sem coleta nova. O Dr. Lon te avisa assim que detecta a mudança.",
          },
        ],
      },
      {
        idx: 2,
        bg: "from-sky-50 via-white to-white",
        accent: "text-sky-500",
        ring: "ring-sky-200",
        title: (organ: string) => `Foco #3 — ${organ}`,
        kicker: "Preservar o que está bom",
        desc: (organ: string) =>
          `${organ} está saudável. O trabalho aqui é manter — hábitos consistentes evitam regressão e protegem o sistema a longo prazo.`,
        actions: [
          {
            label: "Hábitos consistentes",
            detail:
              "Não é hora de mudar — é hora de não mudar. Os hábitos que você já tem (sono, atividade, alimentação) seguram esse sistema saudável. Foco em consistência, não em intensidade.",
          },
          {
            label: "Reavaliação semestral",
            detail:
              "A cada 6 meses você refaz uma coleta completa pra confirmar que não regrediu. Mais frequente que isso aqui é desnecessário — esse sistema não precisa de monitoramento agressivo.",
          },
          {
            label: "Sem mudanças bruscas",
            detail:
              "Trocar dieta, suplementação ou treino drasticamente pode tirar um sistema saudável da faixa ótima. Mexer só se um marcador sair da curva — antes disso, deixa rodar.",
          },
        ],
      },
    ];

    return focusVariants.map((v) => ({
      id: `focus-${v.idx}`,
      theme: "light" as const,
      duration: 5500,
      render: (patient: Patient) => {
        const sorted = (patient.organScores ?? [])
          .slice()
          .sort((a, b) => a.score - b.score);
        const focus = sorted[v.idx];
        if (!focus) return null;

        return (
          <div className={cn("flex h-full w-full bg-gradient-to-br", v.bg)}>
            <div className="m-auto flex w-full max-w-md flex-col px-6 py-16">
              <p
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.18em]",
                  v.accent,
                )}
              >
                {v.kicker}
              </p>
              <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-zinc-900 leading-[1.05] story-fade-up">
                {v.title(focus.organ)}
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-zinc-600 story-fade-up-2">
                {v.desc(focus.organ)}
              </p>

              {/* Score chip */}
              <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-700 ring-1 ring-zinc-200 shadow-sm">
                <span className={cn("font-semibold tabular-nums", v.accent)}>
                  <AnimatedNumber value={focus.score} />
                </span>
                <span className="text-zinc-400">/100 score atual</span>
              </div>

              {/* Ações — interativo: tap pra expandir e ver detalhes */}
              <div className="mt-7 flex flex-col gap-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Próximos passos
                </p>
                {v.actions.map((a, i) => (
                  <FocusAction
                    key={a.label}
                    label={a.label}
                    detail={a.detail}
                    delayMs={400 + i * 120}
                    ring={v.ring}
                    accent={v.accent}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      },
    }));
  })(),

  // ──────────────────────────────────────────────────────────────────────────
  // 8-10. PROTOCOLO — 3 slides separados (revisar, montar, aplicar)
  {
    id: "protocol-1",
    theme: "light",
    duration: 5200,
    render: () => (
      <ProtocolSlide
        step={1}
        icon={ClipboardCheck}
        accent="text-rose-400"
        bg="from-rose-50 to-white"
        title="Revisar resultados"
        kicker="Passo 1 de 3"
        desc="Destacamos os biomarcadores que merecem atenção agora — e os que já estão ótimos."
        bullets={[
          "Painel com 50+ marcadores",
          "Status por faixa (ótimo, normal, fora)",
          "Tendência histórica de cada um",
        ]}
      />
    ),
  },
  {
    id: "protocol-2",
    theme: "light",
    duration: 5200,
    render: () => (
      <ProtocolSlide
        step={2}
        icon={Heart}
        accent="text-amber-500"
        bg="from-amber-50 to-white"
        title="Montar seu protocolo"
        kicker="Passo 2 de 3"
        desc="Transformamos os resultados em um plano claro e priorizado. Suplementos, hábitos e exames de acompanhamento."
        bullets={[
          "Suplementação personalizada",
          "Hábitos diários (5 min)",
          "Próximos exames agendados",
        ]}
      />
    ),
  },
  {
    id: "protocol-3",
    theme: "light",
    duration: 5200,
    render: () => (
      <ProtocolSlide
        step={3}
        icon={Activity}
        accent="text-sky-500"
        bg="from-sky-50 to-white"
        title="Aplicar no dia a dia"
        kicker="Passo 3 de 3"
        desc="Tasks diárias na home, suplementação direta e acompanhamento contínuo com o Dr. Lon."
        bullets={[
          "Checklist diário no celular",
          "Concierge 24/7 com Dr. Lon",
          "Wearable opcional (Oura, Apple Watch)",
        ]}
      />
    ),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 11. PRÓXIMAS COLETAS / EVOLUÇÃO
  {
    id: "next",
    theme: "tinted",
    duration: 5200,
    render: (patient) => (
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
    render: (patient) => (
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

function ProtocolSlide({
  step,
  icon: Icon,
  accent,
  bg,
  title,
  kicker,
  desc,
  bullets,
}: {
  step: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  bg: string;
  title: string;
  kicker: string;
  desc: string;
  bullets: string[];
}) {
  return (
    <div className={cn("flex h-full w-full bg-gradient-to-br", bg)}>
      <div className="m-auto flex w-full max-w-md flex-col px-6 py-16">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "text-[64px] font-semibold leading-none tabular-nums",
              accent,
            )}
          >
            {step}
          </div>
          <div>
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.18em]",
                accent,
              )}
            >
              {kicker}
            </p>
            <h2 className="text-[24px] font-semibold tracking-tight text-zinc-900 leading-[1.1] story-fade-up">
              {title}
            </h2>
          </div>
        </div>

        <p className="mt-5 text-[14px] leading-relaxed text-zinc-600 story-fade-up-2">
          {desc}
        </p>

        <ul className="mt-6 flex flex-col gap-2.5">
          {bullets.map((b, i) => (
            <li
              key={b}
              className="story-pop flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-zinc-200 shadow-sm will-change-transform"
              style={{ animationDelay: `${500 + i * 120}ms` }}
            >
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-50",
                  accent,
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-[13.5px] font-medium text-zinc-800">
                {b}
              </span>
            </li>
          ))}
        </ul>
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
  storageKey = "longevify-stories-shown-v3",
  forceShow = false,
  onClose,
}: PostExamStoriesProps) {
  const [open, setOpen] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  // Quando o user finaliza no último slide ("Começar"), entra em
  // modo finale: stories continuam visíveis ATRÁS de uma transição
  // cinematográfica que termina chamando close() depois de 1900ms.
  const [showingFinale, setShowingFinale] = useState(false);

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
        {Slide.render(patient)}
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
