"use client";

import { useEffect, useCallback } from "react";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function statusLabel(status: OrganBioAge["status"]): string {
  if (status === "optimal") return "Ótimo";
  if (status === "normal") return "Normal";
  return "Atenção";
}

function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

// ─── Chart Tooltip ────────────────────────────────────────────────────────────

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

// ─── OrganRow ─────────────────────────────────────────────────────────────────

function OrganRow({
  organ,
  chronologicalAge,
}: {
  organ: OrganBioAge;
  chronologicalAge: number;
}) {
  const delta = +(organ.age - chronologicalAge).toFixed(1);
  return (
    <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-zinc-900">
          {organ.organ}
        </div>
        <div className="mt-0.5 text-[12px] text-zinc-400">
          {organ.markersCount} marcadores
          {" · "}
          <span
            className={cn(
              delta < 0
                ? "text-brand-600"
                : delta === 0
                  ? "text-zinc-500"
                  : "text-amber-600",
            )}
          >
            {delta > 0 ? "+" : ""}
            {delta} vs cronológica
          </span>
        </div>
      </div>

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

      <div className="w-[78px] text-right">
        <div className="text-[16px] font-semibold leading-none text-zinc-900">
          {organ.age.toFixed(1)}
        </div>
        <div className="mt-0.5 text-[10px] text-zinc-400">anos</div>
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

  const chartData = biologicalAgeHistory.map((p) => ({
    label: formatMonthYear(p.date),
    age: p.age,
  }));

  const minAge = Math.floor(
    Math.min(...biologicalAgeHistory.map((p) => p.age), chronologicalAge) - 2,
  );
  const maxAge = Math.ceil(
    Math.max(...biologicalAgeHistory.map((p) => p.age), chronologicalAge) + 2,
  );

  const delta = +(biologicalAge - chronologicalAge).toFixed(1);
  const deltaLabel =
    delta < 0
      ? `${Math.abs(delta)} anos abaixo da idade real`
      : delta === 0
        ? "Igual à idade real"
        : `${delta} anos acima da idade real`;

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
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-white",
          "sm:max-w-[520px] sm:rounded-[20px]",
          "rounded-t-[20px]",
          "shadow-2xl",
        )}
      >
        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-[16px] font-semibold text-zinc-900">
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

        {/* ── Scrollable body ── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Hero — número grande */}
          <div className="px-5 pt-7 pb-5">
            <div className="flex items-baseline gap-2">
              <span className="text-[64px] font-semibold leading-none tracking-tight text-zinc-900">
                {biologicalAge}
              </span>
              <span className="text-[18px] font-medium text-zinc-500">
                anos
              </span>
            </div>
            <p
              className={cn(
                "mt-2 text-[14px] font-medium",
                delta < 0
                  ? "text-brand-600"
                  : delta === 0
                    ? "text-zinc-500"
                    : "text-amber-600",
              )}
            >
              {deltaLabel}
            </p>
          </div>

          {/* Chart de evolução */}
          <div className="px-5 pb-6">
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
              Evolução ao longo do tempo
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={chartData}
                margin={{ top: 16, right: 8, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient
                    id="bioage-gradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#3f9a6b" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3f9a6b" stopOpacity={0.04} />
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

          {/* Seção: Por sistema orgânico */}
          <div className="border-t border-zinc-100 bg-zinc-50/50 px-5 py-4">
            <h3 className="text-[15px] font-semibold text-zinc-900">
              Idade por sistema orgânico
            </h3>
            <p className="mt-0.5 text-[12px] text-zinc-500">
              Quanto menor que sua idade cronológica ({chronologicalAge}),
              melhor.
            </p>
          </div>

          <div className="bg-white">
            {organBioAges.map((o) => (
              <OrganRow
                key={o.organ}
                organ={o}
                chronologicalAge={chronologicalAge}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
