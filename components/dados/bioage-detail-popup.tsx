"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronDown, ChevronRight } from "lucide-react";
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
import type { BioAgePoint, OrganBioAge } from "@/lib/mock-data";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BioAgeDetailPopupProps {
  open: boolean;
  onClose: () => void;
  biologicalAge: number;
  chronologicalAge: number;
  biologicalAgeHistory: BioAgePoint[];
  organBioAges: OrganBioAge[];
}

type Tab = "trend" | "scorecard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(status: OrganBioAge["status"]): string {
  if (status === "optimal") return "Optimal";
  if (status === "normal") return "Normal";
  return "Atenção";
}

function statusClass(status: OrganBioAge["status"]): string {
  if (status === "optimal")
    return "bg-brand-50 text-brand-700 border border-brand-200";
  if (status === "normal")
    return "bg-zinc-100 text-zinc-600 border border-zinc-200";
  return "bg-amber-50 text-amber-700 border border-amber-200";
}

function statusDot(status: OrganBioAge["status"]): string {
  if (status === "optimal") return "bg-brand-500";
  if (status === "normal") return "bg-zinc-400";
  return "bg-amber-500";
}

function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

// ─── OrganCard ────────────────────────────────────────────────────────────────

function OrganCard({ organ }: { organ: OrganBioAge }) {
  const [expanded, setExpanded] = useState(false);
  const delta = +(organ.age - 27).toFixed(1); // placeholder chron age shown per organ

  return (
    <div className="border-b border-zinc-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-brand-50/40"
      >
        {/* left: name + markers */}
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-zinc-900">
            {organ.organ}
          </div>
          <div className="mt-0.5 text-[12px] text-zinc-400">
            {organ.markersCount} marcadores
          </div>
        </div>

        {/* status pill */}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            statusClass(organ.status),
          )}
        >
          <span
            className={cn("h-1.5 w-1.5 rounded-full", statusDot(organ.status))}
          />
          {statusLabel(organ.status)}
        </span>

        {/* age */}
        <div className="w-[72px] text-right text-[14px] font-semibold text-zinc-900">
          {organ.age.toFixed(2)}
          <span className="ml-0.5 text-[11px] font-normal text-zinc-400">
            anos
          </span>
        </div>

        {/* chevron */}
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-4">
          <div className="rounded-xl bg-brand-50 px-4 py-3 text-[13px] text-zinc-600">
            Delta vs. cronológica:{" "}
            <span
              className={cn(
                "font-semibold",
                delta < 0
                  ? "text-brand-600"
                  : delta === 0
                    ? "text-zinc-500"
                    : "text-amber-600",
              )}
            >
              {delta > 0 ? "+" : ""}
              {delta} anos
            </span>
          </div>
        </div>
      )}
    </div>
  );
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
        {payload[0]?.value?.toFixed(1)} anos
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BioAgeDetailPopup({
  open,
  onClose,
  biologicalAge,
  chronologicalAge,
  biologicalAgeHistory,
  organBioAges,
}: BioAgeDetailPopupProps) {
  const [tab, setTab] = useState<Tab>("trend");

  // Close on Escape
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

  // Chart data — label each point for X axis
  const chartData = biologicalAgeHistory.map((p) => ({
    label: formatMonthYear(p.date),
    age: p.age,
  }));

  const minAge = Math.floor(Math.min(...biologicalAgeHistory.map((p) => p.age)) - 2);
  const maxAge = Math.ceil(Math.max(...biologicalAgeHistory.map((p) => p.age)) + 2);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      aria-modal="true"
      role="dialog"
      aria-label="Idade Biológica — Detalhes"
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
            Idade Biológica
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
              {/* Book re-test box */}
              <div className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                <div>
                  <div className="text-[12px] font-semibold text-zinc-700">
                    Agende seu re-teste anual
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-400">
                    Monitore sua progressão ao longo do tempo
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
                {/* "Optimal" label top-right of chart */}
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
                        id="bioage-gradient"
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
                      domain={[minAge, maxAge]}
                      tick={{ fontSize: 11, fill: "#a1a1aa" }}
                      axisLine={false}
                      tickLine={false}
                      width={32}
                    />
                    <Tooltip content={<ChartTooltip />} />

                    {/* Chronological age reference line */}
                    <ReferenceLine
                      y={chronologicalAge}
                      stroke="#d4d4d8"
                      strokeDasharray="4 3"
                      label={{
                        value: `Cronológica ${chronologicalAge}`,
                        position: "insideTopRight",
                        fill: "#a1a1aa",
                        fontSize: 10,
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="age"
                      stroke="#3f9a6b"
                      strokeWidth={2.5}
                      fill="url(#bioage-gradient)"
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
                    Biológica
                  </div>
                  <div className="mt-1 text-[28px] font-semibold leading-none text-zinc-900">
                    {biologicalAge}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-400">anos</div>
                </div>
                <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Cronológica
                  </div>
                  <div className="mt-1 text-[28px] font-semibold leading-none text-zinc-900">
                    {chronologicalAge}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-400">anos</div>
                </div>
              </div>
            </div>
          ) : (
            // ── Score Card tab ──
            <div className="flex flex-col pb-6">
              {/* Heading */}
              <div className="px-5 pb-3">
                <h3 className="text-[15px] font-semibold text-zinc-900">
                  Seu Relatório OrganAge
                </h3>
                <p className="mt-0.5 text-[13px] text-zinc-400">
                  Idade biológica por sistema orgânico
                </p>
              </div>

              {/* Organ cards */}
              <div className="divide-y-0">
                {organBioAges.map((o) => (
                  <OrganCard key={o.organ} organ={o} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
