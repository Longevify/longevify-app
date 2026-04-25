"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  computeGoalProgress,
  DAILY_METRICS,
  GOALS,
  type GoalProgress,
} from "@/lib/wearables-mock";

const STATUS_PILL: Record<GoalProgress["status"], string> = {
  "on-track": "bg-[#DFF5E9] text-[#0E7B45]",
  attention: "bg-[#FBF0D4] text-[#8A6A13]",
  "at-risk": "bg-[#FBE1E1] text-[#B6333A]",
};

const STATUS_LABEL: Record<GoalProgress["status"], string> = {
  "on-track": "No ritmo",
  attention: "Atenção",
  "at-risk": "Em risco",
};

function formatShort(current: number, goalId: string): string {
  if (goalId === "sleep-daily") {
    const h = Math.floor(current / 60);
    const m = Math.round(current % 60);
    return `${h}h${m.toString().padStart(2, "0")}`;
  }
  if (goalId === "steps-daily") return current.toLocaleString("pt-BR");
  if (goalId === "vo2max") return current.toFixed(1);
  return String(current);
}

export function GoalsSummary() {
  const goals = GOALS.slice(0, 4).map((g) => ({
    goal: g,
    progress: computeGoalProgress(DAILY_METRICS, g),
  }));

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
          Seu progresso
        </div>
        <Link
          href="/wearables"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-900"
        >
          Ver wearables <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {goals.map(({ goal, progress }) => (
          <div
            key={goal.id}
            className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-b-0 last:pb-0"
          >
            <div className="min-w-0">
              <div className="truncate text-[14px] font-medium">
                {goal.label}
              </div>
              <div className="text-[12px] text-muted">
                {formatShort(progress.current, goal.id)} /{" "}
                {formatShort(goal.target, goal.id)} {goal.unit}
              </div>
            </div>
            <span
              className={cn(
                "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[11px] font-medium",
                STATUS_PILL[progress.status],
              )}
            >
              {STATUS_LABEL[progress.status]}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
