import { cn } from "@/lib/utils";
import type { HabitState } from "@/lib/habits/types";

interface HabitHeatmapProps {
  state: HabitState;
  habitId: string;
  weeks?: number;
}

function buildCells(weeks: number): string[][] {
  // Retorna colunas de 7 dias terminando hoje (estilo GitHub)
  const today = new Date();
  const totalDays = weeks * 7;
  const flat: string[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    flat.push(`${y}-${m}-${day}`);
  }
  // Agrupa em colunas de 7
  const cols: string[][] = [];
  for (let i = 0; i < flat.length; i += 7) {
    cols.push(flat.slice(i, i + 7));
  }
  return cols;
}

export function HabitHeatmap({
  state,
  habitId,
  weeks = 12,
}: HabitHeatmapProps) {
  const cols = buildCells(weeks);
  const log = state.log[habitId] ?? {};

  function color(status: string | undefined): string {
    if (status === "done") return "bg-brand-500";
    if (status === "skip") return "bg-[#EEF1EE]";
    if (status === "missed") return "bg-[#FBE1E1]";
    return "bg-brand-50/70";
  }

  return (
    <div className="flex gap-[3px] overflow-x-auto">
      {cols.map((week, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {week.map((d) => (
            <span
              key={d}
              title={`${d}${log[d] ? ` · ${log[d]}` : ""}`}
              className={cn("h-3 w-3 rounded-[3px]", color(log[d]))}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
