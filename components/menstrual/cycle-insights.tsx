"use client";

import { useEffect, useState } from "react";
import { Activity, BookOpen, Lightbulb, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CyclePhase,
  MenstrualEntry,
  MenstrualProfile,
} from "@/lib/menstrual/types";
import type { CyclePhaseInfo } from "@/lib/menstrual/types";
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

const ICON_BY_KIND: Record<
  InsightCard["kind"],
  { Icon: typeof Activity; ring: string; bg: string; text: string }
> = {
  phase: {
    Icon: Activity,
    ring: "ring-rose-200",
    bg: "bg-rose-50",
    text: "text-rose-700",
  },
  pattern: {
    Icon: BookOpen,
    ring: "ring-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
  tip: {
    Icon: Lightbulb,
    ring: "ring-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
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
      <div className="mt-5 px-5">
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[12.5px] text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Analisando seu ciclo...
        </div>
      </div>
    );
  }

  if (!insights || insights.length === 0) return null;

  return (
    <section className="mt-5 px-5">
      <h3 className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        Análise personalizada
      </h3>
      <div className="flex flex-col gap-2">
        {insights.map((i, idx) => {
          const meta = ICON_BY_KIND[i.kind];
          const Icon = meta.Icon;
          return (
            <div
              key={idx}
              className={cn(
                "flex items-start gap-3 rounded-2xl bg-white p-3.5 ring-1",
                meta.ring,
              )}
            >
              <div
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                  meta.bg,
                  meta.text,
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold leading-snug text-zinc-900">
                  {i.title}
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-600">
                  {i.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
