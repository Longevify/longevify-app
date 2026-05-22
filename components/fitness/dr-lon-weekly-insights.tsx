"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, RefreshCw, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface Insight {
  kind: string;
  title: string;
  body: string;
  severity: "positive" | "neutral" | "warning";
}

const CACHE_KEY = "fitness_dr_lon_insights";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const SEVERITY_STYLES: Record<
  Insight["severity"],
  { ring: string; bg: string; titleColor: string; icon: string }
> = {
  positive: {
    ring: "ring-emerald-200",
    bg: "bg-emerald-50/60",
    titleColor: "text-emerald-800",
    icon: "🎉",
  },
  neutral: {
    ring: "ring-zinc-200",
    bg: "bg-white",
    titleColor: "text-zinc-800",
    icon: "💡",
  },
  warning: {
    ring: "ring-amber-200",
    bg: "bg-amber-50/60",
    titleColor: "text-amber-900",
    icon: "⚠️",
  },
};

/**
 * Phase 3F — Card de insights Dr. Lon semanal IA.
 *
 * Fetch lazy quando user clica "Gerar análise". Cache de 24h em
 * sessionStorage (mesma análise o dia inteiro pra evitar custo
 * desnecessário do Claude).
 */
export function DrLonWeeklyInsights() {
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Restore cache on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (!cached) return;
      const { insights: ins, generatedAt: ts } = JSON.parse(cached) as {
        insights: Insight[];
        generatedAt: string;
      };
      const age = Date.now() - new Date(ts).getTime();
      if (age < CACHE_TTL_MS) {
        setInsights(ins);
        setGeneratedAt(ts);
        setExpanded(true);
      } else {
        sessionStorage.removeItem(CACHE_KEY);
      }
    } catch {
      /* noop */
    }
  }, []);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fitness/insights/weekly", {
        method: "POST",
      });
      const data = (await res.json()) as
        | { ok: true; insights: Insight[]; generatedAt: string }
        | { ok: false; error: string };
      if (!data.ok) {
        setError(data.error);
        return;
      }
      setInsights(data.insights);
      setGeneratedAt(data.generatedAt);
      setExpanded(true);
      try {
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            insights: data.insights,
            generatedAt: data.generatedAt,
          }),
        );
      } catch {
        /* noop */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white">
      <button
        type="button"
        onClick={() => {
          if (!insights && !loading) {
            generate();
          } else {
            setExpanded((e) => !e);
          }
        }}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 text-white shadow-sm">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-800">
            Dr. Lon · Análise semanal
          </div>
          <div className="mt-0.5 text-[13.5px] font-semibold leading-tight text-zinc-900">
            {loading
              ? "Analisando seus dados…"
              : insights
                ? `${insights.length} insight${insights.length === 1 ? "" : "s"} pra você`
                : "Toque pra gerar análise da semana"}
          </div>
          {generatedAt && !loading && (
            <p className="mt-0.5 text-[10px] text-zinc-500 tabular-nums">
              Gerado{" "}
              {new Date(generatedAt).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        {insights && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              try {
                sessionStorage.removeItem(CACHE_KEY);
              } catch {
                /* noop */
              }
              generate();
            }}
            disabled={loading}
            aria-label="Regenerar análise"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 disabled:opacity-30"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        )}
      </button>

      {error && (
        <div className="mx-5 mb-3 rounded-lg bg-rose-50 px-3 py-2 text-[11.5px] text-rose-800">
          Erro ao gerar análise: {error}
        </div>
      )}

      {expanded && insights && insights.length > 0 && (
        <ul className="flex flex-col gap-2 px-4 pb-4">
          {insights.map((ins, i) => {
            const styles = SEVERITY_STYLES[ins.severity];
            return (
              <li
                key={i}
                className={cn(
                  "rounded-xl px-3 py-2.5 ring-1",
                  styles.bg,
                  styles.ring,
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="text-[16px]" aria-hidden>
                    {styles.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4
                      className={cn(
                        "text-[12.5px] font-semibold leading-tight",
                        styles.titleColor,
                      )}
                    >
                      {ins.title}
                    </h4>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-700">
                      {ins.body}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {expanded && insights && insights.length === 0 && (
        <div className="mx-5 mb-3 inline-flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-[11.5px] text-zinc-600">
          <MessageSquare className="h-3 w-3 text-zinc-400" />
          Sem dados suficientes pra gerar insights ainda. Treine mais alguns dias!
        </div>
      )}
    </section>
  );
}
