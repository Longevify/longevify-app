import { BatteryCharging, Activity } from "lucide-react";
import type { RecoveryScore } from "@/lib/fitness/insights";
import { cn } from "@/lib/utils";

const TIER_LABEL = {
  low: "Baixa",
  fair: "Regular",
  good: "Boa",
  great: "Ótima",
} as const;

const TIER_COLOR = {
  low: { bg: "from-rose-500 to-rose-700", ring: "ring-rose-200", text: "text-rose-700" },
  fair: {
    bg: "from-amber-400 to-orange-500",
    ring: "ring-amber-200",
    text: "text-amber-800",
  },
  good: {
    bg: "from-emerald-500 to-emerald-700",
    ring: "ring-emerald-200",
    text: "text-emerald-700",
  },
  great: {
    bg: "from-brand-600 to-brand-800",
    ring: "ring-brand-200",
    text: "text-brand-800",
  },
} as const;

/**
 * Phase 3E — Recovery score card.
 *
 * Visual: barra circular + tier label + recommendation curto.
 */
export function RecoveryCard({ score }: { score: RecoveryScore }) {
  const tier = TIER_COLOR[score.tier];
  const circumference = 2 * Math.PI * 30;
  const offset = circumference - (score.score / 100) * circumference;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_2px_8px_-4px_rgba(13,40,24,.08)]">
      <div className={cn("h-1 w-full bg-gradient-to-r", tier.bg)} />
      <div className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          {/* Ring */}
          <div className="relative h-16 w-16 shrink-0">
            <svg
              viewBox="0 0 70 70"
              className="h-full w-full -rotate-90"
              aria-hidden
            >
              <circle
                cx="35"
                cy="35"
                r="30"
                fill="none"
                stroke="rgba(0,0,0,0.06)"
                strokeWidth="5"
              />
              <circle
                cx="35"
                cy="35"
                r="30"
                fill="none"
                stroke={`url(#grad-recovery-${score.tier})`}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
              <defs>
                <linearGradient
                  id={`grad-recovery-${score.tier}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  {score.tier === "great" && (
                    <>
                      <stop offset="0" stopColor="#2a7a53" />
                      <stop offset="1" stopColor="#123e2a" />
                    </>
                  )}
                  {score.tier === "good" && (
                    <>
                      <stop offset="0" stopColor="#10b981" />
                      <stop offset="1" stopColor="#047857" />
                    </>
                  )}
                  {score.tier === "fair" && (
                    <>
                      <stop offset="0" stopColor="#fbbf24" />
                      <stop offset="1" stopColor="#f97316" />
                    </>
                  )}
                  {score.tier === "low" && (
                    <>
                      <stop offset="0" stopColor="#f43f5e" />
                      <stop offset="1" stopColor="#be123c" />
                    </>
                  )}
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[18px] font-semibold tabular-nums text-zinc-900">
                {score.score}
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              <BatteryCharging className="-mt-0.5 mr-1 inline h-3 w-3" />
              Recuperação
            </div>
            <div className={cn("mt-0.5 text-[16px] font-semibold leading-tight", tier.text)}>
              {TIER_LABEL[score.tier]}
            </div>
            <p className="mt-0.5 text-[10.5px] text-zinc-500 tabular-nums">
              Streak: {score.streakDays}d · descansou{" "}
              {score.daysSinceLastWorkout} dia
              {score.daysSinceLastWorkout === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <p className="mt-3 rounded-lg bg-zinc-50/80 px-3 py-2 text-[11.5px] leading-relaxed text-zinc-700">
          <Activity className="-mt-0.5 mr-1 inline h-3 w-3 text-zinc-500" />
          {score.recommendation}
        </p>
        <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-500 tabular-nums">
          <span>
            Carga semana:{" "}
            <strong className="text-zinc-700">{score.thisWeekLoad}</strong>
          </span>
          <span>·</span>
          <span>
            Média 4sem:{" "}
            <strong className="text-zinc-700">{score.avgWeeklyLoad}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
