"use client";

import { Bar, BarChart, Cell } from "recharts";
import { useMeasuredSize } from "@/lib/use-measured-size";

const HEIGHT = 56;

export function SevenDayBar({
  data,
  target,
  colorOk = "#10b981",
  colorLow = "#e6b845",
}: {
  data: { date: string; value: number }[];
  target: number;
  colorOk?: string;
  colorLow?: string;
}) {
  const { ref, width } = useMeasuredSize<HTMLDivElement>();
  return (
    <div ref={ref} className="h-14 w-full" style={{ height: HEIGHT }}>
      {width > 0 ? (
        <BarChart
          data={data}
          width={width}
          height={HEIGHT}
          margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
          barCategoryGap={3}
        >
          <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.value >= target ? colorOk : colorLow}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      ) : null}
    </div>
  );
}
