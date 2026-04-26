import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: {
    value: string;
    trend: "up" | "down" | "flat";
  };
  icon?: ReactNode;
  hint?: string;
  tone?: "default" | "warn" | "danger";
}

export function StatCard({
  label,
  value,
  delta,
  icon,
  hint,
  tone = "default",
}: StatCardProps) {
  const toneCls =
    tone === "danger"
      ? "bg-[#FBE1E1]/60 border-[#F3C8C8]"
      : tone === "warn"
        ? "bg-[#FBF0D4]/60 border-[#EFDFAF]"
        : "bg-surface";
  return (
    <Card className={cn("flex flex-col gap-3 p-5", toneCls)}>
      <div className="flex items-start justify-between">
        <span className="text-[12px] font-medium uppercase tracking-wider text-muted">
          {label}
        </span>
        {icon ? (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-brand-700">
            {icon}
          </span>
        ) : null}
      </div>
      <div className="text-[32px] font-semibold leading-none tracking-tight">
        {value}
      </div>
      <div className="flex items-center justify-between text-[12px]">
        {delta ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
              delta.trend === "up" && "bg-[#DFF5E9] text-[#0E7B45]",
              delta.trend === "down" && "bg-[#FBE1E1] text-[#B6333A]",
              delta.trend === "flat" && "bg-[#EEF2F0] text-muted",
            )}
          >
            {delta.trend === "up" ? "↑" : delta.trend === "down" ? "↓" : "–"}{" "}
            {delta.value}
          </span>
        ) : (
          <span />
        )}
        {hint ? <span className="text-muted">{hint}</span> : null}
      </div>
    </Card>
  );
}
