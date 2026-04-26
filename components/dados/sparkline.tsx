"use client";

import { Area, AreaChart } from "recharts";
import type { BiomarkerPoint, BiomarkerStatus } from "@/lib/mock-data";
import { useMeasuredSize } from "@/lib/use-measured-size";

const COLORS: Record<BiomarkerStatus, string> = {
  optimal: "#10b981",
  normal: "#e6b845",
  out: "#e85d5d",
};

const HEIGHT = 40;

export function Sparkline({
  data,
  status,
}: {
  data: BiomarkerPoint[];
  status: BiomarkerStatus;
}) {
  const color = COLORS[status];
  const id = `spark-${status}-${data.length}`;
  const { ref, width } = useMeasuredSize<HTMLDivElement>();

  return (
    <div ref={ref} className="h-10 w-full" style={{ height: HEIGHT }}>
      {width > 0 ? (
        <AreaChart
          data={data}
          width={width}
          height={HEIGHT}
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
  );
}
