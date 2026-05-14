"use client";

import {
  AreaChart,
  ReferenceArea,
  ReferenceDot,
  Tooltip,
  XAxis,
  YAxis,
  Area,
} from "recharts";
import type { Biomarker, BiomarkerStatus } from "@/lib/mock-data";
import { formatDatePtBR } from "@/lib/utils";
import { useMeasuredSize } from "@/lib/use-measured-size";

// ─── Cores ───────────────────────────────────────────────────────────────────
//
// Linha + área coloridas pela ZONA DO ÚLTIMO PONTO. Antes a linha era
// brand-700 fixed independente do status — confundia visualmente porque o
// gradiente verde sob a linha podia atravessar a faixa amarela (Normal) e
// dar impressão errada de "está em faixa ótima".
//
// Lucas (2026-05): "a cor da linha deveria ser a cor do último dado".

const ZONE_HEX: Record<BiomarkerStatus, string> = {
  optimal: "#0E7B45",
  normal: "#D8A227",
  out: "#D74545",
};

const ZONE_LABEL: Record<BiomarkerStatus, string> = {
  optimal: "Ótimo",
  normal: "Normal",
  out: "Fora",
};

interface BiomarkerBigChartProps {
  biomarker: Biomarker;
  height?: number;
}

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

/**
 * Formata número pra no máximo 2 casas decimais (sem trailing zeros).
 * Garante que ticks Y do Recharts não fiquem "5.0000001" por float error.
 */
function formatNumber(n: number): string {
  return (+n.toFixed(2)).toString();
}

export function BiomarkerBigChart({
  biomarker,
  height = 320,
}: BiomarkerBigChartProps) {
  const gradientId = `bio-big-${biomarker.id}`;
  const glowId = `bio-glow-${biomarker.id}`;

  const data = biomarker.history.map((p) => ({
    date: p.date,
    value: p.value,
  }));

  // Empty state quando só temos 1 ou 0 pontos — não dá pra traçar curva
  if (data.length < 2) {
    return (
      <div
        className="flex w-full flex-col items-center justify-center rounded-2xl bg-zinc-50 px-6 py-12 text-center"
        style={{ height }}
      >
        <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Histórico
        </div>
        <div className="mt-2 text-[42px] font-semibold tabular-nums text-zinc-900">
          {data.length === 1 ? formatNumber(data[0].value) : "—"}
          {data.length === 1 && (
            <span className="ml-2 text-[16px] font-normal text-zinc-500">
              {biomarker.unit}
            </span>
          )}
        </div>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-zinc-500">
          {data.length === 1
            ? "Só temos 1 medição até agora. Quando você fizer um próximo exame, a evolução aparece aqui."
            : "Sem histórico ainda. Faça seu primeiro painel pra começar a acompanhar."}
        </p>
      </div>
    );
  }

  const values = data.map((d) => d.value);
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

  const lastPoint = data[data.length - 1];
  const { ref, width } = useMeasuredSize<HTMLDivElement>();

  const hasNormal = typeof normMin === "number" && typeof normMax === "number";
  const hasOptimal = typeof optMin === "number" && typeof optMax === "number";

  const allMins = [
    hasNormal ? (normMin as number) : null,
    hasOptimal ? (optMin as number) : null,
  ].filter((v): v is number => v !== null);
  const allMaxes = [
    hasNormal ? (normMax as number) : null,
    hasOptimal ? (optMax as number) : null,
  ].filter((v): v is number => v !== null);

  const lowerOuterEdge = allMins.length > 0 ? Math.min(...allMins) : undefined;
  const upperOuterEdge = allMaxes.length > 0 ? Math.max(...allMaxes) : undefined;

  // Zona do último ponto define cor da linha + área + dot
  const lastZone = classifyZone(
    lastPoint.value,
    biomarker.optimalRange,
    biomarker.normalRange,
  );
  const lineColor = ZONE_HEX[lastZone];

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center gap-4 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#0E7B45]" />
          <span className="font-medium">Ótimo</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#D8A227]" />
          <span className="font-medium">Normal</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#D74545]" />
          <span className="font-medium">Fora</span>
        </span>
      </div>

      <div ref={ref} className="w-full" style={{ height }}>
        {width > 0 ? (
          <AreaChart
            data={data}
            width={width}
            height={height}
            margin={{ top: 16, right: 28, bottom: 4, left: 4 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.18} />
                <stop offset="80%" stopColor={lineColor} stopOpacity={0.02} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
              <radialGradient id={glowId}>
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.5} />
                <stop offset="60%" stopColor={lineColor} stopOpacity={0.15} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </radialGradient>
            </defs>

            <XAxis
              dataKey="date"
              tickFormatter={(d) =>
                new Date(d).toLocaleDateString("pt-BR", {
                  month: "short",
                  year: "2-digit",
                })
              }
              tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              minTickGap={20}
              padding={{ left: 8, right: 8 }}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
              tickFormatter={formatNumber}
              axisLine={false}
              tickLine={false}
              width={42}
              tickCount={4}
            />

            {typeof lowerOuterEdge === "number" ? (
              <ReferenceArea
                y1={yMin}
                y2={lowerOuterEdge}
                fill="#D74545"
                fillOpacity={0.05}
                stroke="none"
                ifOverflow="extendDomain"
              />
            ) : null}
            {typeof upperOuterEdge === "number" ? (
              <ReferenceArea
                y1={upperOuterEdge}
                y2={yMax}
                fill="#D74545"
                fillOpacity={0.05}
                stroke="none"
                ifOverflow="extendDomain"
              />
            ) : null}
            {hasNormal ? (
              <ReferenceArea
                y1={normMin}
                y2={normMax}
                fill="#D8A227"
                fillOpacity={0.06}
                stroke="none"
                ifOverflow="extendDomain"
              />
            ) : null}
            {hasOptimal ? (
              <ReferenceArea
                y1={optMin}
                y2={optMax}
                fill="#0E7B45"
                fillOpacity={0.08}
                stroke="none"
                ifOverflow="extendDomain"
              />
            ) : null}

            <Tooltip
              cursor={{
                stroke: lineColor,
                strokeDasharray: "2 4",
                strokeOpacity: 0.4,
              }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const p = payload[0].payload as { date: string; value: number };
                const zone = classifyZone(
                  p.value,
                  biomarker.optimalRange,
                  biomarker.normalRange,
                );
                const zoneColor = ZONE_HEX[zone];
                const zoneLabel = ZONE_LABEL[zone];
                return (
                  <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-lg">
                    <div className="text-[11px] font-medium text-zinc-400">
                      {formatDatePtBR(p.date)}
                    </div>
                    <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-zinc-900">
                      {formatNumber(p.value)}
                      <span className="ml-1 text-[11px] font-normal text-zinc-400">
                        {biomarker.unit}
                      </span>
                    </div>
                    <div
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold"
                      style={{ color: zoneColor }}
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: zoneColor }}
                      />
                      {zoneLabel}
                    </div>
                  </div>
                );
              }}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 5,
                fill: "#fff",
                stroke: lineColor,
                strokeWidth: 2.5,
              }}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            />

            <ReferenceDot
              x={lastPoint.date}
              y={lastPoint.value}
              r={18}
              fill={`url(#${glowId})`}
              stroke="none"
              ifOverflow="extendDomain"
            />
            <ReferenceDot
              x={lastPoint.date}
              y={lastPoint.value}
              r={5.5}
              fill={lineColor}
              stroke="#fff"
              strokeWidth={3}
              ifOverflow="extendDomain"
            />
          </AreaChart>
        ) : null}
      </div>
    </div>
  );
}
