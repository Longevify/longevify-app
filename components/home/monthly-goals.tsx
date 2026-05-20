"use client";

import { Trophy, TrendingUp, Target, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lucas (2026-05-20): "tenha metas para o mês e evolução geral, tem
 * que ser bem gameficado, o cara tem que gostar de usar o app para
 * ver que ta melhorando."
 *
 * Card de gameficação mensal — 4 métricas que viram "missões":
 *
 * 1. Score do mês: melhorou X pontos / meta Y
 * 2. Biomarcadores melhorados: N do total
 * 3. Streak de tasks: D dias seguidos completando ao menos 1 task
 * 4. Idade biológica: rejuvenesceu X anos (se diff > 0)
 *
 * Visual: cards horizontais com progress bar circular + valor central
 * + trophy quando 100%.
 */

interface MonthlyGoalsProps {
  scoreNow: number;
  scoreLastMonth: number;
  biomarkersOptimal: number;
  biomarkersTotal: number;
  streakDays: number;
  biologicalAgeDelta: number; // chronologicalAge - biologicalAge
  className?: string;
}

interface Mission {
  id: string;
  label: string;
  value: string;
  hint: string;
  progressPct: number;
  icon: typeof Trophy;
  color: string;
  ringColor: string;
  /** Quando atingiu meta (100%), card ganha glow especial. */
  achieved: boolean;
}

export function MonthlyGoals({
  scoreNow,
  scoreLastMonth,
  biomarkersOptimal,
  biomarkersTotal,
  streakDays,
  biologicalAgeDelta,
  className,
}: MonthlyGoalsProps) {
  const scoreDelta = scoreNow - scoreLastMonth;
  const SCORE_TARGET = 5; // melhoria mensal alvo
  const STREAK_TARGET = 30;

  const missions: Mission[] = [
    {
      id: "score",
      label: "Score do mês",
      value: scoreDelta >= 0 ? `+${scoreDelta}` : `${scoreDelta}`,
      hint: scoreDelta >= 0 ? "vs mês passado" : "perdeu pontos",
      progressPct: Math.max(
        0,
        Math.min(100, Math.round((scoreDelta / SCORE_TARGET) * 100)),
      ),
      icon: TrendingUp,
      color: "from-emerald-400 to-emerald-600",
      ringColor: "text-emerald-500",
      achieved: scoreDelta >= SCORE_TARGET,
    },
    {
      id: "biomarkers",
      label: "Biomarcadores ótimos",
      value: `${biomarkersOptimal}`,
      hint: `de ${biomarkersTotal}`,
      progressPct:
        biomarkersTotal > 0
          ? Math.round((biomarkersOptimal / biomarkersTotal) * 100)
          : 0,
      icon: Target,
      color: "from-brand-400 to-brand-600",
      ringColor: "text-brand-500",
      achieved:
        biomarkersTotal > 0 &&
        biomarkersOptimal / biomarkersTotal >= 0.8,
    },
    {
      id: "streak",
      label: "Sequência",
      value: `${streakDays}d`,
      hint: streakDays === 1 ? "dia" : "dias seguidos",
      progressPct: Math.min(
        100,
        Math.round((streakDays / STREAK_TARGET) * 100),
      ),
      icon: Flame,
      color: "from-orange-400 to-rose-500",
      ringColor: "text-orange-500",
      achieved: streakDays >= STREAK_TARGET,
    },
    {
      id: "bio-age",
      label: "Rejuvenescimento",
      value:
        biologicalAgeDelta > 0
          ? `-${biologicalAgeDelta.toFixed(1)}a`
          : biologicalAgeDelta < 0
            ? `+${Math.abs(biologicalAgeDelta).toFixed(1)}a`
            : "igual",
      hint:
        biologicalAgeDelta > 0
          ? "vs idade real"
          : biologicalAgeDelta < 0
            ? "acima da real"
            : "neutro",
      progressPct: Math.max(
        0,
        Math.min(100, Math.round((biologicalAgeDelta / 5) * 100)),
      ),
      icon: Trophy,
      color: "from-amber-400 to-amber-600",
      ringColor: "text-amber-500",
      achieved: biologicalAgeDelta >= 3,
    },
  ];

  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="inline-flex items-center gap-1.5 text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          Metas do mês
        </h2>
        <span className="text-[11px] text-zinc-500">
          {missions.filter((m) => m.achieved).length}/{missions.length} alcançadas
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {missions.map((m) => (
          <MissionCard key={m.id} mission={m} />
        ))}
      </div>
    </section>
  );
}

function MissionCard({ mission }: { mission: Mission }) {
  const Icon = mission.icon;
  // SVG circle math: r=18, circumference = 2πr ≈ 113.1
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (mission.progressPct / 100) * circ;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white p-4 transition",
        mission.achieved
          ? "border-amber-200 bg-gradient-to-br from-amber-50/60 via-white to-white shadow-[0_8px_24px_-12px_rgba(245,158,11,.3)]"
          : "border-zinc-200/80 shadow-[0_4px_16px_-10px_rgba(13,40,24,.1)]",
      )}
    >
      {/* Glow decorativo quando achieved */}
      {mission.achieved && (
        <span className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-300/30 blur-2xl" />
      )}

      <div className="relative flex items-center gap-3">
        {/* Anel de progresso SVG */}
        <div className="relative shrink-0">
          <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
            <circle
              cx="24"
              cy="24"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-zinc-100"
            />
            <circle
              cx="24"
              cy="24"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              className={cn(
                "transition-[stroke-dashoffset] duration-1000",
                mission.ringColor,
              )}
            />
          </svg>
          <span
            className={cn(
              "absolute inset-0 grid place-items-center",
              mission.ringColor,
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {mission.label}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[18px] font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">
              {mission.value}
            </span>
          </div>
          <div className="mt-0.5 text-[10.5px] text-zinc-500">
            {mission.hint}
          </div>
        </div>
      </div>
    </div>
  );
}
