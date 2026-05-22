import { Heart, Info } from "lucide-react";
import type { Vo2MaxEstimate } from "@/lib/fitness/insights";
import { cn } from "@/lib/utils";

const TIER_LABEL = {
  low: "Baixo",
  fair: "Regular",
  good: "Bom",
  excellent: "Excelente",
  elite: "Elite",
} as const;

const TIER_COLOR = {
  low: "from-rose-500 to-rose-700",
  fair: "from-amber-400 to-orange-500",
  good: "from-emerald-500 to-emerald-700",
  excellent: "from-sky-500 to-sky-700",
  elite: "from-purple-500 to-purple-700",
} as const;

/**
 * Phase 3E — Card de VO2max estimado.
 */
export function Vo2MaxCard({ estimate }: { estimate: Vo2MaxEstimate }) {
  function fmtPace(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, "0")}/km`;
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_2px_8px_-4px_rgba(13,40,24,.08)]">
      <div
        className={cn(
          "h-1 w-full bg-gradient-to-r",
          TIER_COLOR[estimate.tier],
        )}
      />
      <div className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm",
              TIER_COLOR[estimate.tier],
            )}
          >
            <Heart className="h-4 w-4 fill-white" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              VO₂max estimado
            </div>
            <div className="mt-0.5 text-[22px] font-semibold leading-none tabular-nums text-zinc-900">
              {estimate.value}
              <span className="ml-1 text-[12px] font-medium text-zinc-500">
                ml/kg/min
              </span>
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-zinc-600">
              {TIER_LABEL[estimate.tier]}
            </p>
          </div>
        </div>
        <p className="mt-2 text-[10.5px] text-zinc-500">
          Baseado em corrida de{" "}
          <strong className="text-zinc-700 tabular-nums">
            {estimate.basedOn.distanceKm.toFixed(1)}km
          </strong>{" "}
          @{" "}
          <strong className="text-zinc-700 tabular-nums">
            {fmtPace(estimate.basedOn.paceSecondsPerKm)}
          </strong>
        </p>
        <div className="mt-2 inline-flex items-start gap-1 rounded-md bg-zinc-50 px-2 py-1 text-[9.5px] text-zinc-500">
          <Info className="mt-0.5 h-2.5 w-2.5 shrink-0" />
          <span>
            Estimativa atlética (não médica). Pra precisão, faça teste em
            laboratório.
          </span>
        </div>
      </div>
    </div>
  );
}
