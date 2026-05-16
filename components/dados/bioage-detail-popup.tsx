"use client";

import { useEffect, useCallback, useState } from "react";
import { X, ChevronDown, Sparkles } from "lucide-react";
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
import { getBioAgeInsight } from "@/lib/dados/organ-insights";

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
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (status === "normal")
    return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-rose-50 text-rose-700 border border-rose-200";
}

function statusDot(status: OrganBioAge["status"]): string {
  if (status === "optimal") return "bg-emerald-500";
  if (status === "normal") return "bg-amber-500";
  return "bg-rose-500";
}

function statusLabel(status: OrganBioAge["status"]): string {
  if (status === "optimal") return "Ótimo";
  if (status === "normal") return "Normal";
  return "Atenção";
}

function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
}

// ─── ChartTooltip ────────────────────────────────────────────────────────────

interface ChartTooltipPayload {
  value?: number;
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-[12px] shadow-lg">
      <div className="text-zinc-400">{label}</div>
      <div className="font-semibold text-brand-700">
        {payload[0]?.value?.toFixed(1)} {unit}
      </div>
    </div>
  );
}

// ─── OrganExpandableRow ──────────────────────────────────────────────────────
//
// Click expande pra mostrar:
//   - Mini chart de evolução histórica daquele órgão
//   - Diagnóstico "como está e como melhorar" (texto + steps)

function OrganExpandableRow({
  organ,
  chronologicalAge,
}: {
  organ: OrganBioAge;
  chronologicalAge: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const insight = getBioAgeInsight(
    organ.organ,
    organ.age,
    organ.status,
    chronologicalAge,
  );
  const delta = +(organ.age - chronologicalAge).toFixed(1);

  const chartData = insight.history.map((p) => ({
    label: formatMonthYear(p.date),
    value: p.value,
  }));

  const ages = insight.history.map((p) => p.value);
  const yMin = Math.floor(Math.min(...ages, chronologicalAge) - 1);
  const yMax = Math.ceil(Math.max(...ages, chronologicalAge) + 1);

  return (
    <div className="border-b border-zinc-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-brand-50/40"
      >
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
                  ? "text-emerald-600"
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

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-zinc-400 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 bg-zinc-50/40 px-5 pb-5 pt-4">
          {/* Mini chart histórica */}
          <div className="mb-4">
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
              Evolução nos últimos 10 meses
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient
                    id={`organ-grad-${organ.organ}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#3f9a6b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3f9a6b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "#a1a1aa" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={12}
                />
                <YAxis
                  domain={[yMin, yMax]}
                  tick={{ fontSize: 9, fill: "#a1a1aa" }}
                  axisLine={false}
                  tickLine={false}
                  width={26}
                />
                <Tooltip content={<ChartTooltip unit="anos" />} />
                <ReferenceLine
                  y={chronologicalAge}
                  stroke="#d4d4d8"
                  strokeDasharray="3 3"
                  label={{
                    value: `Cronológica ${chronologicalAge}`,
                    position: "insideTopRight",
                    fill: "#a1a1aa",
                    fontSize: 9,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3f9a6b"
                  strokeWidth={2}
                  fill={`url(#organ-grad-${organ.organ})`}
                  dot={{ r: 2.5, fill: "#3f9a6b" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Diagnóstico Dr. Lon */}
          <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
              <Sparkles className="h-3 w-3" />
              Como está e como melhorar
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-700">
              {insight.summary}
            </p>
            {insight.howToImprove.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {insight.howToImprove.map((step, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-[12px] leading-relaxed text-zinc-700"
                  >
                    <span className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full bg-brand-600" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
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
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={cn(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-white",
          "sm:max-w-[560px] sm:rounded-[20px]",
          "rounded-t-[20px]",
          "shadow-2xl",
        )}
      >
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

        <div className="min-h-0 flex-1 overflow-y-auto">
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
                  ? "text-emerald-600"
                  : delta === 0
                    ? "text-zinc-500"
                    : "text-amber-600",
              )}
            >
              {deltaLabel}
            </p>
          </div>

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
                <Tooltip content={<ChartTooltip unit="anos" />} />
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

          <div className="border-t border-zinc-100 bg-zinc-50/50 px-5 py-4">
            <h3 className="text-[15px] font-semibold text-zinc-900">
              Idade por sistema orgânico
            </h3>
            <p className="mt-0.5 text-[12px] text-zinc-500">
              Clique em cada órgão pra ver evolução histórica e como melhorar.
            </p>
          </div>

          <div className="bg-white">
            {organBioAges.map((o) => (
              <OrganExpandableRow
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
