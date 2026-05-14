"use client";

import {
  AreaChart,
  CartesianGrid,
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

const ZONE_COLOR: Record<BiomarkerStatus, string> = {
  optimal: "#10b981",
  normal: "#e6b845",
  out: "#e85d5d",
};

const ZONE_LABEL: Record<BiomarkerStatus, string> = {
  optimal: "Ótimo",
  normal: "Normal",
  out: "Fora",
};

const LINE_COLOR = "#2d4a38"; // neutral dark-green — readable on all bg zones

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot(props: any) {
  const { cx, cy, payload, optimalRange, normalRange } = props;
  if (cx == null || cy == null) return null;
  const zone = classifyZone(payload.value, optimalRange, normalRange);
  const fill = ZONE_COLOR[zone];
  return <circle cx={cx} cy={cy} r={3.5} fill={fill} stroke="none" />;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomActiveDot(props: any) {
  const { cx, cy, payload, optimalRange, normalRange } = props;
  if (cx == null || cy == null) return null;
  const zone = classifyZone(payload.value, optimalRange, normalRange);
  const fill = ZONE_COLOR[zone];
  return (
    <circle cx={cx} cy={cy} r={5} fill={fill} stroke="#fff" strokeWidth={2} />
  );
}

export function BiomarkerBigChart({
  biomarker,
  height = 320,
}: BiomarkerBigChartProps) {
  const gradientId = `bio-big-${biomarker.id}`;

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
  const pad = Math.max(span * 0.25, rawMax * 0.08, 1);
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

  return (
    <div className="w-full">
      {/* Legenda */}
      <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#10b981]" />
          Ótimo
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#e6b845]" />
          Normal
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#e85d5d]" />
          Fora
        </span>
      </div>

      <div ref={ref} className="w-full" style={{ height }}>
        {width > 0 ? (
          <AreaChart
            data={data}
            width={width}
            height={height}
            margin={{ top: 12, right: 24, bottom: 8, left: 8 }}
          >
            <defs>
              {/* Gradiente neutro — a linha é cinza-escuro, o fill fica sutil */}
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.12} />
                <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="#e7edea"
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="date"
              tickFormatter={(d) =>
                new Date(d).toLocaleDateString("pt-BR", {
                  month: "short",
                  year: "2-digit",
                })
              }
              tick={{ fill: "#6b7a74", fontSize: 11 }}
              axisLine={{ stroke: "#e7edea" }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: "#6b7a74", fontSize: 11 }}
              axisLine={{ stroke: "#e7edea" }}
              tickLine={false}
              width={44}
            />

            {/* Fora (vermelho) — fundo */}
            {typeof lowerOuterEdge === "number" ? (
              <ReferenceArea
                y1={yMin}
                y2={lowerOuterEdge}
                fill="#e85d5d"
                fillOpacity={0.1}
                stroke="none"
                ifOverflow="extendDomain"
              />
            ) : null}
            {typeof upperOuterEdge === "number" ? (
              <ReferenceArea
                y1={upperOuterEdge}
                y2={yMax}
                fill="#e85d5d"
                fillOpacity={0.1}
                stroke="none"
                ifOverflow="extendDomain"
              />
            ) : null}

            {/* Normal (amarelo) */}
            {hasNormal ? (
              <ReferenceArea
                y1={normMin}
                y2={normMax}
                fill="#e6b845"
                fillOpacity={0.12}
                stroke="none"
                ifOverflow="extendDomain"
              />
            ) : null}

            {/* Ótima (verde) */}
            {hasOptimal ? (
              <ReferenceArea
                y1={optMin}
                y2={optMax}
                fill="#10b981"
                fillOpacity={0.16}
                stroke="none"
                ifOverflow="extendDomain"
              />
            ) : null}

            <Tooltip
              cursor={{ stroke: "#9fd4b3", strokeDasharray: "3 3" }}
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
                  <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-md">
                    <div className="text-[11px] text-muted">
                      {formatDatePtBR(p.date)}
                    </div>
                    <div className="mt-0.5 text-[13px] font-semibold tabular-nums">
                      {p.value}
                      <span className="ml-1 text-[11px] font-normal text-muted">
                        {biomarker.unit}
                      </span>
                    </div>
                    <div
                      className="mt-1 text-[11px] font-medium"
                      style={{ color: zoneColor }}
                    >
                      {zoneLabel}
                    </div>
                  </div>
                );
              }}
            />

            {/* Linha neutra — cor fixa, pontos coloridos por zona */}
            <Area
              type="monotone"
              dataKey="value"
              stroke={LINE_COLOR}
              strokeWidth={2.25}
              fill={`url(#${gradientId})`}
              dot={(props) => (
                <CustomDot
                  {...props}
                  optimalRange={biomarker.optimalRange}
                  normalRange={biomarker.normalRange}
                />
              )}
              activeDot={(props) => (
                <CustomActiveDot
                  {...props}
                  optimalRange={biomarker.optimalRange}
                  normalRange={biomarker.normalRange}
                />
              )}
              isAnimationActive={true}
              animationDuration={600}
            />

            {/* Ponto final destacado — colorido pela zona real do último valor */}
            {lastPoint ? (
              <ReferenceDot
                x={lastPoint.date}
                y={lastPoint.value}
                r={6}
                fill={ZONE_COLOR[lastZone]}
                stroke="#fff"
                strokeWidth={2.5}
                ifOverflow="extendDomain"
              />
            ) : null}
          </AreaChart>
        ) : null}
      </div>
    </div>
  );
}
