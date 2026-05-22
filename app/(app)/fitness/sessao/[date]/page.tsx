import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Dumbbell, TrendingUp } from "lucide-react";
import { getStrengthSessionByDate } from "@/lib/fitness/server";
import {
  MUSCLE_GROUP_LABEL,
  MUSCLE_GROUP_EMOJI,
  type MuscleGroup,
} from "@/lib/fitness/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Phase 3L — Detail de uma sessão de musculação de data específica.
 * Acessada via click num quadradinho do heatmap em /fitness.
 */
export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  // Valida formato YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const session = await getStrengthSessionByDate(date);
  if (!session) {
    return (
      <div className="pb-12">
        <Link
          href="/fitness"
          className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-500 transition hover:text-brand-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </Link>
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-10 text-center">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
          <h3 className="text-[14px] font-semibold text-zinc-700">
            Sem treino de musculação nesse dia
          </h3>
          <p className="mt-1 text-[12px] text-zinc-500">
            {new Date(date + "T00:00").toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
    );
  }

  // Computa muscle groups trabalhados (set distinct)
  const muscleGroups = Array.from(
    new Set(session.exercises.map((e) => e.muscleGroup)),
  );

  return (
    <div className="pb-12">
      <Link
        href="/fitness"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-500 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </Link>

      <header className="mb-5 overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white">
        <div className="px-5 py-5">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-800">
            <Dumbbell className="h-3 w-3" />
            Sessão de musculação
          </div>
          <h2 className="mt-1 text-[22px] font-semibold leading-tight text-zinc-900">
            {new Date(date + "T00:00").toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </h2>
          <p className="mt-0.5 text-[11px] text-zinc-500 tabular-nums">
            {new Date(date + "T00:00").getFullYear()}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {muscleGroups.map((mg) => (
              <span
                key={mg}
                className="inline-flex items-center gap-0.5 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-700 ring-1 ring-zinc-200"
              >
                <span>{MUSCLE_GROUP_EMOJI[mg as MuscleGroup] ?? "💪"}</span>
                {MUSCLE_GROUP_LABEL[mg as MuscleGroup] ?? mg}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Stats trio */}
      <section className="mb-5 grid grid-cols-3 gap-2.5">
        <Stat
          label="Sets"
          value={`${session.totalSets}`}
          icon={<Dumbbell className="h-3.5 w-3.5 text-brand-700" />}
        />
        <Stat
          label="Volume"
          value={`${Math.round(session.totalVolume).toLocaleString("pt-BR")}kg`}
          icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-600" />}
        />
        <Stat
          label="Exercícios"
          value={`${session.exercises.length}`}
          icon={<span className="text-[14px] leading-none">🏋️</span>}
        />
      </section>

      {/* Lista de exercícios */}
      <section className="flex flex-col gap-3">
        {session.exercises.map((ex) => {
          // Compute volume desse exercício
          const exerciseVolume = ex.sets.reduce(
            (s, set) => s + (set.weightKg ?? 0) * set.reps,
            0,
          );
          return (
            <div
              key={ex.exerciseId}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
            >
              <header className="flex items-center gap-3 px-4 py-3">
                <span className="text-[18px]" aria-hidden>
                  {MUSCLE_GROUP_EMOJI[ex.muscleGroup as MuscleGroup] ?? "💪"}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-semibold text-zinc-900">
                    {ex.exerciseName}
                  </h3>
                  <p className="mt-0.5 text-[10.5px] text-zinc-500">
                    {MUSCLE_GROUP_LABEL[ex.muscleGroup as MuscleGroup] ??
                      ex.muscleGroup}{" "}
                    · {ex.sets.length} sets ·{" "}
                    {Math.round(exerciseVolume).toLocaleString("pt-BR")}kg
                    volume
                  </p>
                </div>
              </header>
              <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
                {ex.sets.map((s) => (
                  <li
                    key={s.setOrder}
                    className="flex items-center gap-3 px-4 py-2"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-zinc-100 text-[10px] font-semibold text-zinc-600">
                      {s.setOrder}
                    </span>
                    <span className="flex-1 text-[12.5px] tabular-nums">
                      <strong className="text-zinc-900">
                        {s.weightKg ? `${s.weightKg}kg` : "BW"}
                      </strong>{" "}
                      <span className="text-zinc-400">×</span>{" "}
                      <strong className="text-zinc-900">{s.reps}</strong>{" "}
                      <span className="text-zinc-400">reps</span>
                    </span>
                    {s.rpe && (
                      <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-zinc-700 tabular-nums">
                        RPE {s.rpe}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-3">
      <div className="inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-[16px] font-semibold leading-none tabular-nums text-zinc-900">
        {value}
      </div>
    </div>
  );
}
