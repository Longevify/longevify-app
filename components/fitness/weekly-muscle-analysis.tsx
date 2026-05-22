import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { type MuscleGroup, MUSCLE_GROUP_LABEL, MUSCLE_GROUP_EMOJI } from "@/lib/fitness/types";

/**
 * Lucas (2026-05-21): "fazendo análises semanais, mostrando qual foi o
 * musculo que mais evoluiu com base na carga e repetição."
 *
 * Card que aparece no /fitness/musculacao quando user tem histórico de
 * pelo menos uma semana. Mostra:
 *  - Top do ranking: músculo que MAIS evoluiu vs semana anterior (delta %)
 *  - Lista compacta de todos os grupos com volume desta semana + delta
 *  - Visual gameficado (medalha 🥇, sparkle, cores)
 */

interface MuscleGroupRow {
  muscleGroup: string;
  thisWeekVolume: number;
  lastWeekVolume: number;
  thisWeekSets: number;
  deltaPct: number;
}

interface WeeklyMuscleAnalysisProps {
  data: MuscleGroupRow[];
}

export function WeeklyMuscleAnalysis({ data }: WeeklyMuscleAnalysisProps) {
  if (data.length === 0) return null;

  // Top mover: grupo com maior delta % positivo (mas com volume > 0)
  // Fallback: o que tem maior volume desta semana
  const activeRows = data.filter((r) => r.thisWeekVolume > 0);
  if (activeRows.length === 0) return null;

  const sortedByDelta = [...activeRows].sort((a, b) => b.deltaPct - a.deltaPct);
  const topMover = sortedByDelta[0];

  return (
    <section className="mb-5 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_4px_20px_-12px_rgba(13,40,24,.08)]">
      {/* Hero header — destaca o "campeão da semana" */}
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-brand-50/60 to-white px-5 py-5">
        <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-200/40 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
            <span className="text-[22px]">🥇</span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-amber-800">
              <Sparkles className="h-3 w-3" />
              Músculo que mais evoluiu (7d)
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-[18px]">
                {MUSCLE_GROUP_EMOJI[topMover.muscleGroup as MuscleGroup] ?? "💪"}
              </span>
              <h3 className="text-[17px] font-semibold tracking-tight text-zinc-900">
                {MUSCLE_GROUP_LABEL[topMover.muscleGroup as MuscleGroup] ??
                  topMover.muscleGroup}
              </h3>
              <span
                className={cn(
                  "ml-auto inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                  topMover.deltaPct > 0
                    ? "bg-emerald-100 text-emerald-800"
                    : topMover.deltaPct < 0
                      ? "bg-rose-100 text-rose-800"
                      : "bg-zinc-100 text-zinc-700",
                )}
              >
                {topMover.deltaPct > 0 ? <TrendingUp className="h-3 w-3" /> : null}
                {topMover.deltaPct < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                {topMover.deltaPct >= 0 ? "+" : ""}
                {topMover.deltaPct}%
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Lista de grupos com volume + delta */}
      <ul className="divide-y divide-zinc-100">
        {sortedByDelta.map((row) => {
          const trendIcon =
            row.deltaPct > 5 ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            ) : row.deltaPct < -5 ? (
              <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-zinc-400" />
            );
          const mg = row.muscleGroup as MuscleGroup;
          return (
            <li
              key={row.muscleGroup}
              className="flex items-center gap-3 px-5 py-2.5"
            >
              <span className="text-[16px]">
                {MUSCLE_GROUP_EMOJI[mg] ?? "💪"}
              </span>
              <span className="min-w-0 flex-1 text-[13px] font-medium text-zinc-800">
                {MUSCLE_GROUP_LABEL[mg] ?? row.muscleGroup}
              </span>
              <span className="text-[11.5px] tabular-nums text-zinc-500">
                {Math.round(row.thisWeekVolume).toLocaleString("pt-BR")} kg ·{" "}
                {row.thisWeekSets} sets
              </span>
              <span className="inline-flex items-center gap-0.5 w-[60px] justify-end text-[11.5px] font-semibold tabular-nums">
                {trendIcon}
                <span
                  className={cn(
                    row.deltaPct > 5
                      ? "text-emerald-700"
                      : row.deltaPct < -5
                        ? "text-rose-700"
                        : "text-zinc-500",
                  )}
                >
                  {row.deltaPct >= 0 ? "+" : ""}
                  {row.deltaPct}%
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <footer className="border-t border-zinc-100 bg-zinc-50/50 px-5 py-2.5 text-[10.5px] text-zinc-500">
        Volume = peso × reps · comparação 7d vs 7d anteriores
      </footer>
    </section>
  );
}
