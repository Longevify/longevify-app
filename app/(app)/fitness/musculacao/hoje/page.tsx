import Link from "next/link";
import { ArrowLeft, Sparkles, Dumbbell, Calendar, Target } from "lucide-react";
import {
  getTodaysWorkout,
  getLastSetsForExercises,
} from "@/lib/fitness/server";
import {
  MUSCLE_GROUP_LABEL,
  MUSCLE_GROUP_EMOJI,
  type MuscleGroup,
} from "@/lib/fitness/types";
import { TodayWorkoutLogger } from "./today-workout-logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Phase 3B — Treino do dia.
 *
 * Mostra qual treino do programa ativo é o "de hoje" baseado em rotação
 * round-robin do split. User pode logar sets dos exercícios sugeridos
 * direto da página (sem precisar voltar pra busca).
 */
export default async function HojePage() {
  const today = await getTodaysWorkout();

  // Lucas (2026-05-25): "preencher quantas reps, quantos kgs foram feitos.
  // Dessa forma vou conseguir acompanhar a evolução no detalhe". Pré-fetch
  // do último set de cada exercício do treino do dia pra mostrar "Última
  // vez" como referência (peso/reps anteriores).
  const lastSets = today
    ? await getLastSetsForExercises(
        today.day.exercises.map((e) => e.exerciseId),
      )
    : new Map();

  if (!today) {
    return (
      <div className="pb-12">
        <Link
          href="/fitness/musculacao"
          className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-500 transition hover:text-brand-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </Link>
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-10 text-center">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
          <h3 className="text-[15px] font-semibold text-zinc-800">
            Sem programa ativo
          </h3>
          <p className="mt-1 text-[12px] text-zinc-500">
            Gere um treino com Dr. Lon e depois volte aqui pra ver o treino do
            dia.
          </p>
          <Link
            href="/fitness/musculacao/programa"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 px-4 py-2 text-[12.5px] font-semibold text-white"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Gerar programa
          </Link>
        </div>
      </div>
    );
  }

  const { program, dayIndex, day, completedSinceStart } = today;

  return (
    <div className="pb-12">
      <Link
        href="/fitness/musculacao"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-500 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </Link>

      {/* Hero card do treino */}
      <section className="mb-5 overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 text-white shadow-md">
        <div className="px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Hoje · Dia {dayIndex}/{program.structure.days.length}
              </div>
              <h2 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight">
                {day.name}
              </h2>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10.5px]">
                {day.focus.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-0.5 rounded-full bg-white/15 px-2 py-0.5 font-medium text-white/90 ring-1 ring-white/20"
                  >
                    <span>{MUSCLE_GROUP_EMOJI[f as MuscleGroup] ?? "💪"}</span>
                    {MUSCLE_GROUP_LABEL[f as MuscleGroup] ?? f}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-white/70">
            Programa &ldquo;{program.name}&rdquo; · {completedSinceStart}{" "}
            treino{completedSinceStart === 1 ? "" : "s"} completados desde o
            início
          </p>
        </div>
      </section>

      {/* Aquecimento (se houver) */}
      {program.structure.warmupNotes && (
        <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-amber-800">
            🔥 Aquecimento
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-amber-900">
            {program.structure.warmupNotes}
          </p>
        </section>
      )}

      {/* Lista de exercícios — interativa */}
      <TodayWorkoutLogger
        day={day}
        lastSets={Object.fromEntries(lastSets)}
      />

      {/* Progressão */}
      {program.structure.progressionStrategy && (
        <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 px-4 py-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
            📈 Progressão
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-emerald-900">
            {program.structure.progressionStrategy}
          </p>
        </section>
      )}

      {/* Tip */}
      <p className="mt-6 text-center text-[10.5px] text-zinc-400">
        <Dumbbell className="-mt-0.5 mr-1 inline h-3 w-3" />
        Após terminar, o próximo dia da rotação vira o &ldquo;Hoje&rdquo;
        automaticamente.
      </p>
    </div>
  );
}
