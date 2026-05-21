"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  scoreLabel,
  scoreColor,
  scoreBg,
  type MetricKind,
} from "@/lib/wearables/metric-score";

/**
 * Lucas (2026-05-21): "Quando clicar em algum card da aba home, tem
 * que abrir a aba mostrando a evolução, histórico (que pode mudar
 * l7d, l30d, l6m) e o overall score, tipo 'seu sono está com uma
 * pontuação de 82'."
 *
 * Popup full-detail pra cada métrica wearable. Recebe array de pontos
 * (data, value, score) e renderiza:
 * - Big number do score atual + label ("Bom") + média do período
 * - Toggle 7d / 30d / 6m
 * - Sparkline grande (recharts AreaChart) do período selecionado
 * - Insight curto baseado no trend
 *
 * Reutilizado por DailyProgressGrid pra cada card clicável (sono, exerc).
 */

export interface MetricPoint {
  date: string; // ISO YYYY-MM-DD
  value: number; // valor da métrica (min de sono, min de exerc, etc)
  score: number; // 0-100
}

interface WearableMetricPopupProps {
  open: boolean;
  onClose: () => void;
  metricKind: MetricKind;
  title: string;
  unit: string;
  /** Pontos ordenados ASC (mais antigo → hoje). Idealmente 180+ pontos
   *  pra range "6 meses". Se houver menos, a UI mostra o que tem. */
  history: MetricPoint[];
  /** Cor do brand pra essa métrica (sleep=indigo, exerc=emerald, etc) */
  accentColor: string;
}

type Range = "7d" | "30d" | "6m";

const RANGE_DAYS: Record<Range, number> = {
  "7d": 7,
  "30d": 30,
  "6m": 180,
};

const RANGE_LABEL: Record<Range, string> = {
  "7d": "7 dias",
  "30d": "30 dias",
  "6m": "6 meses",
};

function formatDateShort(iso: string, range: Range): string {
  const d = new Date(iso + "T00:00:00.000Z");
  if (range === "7d" || range === "30d") {
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  }
  return d.toLocaleDateString("pt-BR", { month: "short" });
}

function fmtValue(value: number, kind: MetricKind, unit: string): string {
  if (kind === "sleep") {
    const h = Math.floor(value / 60);
    const m = Math.round(value % 60);
    return `${h}h${m.toString().padStart(2, "0")}`;
  }
  return `${Math.round(value)} ${unit}`;
}

export function WearableMetricPopup({
  open,
  onClose,
  metricKind,
  title,
  unit,
  history,
  accentColor,
}: WearableMetricPopupProps) {
  const [range, setRange] = useState<Range>("7d");

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  const slice = useMemo(() => {
    const days = RANGE_DAYS[range];
    return history.slice(-days);
  }, [history, range]);

  const chartData = useMemo(
    () =>
      slice.map((p) => ({
        label: formatDateShort(p.date, range),
        value: p.value,
        score: p.score,
      })),
    [slice, range],
  );

  const currentScore = history[history.length - 1]?.score ?? 0;
  const avgScore =
    slice.length > 0
      ? Math.round(slice.reduce((s, p) => s + p.score, 0) / slice.length)
      : 0;

  // Trend = média dos últimos 25% vs primeiros 25% do range
  const trend = useMemo(() => {
    if (slice.length < 4) return 0;
    const q = Math.floor(slice.length / 4);
    const first = slice.slice(0, q);
    const last = slice.slice(-q);
    const avgFirst = first.reduce((s, p) => s + p.score, 0) / first.length;
    const avgLast = last.reduce((s, p) => s + p.score, 0) / last.length;
    return Math.round(avgLast - avgFirst);
  }, [slice]);

  if (!open) return null;

  const lastValue = history[history.length - 1]?.value ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      aria-modal="true"
      role="dialog"
      aria-label={`${title} — Detalhes`}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-[560px] sm:rounded-[20px] rounded-t-[20px]">
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-[16px] font-semibold text-zinc-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Score big number */}
          <div className="px-5 pt-6 pb-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Score de hoje
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={cn(
                  "text-[56px] font-semibold leading-none tracking-tight tabular-nums",
                  scoreColor(currentScore),
                )}
              >
                {currentScore}
              </span>
              <span className="text-[16px] font-medium text-zinc-400">
                / 100
              </span>
              <span
                className={cn(
                  "ml-2 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold",
                  scoreBg(currentScore),
                )}
              >
                {scoreLabel(currentScore)}
              </span>
            </div>
            <p className="mt-2 text-[13px] text-zinc-600">
              Hoje você {metricKind === "sleep" ? "dormiu" : "registrou"}{" "}
              <span className="font-semibold text-zinc-900">
                {fmtValue(lastValue, metricKind, unit)}
              </span>
              .
            </p>
          </div>

          {/* Range toggle */}
          <div className="flex shrink-0 gap-1 px-5">
            {(["7d", "30d", "6m"] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "flex-1 rounded-xl py-2 text-[12px] font-semibold transition",
                  range === r
                    ? "bg-brand-700 text-white shadow-sm"
                    : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100",
                )}
              >
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="px-5 pt-5 pb-4">
            <div className="mb-2 flex items-baseline justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Evolução — score 0-100
              </div>
              <div className="text-[11px] text-zinc-500">
                Média:{" "}
                <span className={cn("font-semibold", scoreColor(avgScore))}>
                  {avgScore}
                </span>
              </div>
            </div>
            {chartData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="wearable-metric-grad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={accentColor} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={accentColor} stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#a1a1aa" }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={16}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 50, 100]}
                    tick={{ fontSize: 10, fill: "#a1a1aa" }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-[11.5px] shadow-lg">
                          <div className="text-zinc-400">{label}</div>
                          <div
                            className={cn(
                              "font-semibold",
                              scoreColor(d?.score ?? 0),
                            )}
                          >
                            Score {d?.score ?? 0}
                          </div>
                          <div className="text-[10.5px] text-zinc-500">
                            {fmtValue(d?.value ?? 0, metricKind, unit)}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke={accentColor}
                    strokeWidth={2.5}
                    fill="url(#wearable-metric-grad)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: accentColor,
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="rounded-xl bg-zinc-50 px-4 py-6 text-center text-[12px] text-zinc-500">
                Histórico insuficiente — sincronize seu wearable pra ver evolução.
              </div>
            )}
          </div>

          {/* Trend insight */}
          {slice.length >= 4 && (
            <div className="mx-5 mb-5 rounded-2xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 text-[12.5px] leading-relaxed text-zinc-700">
              {trend > 5 ? (
                <span className="inline-flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  Tendência <strong className="text-emerald-700">+{trend}</strong> pts vs início do período. Continua assim 🚀
                </span>
              ) : trend < -5 ? (
                <span className="inline-flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                  Tendência <strong className="text-rose-700">{trend}</strong> pts vs início. Vale revisar rotina.
                </span>
              ) : (
                <span>Estável nos últimos {RANGE_LABEL[range]} (variação ±5 pts).</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
