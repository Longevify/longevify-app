"use client";

import {
  computeGoalProgress,
  type DailyHealthMetrics,
  GOALS,
} from "@/lib/wearables-mock";
import { GoalCard } from "./goal-card";

export function GoalsDashboard({
  metrics,
}: {
  metrics: DailyHealthMetrics[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {GOALS.map((goal) => {
        const progress = computeGoalProgress(metrics, goal);
        return (
          <GoalCard
            key={goal.id}
            goal={goal}
            progress={progress}
            metrics={metrics}
          />
        );
      })}
    </div>
  );
}
