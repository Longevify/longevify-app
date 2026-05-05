"use client";

import { useId, type ReactNode } from "react";
import { Area, AreaChart } from "recharts";
import { Card } from "@/components/ui/card";
import { useMeasuredSize } from "@/lib/use-measured-size";

const SPARK_HEIGHT = 40;

export function MetricTile({
  label,
  value,
  unit,
  series,
  color = "#3f9a6b",
  helper,
}: {
  label: ReactNode;
  value: string;
  unit?: string;
  series: { date: string; value: number }[];
  color?: string;
  helper?: string;
}) {
  // useId é SSR-safe (server e client geram o mesmo id determinístico).
  // Antes usava Math.random() que causava hydration mismatch React #418
  // quando o sparkline renderizava em /dados (que importa wearables/metric-tile
  // indiretamente via GoalsSummary).
  const reactId = useId();
  const id =
    typeof label === "string"
      ? `tile-${label.replace(/\s+/g, "-")}`
      : `tile-${reactId.replace(/:/g, "_")}`;
  const { ref, width } = useMeasuredSize<HTMLDivElement>();
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <div className="text-[22px] font-semibold">{value}</div>
        {unit ? <span className="text-[12px] text-muted">{unit}</span> : null}
      </div>
      <div
        ref={ref}
        className="h-10 w-full"
        style={{ height: SPARK_HEIGHT }}
      >
        {width > 0 ? (
          <AreaChart
            data={series}
            width={width}
            height={SPARK_HEIGHT}
            margin={{ top: 4, right: 2, bottom: 2, left: 2 }}
          >
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.8}
              fill={`url(#${id})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        ) : null}
      </div>
      {helper ? (
        <div className="text-[11px] text-muted">{helper}</div>
      ) : null}
    </Card>
  );
}
