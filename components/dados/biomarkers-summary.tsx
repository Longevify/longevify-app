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
  const optPct = (optimal / total) * 100;
  const normPct = (normal / total) * 100;
  const outPct = (out / total) * 100;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-end justify-between gap-6">
        <h2 className="text-[22px] font-semibold tracking-tight">
          Biomarcadores
        </h2>
        <div className="flex items-center gap-5 text-[12px]">
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
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
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
    <div className="flex items-baseline gap-1.5">
      <span className={cn("text-[15px] font-semibold", accent)}>{value}</span>
      <span className="text-muted">{label}</span>
    </div>
  );
}
