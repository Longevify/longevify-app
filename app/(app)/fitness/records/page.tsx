import Link from "next/link";
import { ArrowLeft, Trophy, Footprints, Clock } from "lucide-react";
import { getRecentPersonalRecords } from "@/lib/fitness/dashboard";
import { getRunningHistory, getOtherWorkouts } from "@/lib/fitness/server";
import {
  MUSCLE_GROUP_LABEL,
  MUSCLE_GROUP_EMOJI,
  ACTIVITY_LABEL,
  ACTIVITY_EMOJI,
  type MuscleGroup,
} from "@/lib/fitness/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Records pessoais agregados — strength PRs + corridas mais longas/rápidas
 * + atividades de maior duração.
 *
 * Mostra TODOS PRs (não só top 5 do dashboard) categorizados.
 */
export default async function RecordsPage() {
  const [strengthRecords, runs, others] = await Promise.all([
    getRecentPersonalRecords(50),
    getRunningHistory(100),
    getOtherWorkouts(100),
  ]);

  // Longest e fastest run
  const longestRun = runs.reduce<typeof runs[0] | null>((acc, r) => {
    if (!r.distanceKm) return acc;
    if (!acc || (acc.distanceKm ?? 0) < r.distanceKm) return r;
    return acc;
  }, null);
  const fastestRun = runs.reduce<typeof runs[0] | null>((acc, r) => {
    if (!r.avgPaceSecondsPerKm || r.avgPaceSecondsPerKm <= 0) return acc;
    if (!acc || (acc.avgPaceSecondsPerKm ?? Infinity) > r.avgPaceSecondsPerKm)
      return r;
    return acc;
  }, null);

  // Longest other workout per type
  const otherBestByType = new Map<string, typeof others[0]>();
  for (const o of others) {
    const cur = otherBestByType.get(o.activityType);
    if (!cur || cur.durationMinutes < o.durationMinutes) {
      otherBestByType.set(o.activityType, o);
    }
  }

  function fmtPace(secs: number | null | undefined): string {
    if (!secs || secs <= 0) return "—";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, "0")}/km`;
  }

  function fmtDuration(secs: number | null | undefined): string {
    if (!secs) return "—";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0)
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  return (
    <div className="pb-12">
      <Link
        href="/fitness"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-500 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </Link>

      <header className="mb-5">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
          <Trophy className="h-3 w-3" />
          Records pessoais
        </div>
        <h2 className="mt-1 text-[24px] font-semibold leading-tight text-zinc-900">
          Seus melhores resultados
        </h2>
        <p className="mt-1 text-[13px] text-zinc-500">
          Cada um dos seus PRs (personal records) num só lugar.
        </p>
      </header>

      {/* Corrida highlights */}
      {(longestRun || fastestRun) && (
        <section className="mb-5">
          <h3 className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <Footprints className="h-3 w-3" />
            Corrida
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {longestRun && (
              <div className="rounded-2xl border border-orange-200 bg-orange-50/60 px-4 py-3.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-orange-700">
                  Mais longa
                </div>
                <div className="mt-1 text-[22px] font-semibold tabular-nums text-zinc-900">
                  {(longestRun.distanceKm ?? 0).toFixed(2)} km
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-600 tabular-nums">
                  {fmtDuration(longestRun.durationSeconds)} · pace{" "}
                  {fmtPace(longestRun.avgPaceSecondsPerKm)}
                </div>
                {longestRun.sessionDate && (
                  <div className="mt-0.5 text-[10px] text-orange-700/70 tabular-nums">
                    {new Date(longestRun.sessionDate + "T00:00").toLocaleDateString(
                      "pt-BR",
                      { day: "2-digit", month: "short", year: "numeric" },
                    )}
                  </div>
                )}
              </div>
            )}
            {fastestRun && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                  Melhor pace
                </div>
                <div className="mt-1 text-[22px] font-semibold tabular-nums text-zinc-900">
                  {fmtPace(fastestRun.avgPaceSecondsPerKm)}
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-600 tabular-nums">
                  {(fastestRun.distanceKm ?? 0).toFixed(2)} km ·{" "}
                  {fmtDuration(fastestRun.durationSeconds)}
                </div>
                {fastestRun.sessionDate && (
                  <div className="mt-0.5 text-[10px] text-emerald-700/70 tabular-nums">
                    {new Date(fastestRun.sessionDate + "T00:00").toLocaleDateString(
                      "pt-BR",
                      { day: "2-digit", month: "short", year: "numeric" },
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Strength PRs */}
      {strengthRecords.length > 0 && (
        <section className="mb-5">
          <h3 className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            🏋️ Musculação
          </h3>
          <ul className="flex flex-col gap-1.5">
            {strengthRecords.map((r, i) => (
              <li
                key={r.exerciseId}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-50 text-[11px] font-bold text-amber-700 tabular-nums">
                  {i + 1}
                </span>
                <span className="text-[18px]" aria-hidden>
                  {MUSCLE_GROUP_EMOJI[r.muscleGroup as MuscleGroup] ?? "💪"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-zinc-900">
                    {r.exerciseName}
                  </div>
                  <div className="text-[10.5px] text-zinc-500">
                    {MUSCLE_GROUP_LABEL[r.muscleGroup as MuscleGroup] ??
                      r.muscleGroup}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[14px] font-semibold tabular-nums text-zinc-900">
                    {r.weightKg ? `${r.weightKg}kg` : "BW"} × {r.reps}
                  </div>
                  <div className="text-[9.5px] text-zinc-400 tabular-nums">
                    {new Date(r.sessionDate + "T00:00").toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Other activities */}
      {otherBestByType.size > 0 && (
        <section>
          <h3 className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <Clock className="h-3 w-3" />
            Outras atividades (mais longas)
          </h3>
          <ul className="flex flex-col gap-1.5">
            {Array.from(otherBestByType.values())
              .sort((a, b) => b.durationMinutes - a.durationMinutes)
              .map((o) => (
                <li
                  key={o.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
                >
                  <span className="text-[18px]" aria-hidden>
                    {ACTIVITY_EMOJI[o.activityType]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-zinc-900">
                      {ACTIVITY_LABEL[o.activityType]}
                    </div>
                    <div className="text-[10.5px] text-zinc-500">
                      {o.distanceKm
                        ? `${o.distanceKm.toFixed(1)}km · ${o.intensity}`
                        : `${o.intensity}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-semibold tabular-nums text-zinc-900">
                      {o.durationMinutes}min
                    </div>
                    {o.sessionDate && (
                      <div className="text-[9.5px] text-zinc-400 tabular-nums">
                        {new Date(o.sessionDate + "T00:00").toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "short" },
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </section>
      )}

      {strengthRecords.length === 0 &&
        !longestRun &&
        otherBestByType.size === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-10 text-center">
            <Trophy className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
            <h3 className="text-[14px] font-semibold text-zinc-700">
              Sem PRs ainda
            </h3>
            <p className="mt-1 text-[12px] text-zinc-500">
              Quando você logar treinos, os recordes aparecem aqui automaticamente.
            </p>
          </div>
        )}
    </div>
  );
}
