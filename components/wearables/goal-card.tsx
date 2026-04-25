"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  DailyHealthMetrics,
  Goal,
  GoalProgress,
} from "@/lib/wearables-mock";
import { SevenDayBar } from "./seven-day-bar";

const STATUS_MAP: Record<
  GoalProgress["status"],
  { label: string; text: string; bar: string; pill: string }
> = {
  "on-track": {
    label: "No ritmo",
    text: "text-[#0E7B45]",
    bar: "bg-[color:var(--color-status-optimal)]",
    pill: "bg-[#DFF5E9] text-[#0E7B45]",
  },
  attention: {
    label: "Atenção",
    text: "text-[#8A6A13]",
    bar: "bg-[color:var(--color-status-normal)]",
    pill: "bg-[#FBF0D4] text-[#8A6A13]",
  },
  "at-risk": {
    label: "Em risco",
    text: "text-[#B6333A]",
    bar: "bg-[color:var(--color-status-out)]",
    pill: "bg-[#FBE1E1] text-[#B6333A]",
  },
};

function formatValue(value: number, unit: string, goal: Goal): string {
  if (goal.metricKey === "sleepMinutes") {
    const h = Math.floor(value / 60);
    const m = Math.round(value % 60);
    return `${h}h${m.toString().padStart(2, "0")}`;
  }
  if (goal.metricKey === "steps") {
    return value.toLocaleString("pt-BR");
  }
  if (unit === "ml/kg/min") return value.toFixed(1);
  return String(value);
}

export function GoalCard({
  goal,
  progress,
  metrics,
}: {
  goal: Goal;
  progress: GoalProgress;
  metrics: DailyHealthMetrics[];
}) {
  const cfg = STATUS_MAP[progress.status];
  const last7 = metrics.slice(-7);

  // determina qual valor usar no mini-chart
  let series: { date: string; value: number }[];
  let chartTarget = goal.target;

  if (goal.metricKey === "zone2Weekly") {
    series = last7.map((m) => ({ date: m.date, value: m.zone2Minutes }));
    chartTarget = goal.target / 7; // diário pra facilitar visual
  } else if (goal.metricKey === "hrvBaseline") {
    series = last7.map((m) => ({ date: m.date, value: m.hrv }));
  } else if (goal.metricKey === "vo2max") {
    // VO2max não é diário — renderiza passos como contexto
    series = last7.map((m) => ({ date: m.date, value: m.steps / 100 }));
    chartTarget = 80;
  } else {
    const key = goal.metricKey as keyof DailyHealthMetrics;
    series = last7.map((m) => ({
      date: m.date,
      value: (m[key] as number) ?? 0,
    }));
  }

  const percent = Math.min(progress.percent, 100);
  const targetLabel = formatValue(goal.target, goal.unit, goal);
  const currentLabel = formatValue(progress.current, goal.unit, goal);

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[14px] font-semibold">{goal.label}</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-[0.1em] text-muted">
            Meta: {targetLabel} {goal.unit !== "passos" ? goal.unit : ""}
            <span className="ml-1 lowercase text-muted">
              · {goal.cadence === "weekly" ? "semanal" : "diária"}
            </span>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium",
            cfg.pill,
          )}
        >
          {cfg.label}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <div className={cn("text-[24px] font-semibold", cfg.text)}>
          {currentLabel}
        </div>
        <div className="text-[12px] text-muted">
          / {targetLabel} {goal.unit !== "passos" ? goal.unit : ""}
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-brand-100/70">
        <div
          className={cn("h-full rounded-full transition-all", cfg.bar)}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="pt-1">
        <SevenDayBar data={series} target={chartTarget} />
      </div>

      <p className="text-[12px] leading-snug text-muted">{goal.description}</p>
    </Card>
  );
}
