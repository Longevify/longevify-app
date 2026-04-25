import { cn } from "@/lib/utils";
import type { SymptomEntry } from "@/lib/symptoms/types";

interface SymptomHeatmapProps {
  symptomId: string;
  label: string;
  entries: SymptomEntry[];
  days?: number;
}

function buildGrid(days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}

function cellColor(severity: number | null): string {
  if (severity == null) return "bg-brand-50/60";
  if (severity <= 3) return "bg-brand-200";
  if (severity <= 6) return "bg-brand-400";
  if (severity <= 8) return "bg-brand-600";
  return "bg-brand-800";
}

export function SymptomHeatmap({
  symptomId,
  label,
  entries,
  days = 30,
}: SymptomHeatmapProps) {
  const grid = buildGrid(days);
  const map = new Map<string, number>();
  for (const e of entries) {
    const r = e.reports.find((x) => x.symptomId === symptomId);
    if (r) map.set(e.date, r.severity);
  }
  const total = grid.filter((d) => map.has(d)).length;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium">{label}</span>
        <span className="text-[11px] text-muted">
          {total} {total === 1 ? "dia" : "dias"} nos últimos {days}
        </span>
      </div>
      <div className="flex flex-wrap gap-[3px]">
        {grid.map((d) => (
          <span
            key={d}
            title={`${d}${map.has(d) ? ` · severidade ${map.get(d)}` : ""}`}
            className={cn(
              "h-3.5 w-3.5 rounded-[3px]",
              cellColor(map.get(d) ?? null),
            )}
          />
        ))}
      </div>
    </div>
  );
}
