"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Heart,
  ClipboardCheck,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Patient,
  OrganBioAge,
  OrganScore,
} from "@/lib/mock-data";

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

interface SlideContent {
  id: string;
  render: (patient: Patient) => React.ReactNode;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function CircularGauge({
  value,
  max,
  label,
  sublabel,
  color = "#3f9a6b",
}: {
  value: number;
  max: number;
  label: string;
  sublabel?: string;
  color?: string;
}) {
  const radius = 110;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / max) * circumference;

  return (
    <div className="relative grid place-items-center">
      <svg
        width="260"
        height="260"
        viewBox="0 0 260 260"
        className="rotate-[-90deg]"
      >
        {/* Track (dotted) */}
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
        {/* Progress arc */}
        <circle
          cx="130"
          cy="130"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 12px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[58px] font-semibold leading-none text-white tracking-tight">
            {value}
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

// ─── Slides ──────────────────────────────────────────────────────────────────

const SLIDES: SlideContent[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // SLIDE 1 — Welcome
  {
    id: "welcome",
    render: (patient) => (
      <div className="relative flex h-full w-full flex-col items-center justify-end pb-32 px-8 text-center text-white">
        {/* Background radial sun (verde Longevify) */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            className="h-[600px] w-[600px] rounded-full opacity-70 blur-[40px]"
            style={{
              background:
                "radial-gradient(circle, #3f9a6b 0%, #1f5d3f 40%, transparent 75%)",
            }}
          />
        </div>
        {/* Silhueta avatar — usa GLB do manequim novo via render 2D
            (frame estático). Path antigo /avatars/360/male/000.webp era
            o manequim AI-generated (descontinuado). Agora usa um snapshot
            do mannequin Three.js renderizado em /public/avatars/mannequin/
            preview-male.webp. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-32 top-12 grid place-items-center">
          <div className="relative h-[60%] w-auto">
            <Image
              src="/avatars/mannequin/preview-male.webp"
              alt=""
              fill
              priority
              className="object-contain opacity-90"
              sizes="400px"
            />
          </div>
        </div>
        <div className="relative">
          <h2 className="text-[28px] font-semibold tracking-tight">
            Bem-vindo, {patient.firstName}
          </h2>
          <p className="mt-2 max-w-md text-[14px] leading-relaxed text-white/80">
            A Longevify analisou seus resultados de exame e identificou os
            pontos principais. Vamos construir um protocolo preciso, feito sob
            medida pra você.
          </p>
        </div>
      </div>
    ),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SLIDE 2 — Bio Age gauge
  {
    id: "bioage",
    render: (patient) => {
      const delta = patient.chronologicalAge - patient.biologicalAge;
      const younger = delta > 0;
      return (
        <div className="flex h-full w-full flex-col items-center justify-center px-8 text-center text-white">
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div
              className="h-[700px] w-[700px] rounded-full opacity-60 blur-[60px]"
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
          <div className="relative mt-10 max-w-md">
            <h2 className="text-[22px] font-semibold tracking-tight">
              Sua idade biológica é {patient.biologicalAge}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-white/75">
              {younger
                ? `Você está ${Math.abs(delta).toFixed(1)} anos mais jovem que sua idade cronológica! Isso significa que seus biomarcadores indicam um corpo metabolicamente mais novo.`
                : `Seus biomarcadores estão envelhecendo um pouco mais rápido que sua idade cronológica. Vamos reverter isso.`}
            </p>
          </div>
        </div>
      );
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SLIDE 3 — Longevify Score gauge
  {
    id: "score",
    render: (patient) => (
      <div className="flex h-full w-full flex-col items-center justify-center px-8 text-center text-white">
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            className="h-[700px] w-[700px] rounded-full opacity-60 blur-[60px]"
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
        <div className="relative mt-10 max-w-md">
          <h2 className="text-[22px] font-semibold tracking-tight">
            Seu Longevify Score é {patient.longevifyScore}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-white/75">
            {patient.firstName}, você está geralmente saudável. Há algumas
            áreas com espaço pra otimização — e a Longevify vai te guiar.
          </p>
        </div>
      </div>
    ),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SLIDE 4 — Protocolo em 3 passos
  {
    id: "protocol-3-steps",
    render: () => (
      <div className="flex h-full w-full flex-col justify-center bg-white px-8 py-20 text-zinc-900">
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-center text-[24px] font-semibold tracking-tight text-zinc-900">
            Seu protocolo em 3 passos
          </h2>
          <p className="mt-1 text-center text-[13px] text-zinc-500">
            Biomarcadores-chave, plano priorizado e jeito simples de seguir.
          </p>

          <div className="mt-8 flex flex-col gap-4">
            {[
              {
                n: 1,
                color: "text-rose-400",
                icon: ClipboardCheck,
                title: "Revisar resultados",
                desc: "Destacamos os biomarcadores que merecem atenção agora.",
              },
              {
                n: 2,
                color: "text-amber-500",
                icon: Heart,
                title: "Montar seu protocolo",
                desc: "Transformamos os resultados em um plano claro e priorizado.",
              },
              {
                n: 3,
                color: "text-sky-500",
                icon: Activity,
                title: "Aplicar no dia a dia",
                desc: "Tasks diárias, suplementação direta e acompanhamento contínuo.",
              },
            ].map(({ n, color, icon: Icon, title, desc }) => (
              <div
                key={n}
                className="flex items-start gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm"
              >
                <div
                  className={cn(
                    "text-[42px] font-semibold leading-none tabular-nums",
                    color,
                  )}
                >
                  {n}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-zinc-400" />
                    <h3 className="text-[15px] font-semibold text-zinc-900">
                      {title}
                    </h3>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-500">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SLIDE 5 — Health winners (órgãos saudáveis)
  {
    id: "winners",
    render: (patient) => {
      const winners = (patient.organScores ?? [])
        .filter((o: OrganScore) => o.status === "optimal")
        .slice(0, 5);
      const total = patient.organScores?.length ?? 7;
      return (
        <div className="flex h-full w-full flex-col justify-center bg-white px-6 py-20 text-zinc-900">
          <div className="mx-auto w-full max-w-md">
            <h2 className="text-center text-[24px] font-semibold tracking-tight">
              Seus pontos fortes
            </h2>
            <p className="mt-1 text-center text-[13px] text-zinc-500">
              {winners.length} de {total} sistemas orgânicos estão indo
              excepcionalmente bem!
            </p>

            <div className="mt-8 rounded-3xl border border-zinc-200 bg-gradient-to-b from-white to-emerald-50/30 p-6">
              <div className="text-[11px] font-medium text-zinc-500">
                {patient.firstName} {patient.lastName}
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                Longevify
              </div>

              {/* Mini silhueta — manequim atualizado */}
              <div className="relative mx-auto mt-4 h-[200px] w-[140px]">
                <Image
                  src={`/avatars/mannequin/preview-${patient.sex}.webp`}
                  alt=""
                  fill
                  className="object-contain"
                  sizes="140px"
                />
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {winners.map((w) => (
                  <span
                    key={w.organ}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11.5px] font-medium text-zinc-700 shadow-sm ring-1 ring-emerald-200"
                  >
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-50 text-[9px] font-bold text-emerald-700">
                      A
                    </span>
                    {w.organ}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SLIDE 6 — Top focos
  {
    id: "top-goals",
    render: (patient) => {
      // Pega os 3 órgãos com pior status pra ser os focos
      const focuses = (patient.organScores ?? [])
        .slice()
        .sort((a: OrganScore, b: OrganScore) => a.score - b.score)
        .slice(0, 3);

      const goalTexts = [
        {
          color: "from-rose-50 to-white text-rose-400",
          numColor: "text-rose-400",
          title: "Otimize seu órgão prioritário",
          desc: (organ: string) =>
            `${organ} é o sistema com mais espaço pra ganho — vamos construir uma base aqui.`,
        },
        {
          color: "from-amber-50 to-white text-amber-500",
          numColor: "text-amber-500",
          title: "Refine marcadores secundários",
          desc: (organ: string) =>
            `${organ} tem oportunidade de otimização com intervenções específicas.`,
        },
        {
          color: "from-sky-50 to-white text-sky-500",
          numColor: "text-sky-500",
          title: "Mantenha o que está bom",
          desc: (organ: string) =>
            `${organ} está saudável — vamos preservar com hábitos consistentes.`,
        },
      ];

      return (
        <div className="flex h-full w-full flex-col justify-center bg-white px-6 py-20 text-zinc-900">
          <div className="mx-auto w-full max-w-md">
            <h2 className="text-center text-[24px] font-semibold tracking-tight">
              Seus 3 focos de saúde
            </h2>
            <p className="mt-1 text-center text-[13px] text-zinc-500">
              Com base nos seus dados encontramos 3 focos principais.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              {focuses.map((focus, idx) => {
                const t = goalTexts[idx];
                return (
                  <div
                    key={focus.organ}
                    className={cn(
                      "flex items-start gap-4 rounded-2xl bg-gradient-to-br p-5 ring-1 ring-zinc-200/60",
                      t.color,
                    )}
                  >
                    <div
                      className={cn(
                        "text-[40px] font-semibold leading-none tabular-nums",
                        t.numColor,
                      )}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[15px] font-semibold text-zinc-900 leading-snug">
                        {t.title}
                      </h3>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-600">
                        {t.desc(focus.organ)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    },
  },
];

// ─── Componente principal ───────────────────────────────────────────────────

/**
 * Apresentação Stories Instagram-style — exibe 6 slides quando o paciente
 * entra pela primeira vez após resultado do exame chegar. Inspirado no
 * fluxo do Superpower app (pasta /Desktop/apresentação/).
 *
 * Controles:
 *   - Tap direita avança / tap esquerda volta (estilo IG)
 *   - Auto-advance opcional (5s por slide quando ativo)
 *   - Botão X fecha (marca como visto no localStorage)
 *   - ESC fecha
 *
 * Disparo: componente é renderizado em todas as páginas de /home, mas só
 * aparece se localStorage[storageKey] não estiver setado.
 */
export function PostExamStories({
  patient,
  storageKey = "longevify-stories-shown-v1",
  forceShow = false,
  onClose,
}: PostExamStoriesProps) {
  const [open, setOpen] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<number | null>(null);

  // Abre por forceShow OU por flag localStorage não setada
  useEffect(() => {
    if (forceShow) {
      setOpen(true);
      setSlideIdx(0);
      setProgress(0);
      return;
    }
    try {
      const shown = localStorage.getItem(storageKey);
      if (!shown) {
        setOpen(true);
      }
    } catch {
      // ignore
    }
  }, [storageKey, forceShow]);

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(storageKey, new Date().toISOString());
    } catch {
      // ignore
    }
    onClose?.();
  }, [storageKey, onClose]);

  const advance = useCallback(() => {
    setSlideIdx((prev) => {
      if (prev >= SLIDES.length - 1) {
        // Último slide → fecha
        close();
        return prev;
      }
      return prev + 1;
    });
    setProgress(0);
  }, [close]);

  const back = useCallback(() => {
    setSlideIdx((prev) => Math.max(0, prev - 1));
    setProgress(0);
  }, []);

  // Auto-advance — 6.5s por slide
  useEffect(() => {
    if (!open) return;
    const DURATION = 6500;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / DURATION) * 100);
      setProgress(pct);
      if (pct >= 100) {
        advance();
        return;
      }
      progressRef.current = requestAnimationFrame(tick);
    };
    progressRef.current = requestAnimationFrame(tick);
    return () => {
      if (progressRef.current) cancelAnimationFrame(progressRef.current);
    };
  }, [open, slideIdx, advance]);

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
  const isLightSlide =
    Slide.id === "protocol-3-steps" ||
    Slide.id === "winners" ||
    Slide.id === "top-goals";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex flex-col",
        isLightSlide ? "bg-white" : "bg-gradient-to-br from-[#0d2818] via-[#143D28] to-[#0F3020]",
      )}
    >
      {/* Header: progress bars + close.
          pt-[max(env(safe-area-inset-top),16px)] respeita Dynamic Island
          do iPhone (Lucas 2026-05: progress bar estava na altura da ilha). */}
      <header
        className="relative z-10 flex items-center gap-2 px-4 pb-2"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 1rem)",
        }}
      >
        <div className="flex flex-1 items-center gap-1.5">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 overflow-hidden rounded-full",
                isLightSlide ? "bg-zinc-200" : "bg-white/15",
              )}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width]",
                  isLightSlide ? "bg-zinc-900" : "bg-white",
                )}
                style={{
                  width: `${i < slideIdx ? 100 : i === slideIdx ? progress : 0}%`,
                  transitionDuration: i === slideIdx ? "120ms" : "0ms",
                }}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Fechar apresentação"
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full transition",
            isLightSlide
              ? "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              : "bg-white/10 text-white/80 hover:bg-white/20",
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Logo Longevify topo (quando não-light) — abaixo do safe area */}
      {!isLightSlide && (
        <div
          className="absolute left-1/2 z-10 -translate-x-1/2 text-[14px] font-semibold tracking-wide text-white/90"
          style={{
            top: "calc(max(env(safe-area-inset-top), 1rem) + 1.75rem)",
          }}
        >
          longevify
        </div>
      )}

      {/* Slide content — key={slideIdx} força remount + animation
          (fade-in + slight slide up) toda vez que muda slide. */}
      <div
        key={slideIdx}
        className="stories-slide relative flex flex-1 items-center justify-center"
      >
        {Slide.render(patient)}
      </div>

      <style jsx>{`
        :global(.stories-slide) {
          animation: storyFadeIn 380ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes storyFadeIn {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      {/* Tap zones (left = back, right = forward) */}
      <button
        type="button"
        aria-label="Anterior"
        onClick={back}
        className="absolute inset-y-0 left-0 z-20 w-1/3"
      />
      <button
        type="button"
        aria-label="Próximo"
        onClick={advance}
        className="absolute inset-y-0 right-0 z-20 w-2/3"
      />

      {/* Footer CTA — só no último slide */}
      <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center px-6">
        <button
          type="button"
          onClick={slideIdx === SLIDES.length - 1 ? close : advance}
          className={cn(
            "inline-flex w-full max-w-md items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[14px] font-semibold transition",
            isLightSlide
              ? "bg-zinc-900 text-white hover:bg-zinc-800"
              : "bg-white/10 text-white backdrop-blur-md hover:bg-white/20 ring-1 ring-white/20",
          )}
        >
          {slideIdx === SLIDES.length - 1 ? "Começar" : "Continuar"}
          {slideIdx < SLIDES.length - 1 && <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Back button (small, top-left) — só não no primeiro slide.
          Posicionado abaixo do safe-area-inset-top + header */}
      {slideIdx > 0 && (
        <button
          type="button"
          onClick={back}
          aria-label="Voltar"
          className={cn(
            "absolute left-4 z-30 grid h-9 w-9 place-items-center rounded-full transition",
            isLightSlide
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
    </div>
  );
}
