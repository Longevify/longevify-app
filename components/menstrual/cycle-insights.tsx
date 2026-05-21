"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BookOpen,
  ChevronDown,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CyclePhase,
  MenstrualEntry,
  MenstrualProfile,
} from "@/lib/menstrual/types";
import type { CyclePhaseInfo } from "@/lib/menstrual/types";
import { PHASE_COLOR } from "@/lib/menstrual/types";
import { useCurrentUser } from "@/lib/auth/user-context";

/**
 * Cards de análise AI personalizada pra guiar a usuária — Lucas
 * (2026-05-19): "faça análises com AI para guiar a mulher que está
 * usando a aba".
 *
 * Faz fetch /api/menstrual/insights na montagem com profile + entries
 * recentes. Cacheia em sessionStorage por chave estável (fase + dia +
 * count de entries) pra não bater no GPT toda vez que troca de aba.
 *
 * Fallback estático cobre o caso de OpenAI off (volta cards genéricos
 * adequados à fase, escritos com cuidado).
 */

interface InsightCard {
  kind: "phase" | "pattern" | "tip";
  title: string;
  body: string;
}

/**
 * Lucas (2026-05-21): "os outros cards abaixo ficam com outra cor
 * diferente de qualquer uma das possibilidades [das fases]."
 *
 * Phase colors (PHASE_COLOR) cobrem: rose/menstrual, orange/folicular,
 * yellow/ovulação, purple/lútea. Pattern e Tip ganham cores fora
 * desse range — blue (pattern) e emerald (tip).
 *
 * Card "phase" usa cores DINÂMICAS via PHASE_COLOR[currentPhase] —
 * tratado inline no componente. Aqui só define pattern/tip.
 */
const ICON_BY_KIND: Record<
  Exclude<InsightCard["kind"], "phase">,
  {
    Icon: typeof Activity;
    label: string;
    accent: string;
    iconBg: string;
    iconText: string;
  }
> = {
  pattern: {
    Icon: BookOpen,
    label: "Padrão observado",
    accent: "bg-sky-400",
    iconBg: "bg-sky-100",
    iconText: "text-sky-700",
  },
  tip: {
    Icon: Lightbulb,
    label: "Recomendação",
    accent: "bg-emerald-400",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-700",
  },
};

interface Props {
  profile: MenstrualProfile;
  entries: MenstrualEntry[];
  phaseInfo: CyclePhaseInfo;
}

function cacheKey(props: Props): string {
  return [
    "menstrual-insights",
    props.phaseInfo.phase,
    props.phaseInfo.cycleDay,
    props.entries.length,
    props.entries.slice(0, 3).map((e) => e.entryDate).join(","),
  ].join("|");
}

function readCache(key: string): InsightCard[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as InsightCard[]) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: InsightCard[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* silent */
  }
}

export function CycleInsights({ profile, entries, phaseInfo }: Props) {
  const user = useCurrentUser();
  const [insights, setInsights] = useState<InsightCard[] | null>(() =>
    readCache(cacheKey({ profile, entries, phaseInfo })),
  );
  const [loading, setLoading] = useState(insights === null);

  useEffect(() => {
    const key = cacheKey({ profile, entries, phaseInfo });
    const cached = readCache(key);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInsights(cached);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();

    fetch("/api/menstrual/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        firstName: user.firstName,
        phase: phaseInfo.phase,
        cycleDay: phaseInfo.cycleDay,
        cycleLength: phaseInfo.cycleLength,
        daysUntilNextPeriod: phaseInfo.daysUntilNextPeriod,
        cycleRegularity: profile.cycleRegularity,
        reproductiveStatus: profile.reproductiveStatus,
        contraceptiveKind: profile.contraceptiveKind,
        recentEntries: entries.slice(0, 14).map((e) => ({
          date: e.entryDate,
          flow: e.flow,
          symptoms: e.symptoms,
          mood: e.mood,
          energy: e.energy,
          libido: e.libido,
          sleepQuality: e.sleepQuality,
        })),
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.insights)) {
          setInsights(data.insights as InsightCard[]);
          writeCache(key, data.insights as InsightCard[]);
        }
      })
      .catch(() => {
        /* fallback handled by API */
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [profile, entries, phaseInfo, user.firstName]);

  if (loading && !insights) {
    return (
      <section className="mt-8 px-5">
        <SectionHeader />
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-[13px] text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparando sua análise...
        </div>
      </section>
    );
  }

  if (!insights || insights.length === 0) return null;

  return (
    <section className="mt-8 px-5">
      <SectionHeader />
      <div className="mt-3 flex flex-col gap-3">
        {insights.map((i, idx) => {
          if (i.kind === "phase") {
            return (
              <PhaseInsightCard
                key={idx}
                title={i.title}
                body={i.body}
                phase={phaseInfo.phase}
              />
            );
          }
          const meta = ICON_BY_KIND[i.kind];
          const Icon = meta.Icon;
          return (
            <article
              key={idx}
              className={cn(
                "relative overflow-hidden rounded-2xl bg-white pl-4 pr-4 py-4 sm:py-5",
                "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/70",
              )}
            >
              <span
                className={cn(
                  "absolute inset-y-0 left-0 w-1",
                  meta.accent,
                )}
                aria-hidden
              />
              <header className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                    meta.iconBg,
                    meta.iconText,
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <span
                  className={cn(
                    "text-[10.5px] font-semibold uppercase tracking-[0.14em]",
                    meta.iconText,
                  )}
                >
                  {meta.label}
                </span>
              </header>
              <h4 className="mt-2.5 text-[15px] font-semibold leading-snug tracking-tight text-zinc-900">
                {i.title}
              </h4>
              <p className="mt-1.5 text-[13.5px] leading-[1.55] text-zinc-600">
                {i.body}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ─── PhaseInsightCard ──────────────────────────────────────────────────
//
// Lucas (2026-05-21): "a cor do card que aparece abaixo do calendário
// 'Fase Atual' varie de acordo com a cor que representa a fase".
// Também: "no card de fase atual, não exiba o texto de primeira, só
// se clicar no card, o card só vai ter o título, quando clica que
// aparece o texto."
//
// → Card colapsado por default (só título), expansível, cor por
// PHASE_COLOR[currentPhase].

function PhaseInsightCard({
  title,
  body,
  phase,
}: {
  title: string;
  body: string;
  phase: CyclePhase;
}) {
  const [open, setOpen] = useState(false);
  const color = PHASE_COLOR[phase];

  return (
    <article
      className="relative overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/70"
    >
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: color.ring }}
        aria-hidden
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 pl-4 pr-4 py-4 text-left transition hover:bg-zinc-50/40"
        aria-expanded={open}
      >
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
          style={{
            backgroundColor: color.bg,
            color: color.text,
          }}
        >
          <Activity className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <span
            className="block text-[10.5px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: color.text }}
          >
            Fase atual
          </span>
          <h4 className="mt-0.5 text-[15px] font-semibold leading-snug tracking-tight text-zinc-900">
            {title}
          </h4>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-zinc-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <p className="px-4 pb-4 text-[13.5px] leading-[1.55] text-zinc-600">
          {body}
        </p>
      )}
    </article>
  );
}

function SectionHeader() {
  return (
    <div className="flex items-baseline justify-between">
      <h3 className="text-[15px] font-semibold tracking-tight text-zinc-900">
        Análise personalizada
      </h3>
      <span className="text-[10.5px] font-medium uppercase tracking-wider text-zinc-400">
        Pra você
      </span>
    </div>
  );
}
