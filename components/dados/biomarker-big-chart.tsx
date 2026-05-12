"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceDot,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Biomarker, BiomarkerStatus } from "@/lib/mock-data";
import { formatDatePtBR } from "@/lib/utils";
import { useMeasuredSize } from "@/lib/use-measured-size";

const STROKE: Record<BiomarkerStatus, string> = {
  optimal: "#10b981",
  normal: "#e6b845",
  out: "#e85d5d",
};

interface BiomarkerBigChartProps {
  biomarker: Biomarker;
  height?: number;
}

export function BiomarkerBigChart({
  biomarker,
  height = 320,
}: BiomarkerBigChartProps) {
  const color = STROKE[biomarker.status];
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
  // Padding mais generoso pra dar espaço visual à zona "Fora" — sem isso a
  // faixa vermelha fica imperceptível quando o paciente está sempre dentro
  // das ranges normais/ótimas.
  const span = rawMax - rawMin;
  const pad = Math.max(span * 0.25, rawMax * 0.08, 1);
  const yMin = Math.max(0, rawMin - pad);
  const yMax = rawMax + pad;

  const lastPoint = data[data.length - 1];
  const { ref, width } = useMeasuredSize<HTMLDivElement>();

  // Resolve a borda externa de cada lado pra zona "Fora". Quando há
  // normalRange, fora = abaixo de normMin / acima de normMax. Quando NÃO há
  // normalRange, fora cola direto no optimal (sem zona normal intermediária).
  const hasNormal = typeof normMin === "number" && typeof normMax === "number";
  const hasOptimal = typeof optMin === "number" && typeof optMax === "number";
  const lowerOuterEdge = hasNormal ? (normMin as number) : optMin;
  const upperOuterEdge = hasNormal ? (normMax as number) : optMax;

  return (
    <div className="w-full">
      {/* Legenda — SEMPRE acima do gráfico, com os 3 dots fixos. Mesmo
          quando o biomarcador não tem normalRange, mostramos o dot Normal
          pra padronizar visual entre todos os marcadores. */}
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
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
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

            {/* Fora (vermelho) — desenhada primeiro, fica no fundo. Cobre
                [yMin, lowerEdge] e [upperEdge, yMax]. Quando não há
                normalRange, edge = optimalRange (sem zona normal
                intermediária). Sempre renderiza ambos os lados quando
                qualquer edge existe — garante 3 zonas visuais. */}
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

            {/* Normal (amarelo) — desenhada por cima da fora, antes da ótima */}
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

            {/* Ótima (verde) — sempre por cima */}
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
                  </div>
                );
              }}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.25}
              fill={`url(#${gradientId})`}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: color }}
              isAnimationActive={true}
              animationDuration={600}
            />

            {lastPoint ? (
              <ReferenceDot
                x={lastPoint.date}
                y={lastPoint.value}
                r={6}
                fill={color}
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
