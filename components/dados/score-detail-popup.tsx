"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import type { ScorePoint } from "@/lib/mock-data";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoreDetailPopupProps {
  open: boolean;
  onClose: () => void;
  score: number;
  status: "on-track" | "attention" | "at-risk";
  scoreHistory: ScorePoint[];
}

type Tab = "trend" | "scorecard";

// ─── Ranges ───────────────────────────────────────────────────────────────────

interface ScoreRange {
  label: string;
  min: number;
  max: number;
  status: "optimal" | "normal" | "out";
  description: string;
}

const SCORE_RANGES: ScoreRange[] = [
  {
    label: "Excelente",
    min: 85,
    max: 100,
    status: "optimal",
    description: "Biomarcadores em faixa ótima — longevidade maximizada.",
  },
  {
    label: "Bom",
    min: 70,
    max: 84,
    status: "optimal",
    description: "Maioria dos marcadores saudáveis, pequenos ajustes possíveis.",
  },
  {
    label: "Normal",
    min: 50,
    max: 69,
    status: "normal",
    description: "Dentro da média, mas há espaço significativo para melhoria.",
  },
  {
    label: "Atenção",
    min: 30,
    max: 49,
    status: "out",
    description: "Vários marcadores fora do ideal — ação prioritária recomendada.",
  },
  {
    label: "Crítico",
    min: 0,
    max: 29,
    status: "out",
    description: "Intervenção médica urgente recomendada.",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rangeStatus(status: ScoreRange["status"]): string {
  if (status === "optimal")
    return "bg-brand-50 border border-brand-200 text-brand-700";
  if (status === "normal")
    return "bg-zinc-100 border border-zinc-200 text-zinc-600";
  return "bg-amber-50 border border-amber-200 text-amber-700";
}

function rangeBar(status: ScoreRange["status"]): string {
  if (status === "optimal") return "bg-brand-400";
  if (status === "normal") return "bg-zinc-300";
  return "bg-amber-400";
}

function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function statusLabel(status: ScoreDetailPopupProps["status"]): string {
  if (status === "on-track") return "On Track";
  if (status === "attention") return "Atenção";
  return "Em Risco";
}

function statusPillClass(status: ScoreDetailPopupProps["status"]): string {
  if (status === "on-track")
    return "bg-brand-100 text-brand-700";
  if (status === "attention")
    return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface ChartTooltipPayload {
  value?: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-[12px] shadow-lg">
      <div className="text-zinc-400">{label}</div>
      <div className="font-semibold text-brand-700">
        {payload[0]?.value} pts
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ScoreDetailPopup({
  open,
  onClose,
  score,
  status,
  scoreHistory,
}: ScoreDetailPopupProps) {
  const [tab, setTab] = useState<Tab>("trend");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  const chartData = scoreHistory.map((p) => ({
    label: formatMonthYear(p.date),
    score: p.score,
  }));

  const activeRange = SCORE_RANGES.find((r) => score >= r.min && score <= r.max);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      aria-modal="true"
      role="dialog"
      aria-label="Longevify Score — Detalhes"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden bg-white",
          "sm:max-w-[560px] sm:rounded-[18px]",
          "rounded-t-[18px]",
          "shadow-2xl",
        )}
      >
        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between px-5 pt-5 pb-4">
          <h2 className="text-[17px] font-semibold text-zinc-900">
            Longevify Score
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex shrink-0 gap-2 px-5 pb-4">
          <button
            type="button"
            onClick={() => setTab("trend")}
            className={cn(
              "rounded-full px-4 py-1.5 text-[13px] font-semibold transition",
              tab === "trend"
                ? "bg-brand-100 text-brand-700"
                : "text-zinc-500 hover:bg-zinc-100",
            )}
          >
            Trend View
          </button>
          <button
            type="button"
            onClick={() => setTab("scorecard")}
            className={cn(
              "rounded-full px-4 py-1.5 text-[13px] font-semibold transition",
              tab === "scorecard"
                ? "bg-brand-100 text-brand-700"
                : "text-zinc-500 hover:bg-zinc-100",
            )}
          >
            Score Card
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === "trend" ? (
            <div className="flex flex-col gap-5 px-5 pb-6">
              {/* Re-test box */}
              <div className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                <div>
                  <div className="text-[12px] font-semibold text-zinc-700">
                    Agende seu re-teste anual
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-400">
                    Acompanhe a evolução da sua pontuação
                  </div>
                </div>
                <button
                  type="button"
                  className="ml-4 shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-700"
                >
                  Agendar
                </button>
              </div>

              {/* Area chart */}
              <div className="relative">
                <div className="absolute right-2 top-2 text-[11px] font-semibold text-brand-600 z-10">
                  Optimal
                </div>

                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 24, right: 8, bottom: 0, left: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="score-gradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#3f9a6b"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="#3f9a6b"
                          stopOpacity={0.04}
                        />
                      </linearGradient>
                    </defs>

                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#a1a1aa" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[40, 100]}
                      tick={{ fontSize: 11, fill: "#a1a1aa" }}
                      axisLine={false}
                      tickLine={false}
                      width={32}
                    />
                    <Tooltip content={<ChartTooltip />} />

                    {/* Target reference line */}
                    <ReferenceLine
                      y={85}
                      stroke="#d4d4d8"
                      strokeDasharray="4 3"
                      label={{
                        value: "Meta 85",
                        position: "insideTopRight",
                        fill: "#a1a1aa",
                        fontSize: 10,
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#3f9a6b"
                      strokeWidth={2.5}
                      fill="url(#score-gradient)"
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: "#3f9a6b",
                        stroke: "#fff",
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* KPI summary row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-brand-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">
                    Seu Score
                  </div>
                  <div className="mt-1 text-[28px] font-semibold leading-none text-zinc-900">
                    {score}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-400">/ 100</div>
                </div>
                <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Status
                  </div>
                  <div className="mt-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-[13px] font-semibold",
                        statusPillClass(status),
                      )}
                    >
                      {statusLabel(status)}
                    </span>
                  </div>
                  {activeRange && (
                    <div className="mt-1.5 text-[11px] text-zinc-400">
                      {activeRange.label}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // ── Score Card tab ──
            <div className="flex flex-col pb-6">
              <div className="px-5 pb-4">
                <h3 className="text-[15px] font-semibold text-zinc-900">
                  Tabela de Pontuação
                </h3>
                <p className="mt-0.5 text-[13px] text-zinc-400">
                  O que cada faixa significa para sua longevidade
                </p>
              </div>

              <div className="flex flex-col gap-0 divide-y divide-zinc-100">
                {SCORE_RANGES.map((range) => {
                  const isActive = score >= range.min && score <= range.max;
                  return (
                    <div
                      key={range.label}
                      className={cn(
                        "flex items-start gap-4 px-5 py-4 transition",
                        isActive && "bg-brand-50/60",
                      )}
                    >
                      {/* Range bar */}
                      <div className="mt-1 flex h-10 w-2 shrink-0 rounded-full overflow-hidden">
                        <div
                          className={cn("w-full rounded-full", rangeBar(range.status))}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-zinc-900">
                            {range.label}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              rangeStatus(range.status),
                            )}
                          >
                            {range.min}–{range.max}
                          </span>
                          {isActive && (
                            <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                              Você
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[12px] text-zinc-500">
                          {range.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
