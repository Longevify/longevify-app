"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { X, ArrowRight, ShoppingCart } from "lucide-react";
import {
  AreaChart,
  Area,
  ReferenceArea,
  ReferenceDot,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import type { Biomarker, BiomarkerStatus } from "@/lib/mock-data";
import { getBiomarkerKnowledge } from "@/lib/biomarker-knowledge";
import { findSupplementForBiomarker } from "@/lib/biomarker-supplement-map";

// ─── Cores ───────────────────────────────────────────────────────────────────

const STATUS_TEXT: Record<BiomarkerStatus, string> = {
  optimal: "text-emerald-700",
  normal: "text-amber-700",
  out: "text-rose-700",
};

const STATUS_BG: Record<BiomarkerStatus, string> = {
  optimal: "bg-emerald-50 border-emerald-200",
  normal: "bg-amber-50 border-amber-200",
  out: "bg-rose-50 border-rose-200",
};

const STATUS_DOT: Record<BiomarkerStatus, string> = {
  optimal: "bg-emerald-500",
  normal: "bg-amber-500",
  out: "bg-rose-500",
};

const STATUS_LABEL: Record<BiomarkerStatus, string> = {
  optimal: "Em faixa ótima",
  normal: "Atenção — fora da faixa ótima",
  out: "Fora da faixa",
};

const LINE_COLOR = "#1f5d3f";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classifyZone(
  value: number,
  optimalRange?: [number, number],
  normalRange?: [number, number],
): BiomarkerStatus {
  if (optimalRange) {
    const [lo, hi] = optimalRange;
    if (value >= lo && value <= hi) return "optimal";
  }
  if (normalRange) {
    const [lo, hi] = normalRange;
    if (value >= lo && value <= hi) return "normal";
  }
  return "out";
}

function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
}

// ─── Card de marcador relacionado ────────────────────────────────────────────

function RelatedMarkerCard({ biomarker }: { biomarker: Biomarker }) {
  const ref = biomarker.referenceLabel;
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 transition",
        STATUS_BG[biomarker.status],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[11.5px] font-medium text-zinc-600">
            {biomarker.name}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-[20px] font-semibold tabular-nums leading-none",
                STATUS_TEXT[biomarker.status],
              )}
            >
              {biomarker.value}
            </span>
            <span className="text-[10px] text-zinc-500">{biomarker.unit}</span>
          </div>
        </div>
        <span className="shrink-0 whitespace-nowrap text-[10px] font-medium text-zinc-400">
          {ref}
        </span>
      </div>
    </div>
  );
}

// ─── Tooltip do chart ────────────────────────────────────────────────────────

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
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] shadow-lg">
      <div className="text-zinc-400">{label}</div>
      <div className="font-semibold text-brand-700">
        {payload[0]?.value} <span className="text-zinc-400">{unit}</span>
      </div>
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────

interface BiomarkerDetailPopupProps {
  biomarker: Biomarker;
  related: Biomarker[];
  onClose: () => void;
}

/**
 * Popup de detalhe de biomarker — estilo "What's causing this?" do
 * Superpower (imagem 2 do Lucas). Mostra:
 *   1. Status badge no header
 *   2. Mini gráfico de evolução com faixas ótima/normal/fora
 *   3. Diagnóstico textual: "Como está e como melhorar"
 *   4. Grid de marcadores correlacionados pra contexto
 *   5. CTA suplemento (quando aplicável) → /loja?q=...#produtos
 *
 * Substitui (na home /dados) o redirect pra /dados/[biomarkerId]. A
 * página dedicada continua existindo pra rotas /dados/ldl direto.
 */
export function BiomarkerDetailPopup({
  biomarker,
  related,
  onClose,
}: BiomarkerDetailPopupProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const chartData = biomarker.history.map((p) => ({
    label: formatMonthYear(p.date),
    value: p.value,
  }));

  const values = biomarker.history.map((p) => p.value);
  const optMin = biomarker.optimalRange?.[0];
  const optMax = biomarker.optimalRange?.[1];
  const normMin = biomarker.normalRange?.[0];
  const normMax = biomarker.normalRange?.[1];

  const yCandidates = [...values, optMin, optMax, normMin, normMax].filter(
    (v): v is number => typeof v === "number",
  );
  const rawMin = Math.min(...yCandidates);
  const rawMax = Math.max(...yCandidates);
  const span = rawMax - rawMin;
  const pad = Math.max(span * 0.2, rawMax * 0.06, 1);
  const yMin = Math.max(0, rawMin - pad);
  const yMax = rawMax + pad;

  const hasOptimal = typeof optMin === "number" && typeof optMax === "number";
  const hasNormal = typeof normMin === "number" && typeof normMax === "number";

  const lastPoint = chartData[chartData.length - 1];
  const lastZone = classifyZone(
    biomarker.value,
    biomarker.optimalRange,
    biomarker.normalRange,
  );

  const knowledge = getBiomarkerKnowledge(biomarker.id);
  const supplement = findSupplementForBiomarker(biomarker.id);

  // Diagnóstico textual — combina partes do knowledge file
  const diagnosis = knowledge?.whyItMatters
    ? `${whyAndHow(biomarker)} ${knowledge.whyItMatters.split(".")[0]}.`
    : whyAndHow(biomarker);

  // Pega 4 ações concretas das categorias do improve (rotina, alimentação,
  // suplementação, exercício, sono) — top 1 de cada se houver
  const howTo: string[] = knowledge?.improve
    ? [
        ...knowledge.improve.alimentacao.slice(0, 1),
        ...knowledge.improve.suplementacao.slice(0, 1),
        ...knowledge.improve.exercicio.slice(0, 1),
        ...knowledge.improve.sono.slice(0, 1),
      ].filter(Boolean)
    : defaultSteps(biomarker);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      aria-modal="true"
      role="dialog"
      aria-label={`Detalhes de ${biomarker.name}`}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={cn(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-white",
          "sm:max-w-[640px] sm:rounded-[20px]",
          "rounded-t-[20px]",
          "shadow-2xl",
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-zinc-100 px-6 pt-5 pb-4">
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-zinc-400">
              O que está causando isso?
            </div>
            <h2 className="mt-1 text-[20px] font-semibold leading-tight text-zinc-900">
              {biomarker.name}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-semibold",
                STATUS_BG[biomarker.status],
                STATUS_TEXT[biomarker.status],
              )}
            >
              <span
                className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[biomarker.status])}
              />
              {STATUS_LABEL[biomarker.status]}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Chart */}
          <div className="px-6 py-5">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={chartData}
                margin={{ top: 20, right: 12, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient
                    id={`grad-${biomarker.id}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10.5, fill: "#a1a1aa", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={18}
                />
                <YAxis
                  domain={[yMin, yMax]}
                  tick={{ fontSize: 10.5, fill: "#a1a1aa" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  tickCount={4}
                />
                <Tooltip
                  content={<ChartTooltip unit={biomarker.unit} />}
                  cursor={{
                    stroke: LINE_COLOR,
                    strokeDasharray: "2 4",
                    strokeOpacity: 0.4,
                  }}
                />

                {/* Faixa Ótimo */}
                {hasOptimal && (
                  <ReferenceArea
                    y1={optMin}
                    y2={optMax}
                    fill="#10b981"
                    fillOpacity={0.1}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                    ifOverflow="extendDomain"
                  />
                )}

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={LINE_COLOR}
                  strokeWidth={2}
                  fill={`url(#grad-${biomarker.id})`}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: "#fff",
                    stroke: LINE_COLOR,
                    strokeWidth: 2,
                  }}
                  isAnimationActive
                  animationDuration={600}
                />

                {lastPoint && (
                  <ReferenceDot
                    x={lastPoint.label}
                    y={lastPoint.value}
                    r={5}
                    fill={
                      lastZone === "optimal"
                        ? "#10b981"
                        : lastZone === "normal"
                          ? "#f59e0b"
                          : "#f43f5e"
                    }
                    stroke="#fff"
                    strokeWidth={2.5}
                    ifOverflow="extendDomain"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>

            {/* Legenda: faixa ótima */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Faixa ótima: {biomarker.referenceLabel} {biomarker.unit}
              </div>
              <Link
                href={`/dados/${biomarker.id}`}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 transition hover:text-brand-800"
              >
                Análise completa
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Diagnóstico textual — porque está assim + como melhorar */}
          <div className="border-t border-zinc-100 bg-gradient-to-br from-brand-50 to-white px-6 py-5">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-brand-700">
              Diagnóstico Dr. Lon
            </div>
            <h3 className="mt-1 text-[15px] font-semibold text-zinc-900">
              Por que está assim e como melhorar
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-700">
              {diagnosis}
            </p>

            {howTo.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {howTo.slice(0, 4).map((step, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-[12.5px] leading-relaxed text-zinc-700"
                  >
                    <span className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full bg-brand-600" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* CTA suplemento */}
            {supplement && biomarker.status !== "optimal" && (
              <Link
                href={`/loja?q=${encodeURIComponent(supplement)}#produtos`}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-700 px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-brand-800"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Comprar {supplement}
              </Link>
            )}
          </div>

          {/* Markers correlacionados */}
          {related.length > 0 && (
            <div className="border-t border-zinc-100 px-6 py-5">
              <h3 className="text-[14px] font-semibold text-zinc-900">
                Marcadores correlacionados
              </h3>
              <p className="mt-0.5 text-[11.5px] text-zinc-500">
                Esses biomarcadores estão fisiologicamente conectados.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {related.map((r) => (
                  <RelatedMarkerCard key={r.id} biomarker={r} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Fallback diagnosis quando não tem knowledge file ────────────────────────

function whyAndHow(biomarker: Biomarker): string {
  if (biomarker.status === "optimal") {
    return `Seu ${biomarker.name} em ${biomarker.value} ${biomarker.unit} está em faixa ótima. Mantenha o que está fazendo — sono adequado, exercício regular e dieta equilibrada.`;
  }
  if (biomarker.status === "normal") {
    return `Seu ${biomarker.name} em ${biomarker.value} ${biomarker.unit} está dentro do normal mas fora da faixa ótima (${biomarker.referenceLabel}). Há espaço pra otimizar com mudanças de estilo de vida + suplementação específica.`;
  }
  return `Seu ${biomarker.name} em ${biomarker.value} ${biomarker.unit} está fora da faixa de referência (${biomarker.referenceLabel}). Recomendamos intervenção prioritária — converse com sua equipe médica.`;
}

function defaultSteps(biomarker: Biomarker): string[] {
  if (biomarker.status === "optimal") return [];
  return [
    "Reavalie sono — adultos precisam de 7–9h/noite consistentes",
    "Treino de força 2–3x/semana + 150 min de Zona 2",
    "Dieta com base em alimentos integrais, fibra e proteína",
    "Revisar suplementação com sua equipe Longevify",
  ];
}
