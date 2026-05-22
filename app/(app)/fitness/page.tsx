import Link from "next/link";
import {
  Dumbbell,
  Footprints,
  Activity,
  Flame,
  TrendingUp,
  Trophy,
  Calendar,
  ArrowRight,
  Target,
} from "lucide-react";
import {
  getActivityHeatmap,
  getFitnessOverview,
  getRecentPersonalRecords,
  computeStreak,
} from "@/lib/fitness/dashboard";
import { getActiveWorkoutProgram } from "@/lib/fitness/server";
import { ActivityHeatmap } from "@/components/fitness/activity-heatmap";
import { MUSCLE_GROUP_LABEL, MUSCLE_GROUP_EMOJI, type MuscleGroup } from "@/lib/fitness/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Lucas (2026-05-22 madrugada): "torne essa aba do app perfeita"
 *
 * Dashboard unificado da feature Fitness, mostrando:
 *  - Streak counter (dias seguidos treinando)
 *  - Heatmap 90 dias estilo GitHub
 *  - Stats agregadas: semana / mês / ano
 *  - Distribuição entre tipos (musculação/corrida/outros)
 *  - Top 5 PRs recentes
 *  - Programa ativo (se houver) com link pro detail
 *  - Quick links pras sub-abas
 *
 * Substitui o redirect anterior que mandava direto pra musculação.
 */
export default async function FitnessIndex() {
  const [heatmap, overview, records, program] = await Promise.all([
    getActivityHeatmap(90),
    getFitnessOverview(),
    getRecentPersonalRecords(5),
    getActiveWorkoutProgram(),
  ]);

  const streak = computeStreak(heatmap);
  const breakdownTotal =
    overview.breakdown.strength +
    overview.breakdown.running +
    overview.breakdown.other;

  return (
    <div className="flex flex-col gap-5">
      {/* Hero: Streak + ano */}
      <section className="overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 text-white shadow-md">
        <div className="px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <Flame className="h-7 w-7 text-orange-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Streak atual
              </div>
              <div className="mt-1 text-[36px] font-semibold leading-none tracking-tight tabular-nums">
                {streak.current}
                <span className="ml-2 text-[16px] font-medium text-white/70">
                  dia{streak.current === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-1.5 text-[11.5px] text-white/70">
                Recorde pessoal: {streak.longest} dias · {overview.thisYear.workouts}{" "}
                treinos em {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Heatmap */}
      <ActivityHeatmap days={heatmap} totalDays={90} />

      {/* Stats grid: week / month / year */}
      <section className="grid grid-cols-3 gap-3">
        <PeriodStatCard
          label="Esta semana"
          workouts={overview.thisWeek.workouts}
          volume={overview.thisWeek.strengthVolume}
          km={overview.thisWeek.runningKm}
          min={overview.thisWeek.otherMinutes}
        />
        <PeriodStatCard
          label="Este mês"
          workouts={overview.thisMonth.workouts}
          volume={overview.thisMonth.strengthVolume}
          km={overview.thisMonth.runningKm}
          min={overview.thisMonth.otherMinutes}
          highlight
        />
        <PeriodStatCard
          label="Este ano"
          workouts={overview.thisYear.workouts}
          volume={overview.thisYear.strengthVolume}
          km={overview.thisYear.runningKm}
          min={overview.thisYear.otherMinutes}
        />
      </section>

      {/* Distribuição: barra horizontal stacked */}
      {breakdownTotal > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-3.5">
          <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <Activity className="h-3 w-3" />
            Distribuição (este mês)
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-zinc-100">
            {overview.breakdown.strength > 0 && (
              <span
                className="bg-brand-700"
                style={{
                  width: `${(overview.breakdown.strength / breakdownTotal) * 100}%`,
                }}
                title={`Musculação: ${overview.breakdown.strength}min`}
              />
            )}
            {overview.breakdown.running > 0 && (
              <span
                className="bg-orange-500"
                style={{
                  width: `${(overview.breakdown.running / breakdownTotal) * 100}%`,
                }}
                title={`Corrida: ${overview.breakdown.running}min`}
              />
            )}
            {overview.breakdown.other > 0 && (
              <span
                className="bg-sky-500"
                style={{
                  width: `${(overview.breakdown.other / breakdownTotal) * 100}%`,
                }}
                title={`Outros: ${overview.breakdown.other}min`}
              />
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            <Legend
              color="bg-brand-700"
              label="Musculação"
              value={`${Math.round(overview.breakdown.strength)}min`}
            />
            <Legend
              color="bg-orange-500"
              label="Corrida"
              value={`${Math.round(overview.breakdown.running)}min`}
            />
            <Legend
              color="bg-sky-500"
              label="Outros"
              value={`${Math.round(overview.breakdown.other)}min`}
            />
          </div>
        </section>
      )}

      {/* Programa ativo */}
      {program && (
        <Link
          href="/fitness/musculacao/programa"
          className="group block overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white transition hover:shadow-md"
        >
          <div className="flex items-center gap-4 px-5 py-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 text-white shadow-sm">
              <Target className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-800">
                Programa ativo
              </div>
              <div className="mt-0.5 truncate text-[15px] font-semibold leading-tight text-zinc-900">
                {program.name}
              </div>
              <p className="mt-0.5 text-[11.5px] text-zinc-500">
                {program.frequencyPerWeek}x/semana · {program.structure.days.length} treinos no split
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-brand-700 transition group-hover:translate-x-0.5" />
          </div>
        </Link>
      )}

      {/* Top PRs (records) */}
      {records.length > 0 && (
        <section>
          <div className="mb-2 flex items-end justify-between">
            <h3 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              <Trophy className="h-3 w-3 text-amber-600" />
              PRs recentes (90 dias)
            </h3>
            <Link
              href="/fitness/records"
              className="text-[11px] font-medium text-brand-700 hover:text-brand-800"
            >
              Ver todos →
            </Link>
          </div>
          <ul className="flex flex-col gap-1.5">
            {records.map((r, i) => (
              <li
                key={r.exerciseId}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-50 text-[12px] font-bold text-amber-700">
                  {i + 1}
                </span>
                <span className="text-[18px]" aria-hidden>
                  {MUSCLE_GROUP_EMOJI[r.muscleGroup as MuscleGroup] ?? "💪"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-zinc-900">
                    {r.exerciseName}
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-zinc-500">
                    {MUSCLE_GROUP_LABEL[r.muscleGroup as MuscleGroup] ??
                      r.muscleGroup}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[14px] font-semibold tabular-nums text-zinc-900">
                    {r.weightKg ? `${r.weightKg}kg` : "BW"} × {r.reps}
                  </div>
                  <div className="text-[9.5px] text-zinc-400 tabular-nums">
                    {new Date(r.sessionDate + "T00:00").toLocaleDateString(
                      "pt-BR",
                      { day: "2-digit", month: "short" },
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Quick links pras sub-abas */}
      <section className="grid grid-cols-3 gap-2.5">
        <QuickLink
          href="/fitness/musculacao"
          icon={<Dumbbell className="h-5 w-5" />}
          label="Musculação"
          accent="bg-brand-50 text-brand-700"
        />
        <QuickLink
          href="/fitness/corrida"
          icon={<Footprints className="h-5 w-5" />}
          label="Corrida"
          accent="bg-orange-50 text-orange-700"
        />
        <QuickLink
          href="/fitness/outros"
          icon={<Activity className="h-5 w-5" />}
          label="Outros"
          accent="bg-sky-50 text-sky-700"
        />
      </section>

      {overview.thisYear.workouts === 0 && (
        <section className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-8 text-center">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
          <h3 className="text-[14px] font-semibold text-zinc-700">
            Pronto pra começar?
          </h3>
          <p className="mt-1 text-[12px] text-zinc-500">
            Logue seu primeiro treino numa das abas abaixo e a gente começa a
            trackear sua jornada.
          </p>
        </section>
      )}
    </div>
  );
}

function PeriodStatCard({
  label,
  workouts,
  volume,
  km,
  min,
  highlight = false,
}: {
  label: string;
  workouts: number;
  volume: number;
  km: number;
  min: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-3 shadow-[0_2px_8px_-4px_rgba(13,40,24,.08)]",
        highlight
          ? "border-brand-200 bg-brand-50/50"
          : "border-zinc-200 bg-white",
      )}
    >
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-[18px] font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">
        {workouts}
      </div>
      <div className="mt-0.5 text-[9px] text-zinc-400">
        treino{workouts === 1 ? "" : "s"}
      </div>
      <div className="mt-2 flex flex-col gap-0.5 text-[10px] text-zinc-500">
        {volume > 0 && (
          <span className="tabular-nums">
            🏋️ {Math.round(volume).toLocaleString("pt-BR")}kg
          </span>
        )}
        {km > 0 && <span className="tabular-nums">🏃 {km.toFixed(1)}km</span>}
        {min > 0 && <span className="tabular-nums">⏱️ {min}min</span>}
        {workouts === 0 && <span className="text-zinc-400">—</span>}
      </div>
    </div>
  );
}

function Legend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-zinc-600">
      <span className={cn("h-2 w-2 rounded-full", color)} aria-hidden />
      <span className="font-medium">{label}</span>
      <span className="text-zinc-400 tabular-nums">{value}</span>
    </span>
  );
}

function QuickLink({
  href,
  icon,
  label,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-4 transition hover:border-brand-300 hover:shadow-sm"
    >
      <span
        className={cn(
          "grid h-10 w-10 place-items-center rounded-xl transition group-hover:scale-105",
          accent,
        )}
      >
        {icon}
      </span>
      <span className="text-[12px] font-semibold text-zinc-800">{label}</span>
    </Link>
  );
}
