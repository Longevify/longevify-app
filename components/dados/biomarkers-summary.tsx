import { cn } from "@/lib/utils";

interface Stats {
  total: number;
  optimal: number;
  normal: number;
  out: number;
}

export function BiomarkersSummary({
  stats,
  className,
}: {
  stats: Stats;
  className?: string;
}) {
  const { total, optimal, normal, out } = stats;
  const safeTotal = total > 0 ? total : 1;
  const optPct = (optimal / safeTotal) * 100;
  const normPct = (normal / safeTotal) * 100;
  const outPct = (out / safeTotal) * 100;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <h2 className="text-[22px] font-semibold tracking-tight">
        Biomarcadores
      </h2>
      <div className="grid grid-cols-4 gap-3">
        <Stat value={total} label="Total" accent="text-ink" />
        <Stat
          value={optimal}
          label="Ótimo"
          accent="text-[color:var(--color-status-optimal)]"
        />
        <Stat
          value={normal}
          label="Normal"
          accent="text-[color:var(--color-status-normal)]"
        />
        <Stat
          value={out}
          label="Fora"
          accent="text-[color:var(--color-status-out)]"
        />
      </div>
      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-brand-100">
        <span
          className="h-full bg-[color:var(--color-status-optimal)]"
          style={{ width: `${optPct}%` }}
        />
        <span
          className="h-full bg-[color:var(--color-status-normal)]"
          style={{ width: `${normPct}%` }}
        />
        <span
          className="h-full bg-[color:var(--color-status-out)]"
          style={{ width: `${outPct}%` }}
        />
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className={cn("text-3xl font-bold leading-none", accent)}>
        {value}
      </span>
      <span className="mt-1.5 text-xs text-muted">{label}</span>
    </div>
  );
}
