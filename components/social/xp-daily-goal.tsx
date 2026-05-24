"use client";

import { cn } from "@/lib/utils";
import { Zap, Trophy } from "lucide-react";

/**
 * Duolingo-style daily XP goal — barra de progresso visual + mascote
 * 🎯 ou 🏆 quando bate a meta. Lucas (2026-05-24): "copie bastante o
 * esquema de gameficação do duolingo. Quero que o indivíduo tenha
 * inúmeros motivos para entrar no app todos os dias."
 */
export function XpDailyGoal({
  xpToday,
  goal,
}: {
  xpToday: number;
  goal: number;
}) {
  const pct = Math.min(100, Math.round((xpToday / goal) * 100));
  const reached = xpToday >= goal;
  const remaining = Math.max(0, goal - xpToday);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <Zap className="h-3 w-3 text-amber-500" />
            Meta diária de XP
          </h3>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-[32px] font-bold leading-none tracking-tight tabular-nums",
                reached ? "text-emerald-700" : "text-zinc-900",
              )}
            >
              {xpToday}
            </span>
            <span className="text-[14px] font-medium text-zinc-500">
              / {goal} XP
            </span>
          </div>
        </div>
        <div
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-[24px]",
            reached
              ? "bg-emerald-100 ring-2 ring-emerald-300"
              : "bg-amber-50 ring-1 ring-amber-200",
          )}
        >
          {reached ? <Trophy className="h-5 w-5 text-emerald-700" /> : "🎯"}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-100">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-[width] duration-700",
            reached
              ? "from-emerald-400 to-emerald-600"
              : "from-amber-400 to-orange-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-[11.5px] text-zinc-500">
        {reached ? (
          <span className="font-semibold text-emerald-700">
            🎉 Meta batida! Volte amanhã pra continuar o streak.
          </span>
        ) : (
          <>
            <span className="font-semibold text-zinc-700">
              {remaining} XP
            </span>{" "}
            até bater a meta. Ganhe XP marcando tasks, treinos, refeições e
            sono.
          </>
        )}
      </p>
    </section>
  );
}
