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

// ─── Cores ────────────────────────────────────────────────────────────────────
// Linha em verde brand, mesmo tom da identidade Longevify. Faixas de fundo
// agora MUITO sutis (5–8% opacity) pra não competirem com a linha.

const ZONE_COLOR: Record<BiomarkerStatus, string> = {
  optimal: "#0E7B45", // brand-700 sólido
  normal: "#D8A227", // amber escuro
  out: "#D74545", // vermelho deep
};

const ZONE_LABEL: Record<BiomarkerStatus, string> = {
  optimal: "Ótimo",
  normal: "Normal",
  out: "Fora",
};

const LINE_COLOR = "#1f5d3f"; // brand-700 — combina com identidade

interface BiomarkerBigChartProps {
  biomarker: Biomarker;
  height?: number;
}

/** Classifica um valor escalar na zona correta dado optimalRange e normalRange. */
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

  const values = data.map((d) => d.value);
  const optMin = biomarker.optimalRange?.[0];
  const optMax = biomarker.optimalRange?.[1];
  const normMin = biomarker.normalRange?.[0];
  const normMax = biomarker.normalRange?.[1];

  const yCandidates = [
    ...values,
    optMin,
    optMax,
    normMin,
    normMax,
  ].filter((v): v is number => typeof v === "number");

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

  // Zona do último ponto — usado no ReferenceDot final
  const lastZone = lastPoint
    ? classifyZone(lastPoint.value, biomarker.optimalRange, biomarker.normalRange)
    : "out";
  const lastZoneColor = ZONE_COLOR[lastZone];

  return (
    <div className="w-full">
      {/* Legenda — bolinhas pequenas e cores sutis */}
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
              {/* Gradiente da área — fade vertical sutil */}
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.18} />
                <stop offset="80%" stopColor={LINE_COLOR} stopOpacity={0.02} />
                <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
              </linearGradient>

              {/* Glow sutil no last point */}
              <radialGradient id={glowId}>
                <stop offset="0%" stopColor={lastZoneColor} stopOpacity={0.5} />
                <stop offset="60%" stopColor={lastZoneColor} stopOpacity={0.15} />
                <stop offset="100%" stopColor={lastZoneColor} stopOpacity={0} />
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
              axisLine={false}
              tickLine={false}
              width={36}
              tickCount={4}
            />

            {/* Fora (vermelho) — fundo super sutil */}
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

            {/* Normal (amarelo) */}
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

            {/* Ótima (verde) */}
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
                stroke: LINE_COLOR,
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
                const zoneColor = ZONE_COLOR[zone];
                const zoneLabel = ZONE_LABEL[zone];
                return (
                  <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-lg">
                    <div className="text-[11px] font-medium text-zinc-400">
                      {formatDatePtBR(p.date)}
                    </div>
                    <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-zinc-900">
                      {p.value}
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

            {/* Linha verde brand, smooth, sem dots regulares */}
            <Area
              type="monotone"
              dataKey="value"
              stroke={LINE_COLOR}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 5,
                fill: "#fff",
                stroke: LINE_COLOR,
                strokeWidth: 2.5,
              }}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            />

            {/* Glow halo no last point */}
            {lastPoint ? (
              <ReferenceDot
                x={lastPoint.date}
                y={lastPoint.value}
                r={18}
                fill={`url(#${glowId})`}
                stroke="none"
                ifOverflow="extendDomain"
                isFront={false}
              />
            ) : null}

            {/* Last point — círculo grande colorido pela zona, branco ao redor */}
            {lastPoint ? (
              <ReferenceDot
                x={lastPoint.date}
                y={lastPoint.value}
                r={5.5}
                fill={lastZoneColor}
                stroke="#fff"
                strokeWidth={3}
                ifOverflow="extendDomain"
              />
            ) : null}
          </AreaChart>
        ) : null}
      </div>
    </div>
  );
}
