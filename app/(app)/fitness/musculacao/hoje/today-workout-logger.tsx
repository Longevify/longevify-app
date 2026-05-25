"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logStrengthSet } from "../../actions";
import { toast } from "@/lib/toast";
import type { ProgramDay } from "@/lib/fitness/types";
import { RestTimer } from "@/components/fitness/rest-timer";

/**
 * Logger interativo dos exercícios do treino do dia.
 *
 * Cada exercício expande mostrando sets completados (badge verde) e
 * input rápido pra próximo set. Pré-popula peso/reps baseado no target
 * do programa pra agilizar.
 *
 * O state local trackeia sets logados na sessão atual — não bate no
 * server pra refresh; só faz POST pra incluir.
 */
interface LastSetInfo {
  weightKg: number | null;
  reps: number;
  rpe: number | null;
  date: string;
}

interface TodayWorkoutLoggerProps {
  day: ProgramDay;
  /** Lucas (2026-05-25): "acompanhar a evolução no detalhe" — peso/reps
   * do último set logado em cada exercício, pra mostrar "Última vez X kg
   * × Y reps" como referência ao registrar o set de hoje. */
  lastSets?: Record<string, LastSetInfo>;
}

interface LoggedSet {
  exerciseId: string;
  weightKg: number | null;
  reps: number;
  rpe: number | null;
  ts: number;
}

export function TodayWorkoutLogger({
  day,
  lastSets = {},
}: TodayWorkoutLoggerProps) {
  const [expanded, setExpanded] = useState<string | null>(
    day.exercises[0]?.exerciseId ?? null,
  );
  const [logged, setLogged] = useState<LoggedSet[]>([]);

  return (
    <section>
      <h3 className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        Exercícios ({day.exercises.length})
      </h3>
      <ul className="flex flex-col gap-2">
        {day.exercises.map((ex, idx) => {
          const exerciseLogged = logged.filter(
            (l) => l.exerciseId === ex.exerciseId,
          );
          const isComplete = exerciseLogged.length >= ex.targetSets;
          const isExpanded = expanded === ex.exerciseId;
          return (
            <li
              key={ex.exerciseId + idx}
              className={cn(
                "overflow-hidden rounded-2xl border bg-white",
                isComplete ? "border-emerald-300" : "border-zinc-200",
              )}
            >
              <button
                type="button"
                onClick={() =>
                  setExpanded(isExpanded ? null : ex.exerciseId)
                }
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                    isComplete
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-zinc-100 text-zinc-600",
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-zinc-900">
                    {ex.exerciseName ?? ex.exerciseId}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10.5px] text-zinc-500 tabular-nums">
                    <span>
                      <strong className="text-zinc-700">
                        {ex.targetSets}
                      </strong>{" "}
                      ×{" "}
                      <strong className="text-zinc-700">
                        {ex.targetReps}
                      </strong>{" "}
                      reps
                    </span>
                    {ex.targetRpe && <span>· RPE {ex.targetRpe}</span>}
                    <span>· descanso {ex.restSeconds}s</span>
                  </div>
                </div>
                <span className="text-[11px] tabular-nums text-zinc-500">
                  {exerciseLogged.length}/{ex.targetSets}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                )}
              </button>

              {isExpanded && (
                <ExerciseLogger
                  exerciseId={ex.exerciseId}
                  targetSets={ex.targetSets}
                  targetReps={ex.targetReps}
                  targetRpe={ex.targetRpe}
                  restSeconds={ex.restSeconds}
                  notes={ex.notes ?? null}
                  loggedSets={exerciseLogged}
                  lastSet={lastSets[ex.exerciseId] ?? null}
                  onLogged={(set) => setLogged((cur) => [...cur, set])}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ExerciseLogger({
  exerciseId,
  targetSets,
  targetReps,
  targetRpe,
  restSeconds,
  notes,
  loggedSets,
  lastSet,
  onLogged,
}: {
  exerciseId: string;
  targetSets: number;
  targetReps: string;
  targetRpe: number | null;
  restSeconds: number;
  notes: string | null;
  loggedSets: LoggedSet[];
  /** Último set já logado pelo user nesse exercício, em sessões passadas. */
  lastSet: LastSetInfo | null;
  onLogged: (set: LoggedSet) => void;
}) {
  // Parse "8-10" → "8" (sugestão de reps inicial)
  const repsHint = targetReps.match(/^(\d+)/)?.[1] ?? "";

  // Lucas: pré-popula peso com o último kg usado (na mesma sessão > sessão
  // anterior > vazio). Reduz fricção pra logar set.
  const [weight, setWeight] = useState(
    loggedSets.length > 0
      ? String(loggedSets[loggedSets.length - 1].weightKg ?? "")
      : lastSet?.weightKg != null
        ? String(lastSet.weightKg)
        : "",
  );
  const [reps, setReps] = useState(
    loggedSets.length > 0
      ? String(loggedSets[loggedSets.length - 1].reps)
      : lastSet?.reps != null
        ? String(lastSet.reps)
        : repsHint,
  );
  const [rpe, setRpe] = useState<number | null>(targetRpe);
  const [pending, startTransition] = useTransition();
  const [timerActive, setTimerActive] = useState(false);

  const submit = () => {
    const w = parseFloat(weight.replace(",", "."));
    const r = parseInt(reps, 10);
    if (!Number.isFinite(r) || r <= 0) {
      toast.error({
        title: "Reps inválido",
        description: "Informe pelo menos 1 rep.",
      });
      return;
    }
    startTransition(async () => {
      const result = await logStrengthSet({
        exerciseId,
        weightKg: Number.isFinite(w) ? w : null,
        reps: r,
        rpe,
      });
      if (result.ok) {
        onLogged({
          exerciseId,
          weightKg: Number.isFinite(w) ? w : null,
          reps: r,
          rpe,
          ts: Date.now(),
        });
        toast.success({
          title: `Set ${loggedSets.length + 1} ✓`,
          description: `${Number.isFinite(w) ? `${w}kg × ` : ""}${r} reps`,
        });
        // Inicia rest timer auto (Phase 3D)
        setTimerActive(true);
        // Limpa reps pra próximo, mantém peso (comum repetir)
        setReps(repsHint);
      } else {
        toast.error({ title: "Erro", description: result.error });
      }
    });
  };

  return (
    <div className="border-t border-zinc-100 bg-zinc-50/40 px-4 py-3.5">
      {notes && (
        <p className="mb-3 rounded-lg bg-white px-3 py-2 text-[11.5px] italic text-zinc-600 ring-1 ring-zinc-100">
          💡 {notes}
        </p>
      )}

      {/* Lucas: "acompanhar a evolução no detalhe" — última performance
          do user nesse exercício, exibida acima do input pra comparar */}
      {lastSet && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <span className="text-[14px]">📊</span>
          <div className="flex-1 min-w-0">
            <div className="text-[9.5px] font-semibold uppercase tracking-wide text-amber-700">
              Última vez
            </div>
            <div className="text-[12px] font-semibold text-amber-900 tabular-nums">
              {lastSet.weightKg ? `${lastSet.weightKg}kg` : "BW"} × {lastSet.reps}{" "}
              reps
              {lastSet.rpe && (
                <span className="ml-1 text-[10px] font-normal text-amber-700">
                  @ RPE {lastSet.rpe}
                </span>
              )}
            </div>
          </div>
          <div className="text-right text-[9.5px] text-amber-700/80 tabular-nums">
            {new Date(lastSet.date + "T12:00:00").toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            })}
          </div>
        </div>
      )}

      {/* Sets já logados nesta sessão */}
      {loggedSets.length > 0 && (
        <div className="mb-3">
          <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wide text-zinc-500">
            Sets desta sessão
          </div>
          <ul className="flex flex-wrap gap-1">
            {loggedSets.map((s, i) => (
              <li
                key={i}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-800 tabular-nums"
              >
                <Check className="h-2.5 w-2.5" />
                {s.weightKg ? `${s.weightKg}kg` : "BW"} × {s.reps}
                {s.rpe && (
                  <span className="text-[9px] text-emerald-700/70">
                    @{s.rpe}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Input rápido pro próximo set */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[9.5px] font-semibold uppercase tracking-wide text-zinc-500">
            Peso
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="kg"
            step="any"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[15px] tabular-nums focus:border-brand-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[9.5px] font-semibold uppercase tracking-wide text-zinc-500">
            Reps
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder={repsHint || "reps"}
            step="1"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[15px] tabular-nums focus:border-brand-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[9.5px] font-semibold uppercase tracking-wide text-zinc-500">
            RPE
          </label>
          <div className="mt-1 flex gap-0.5">
            {[7, 8, 9, 10].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRpe(rpe === v ? null : v)}
                className={cn(
                  "flex-1 rounded-md px-1 py-2 text-[11px] font-semibold transition tabular-nums",
                  rpe === v
                    ? "bg-brand-700 text-white"
                    : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={pending || !reps}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Gravando…
          </>
        ) : (
          <>
            <Plus className="h-3.5 w-3.5" />
            Registrar set {loggedSets.length + 1}
            {loggedSets.length + 1 > targetSets && " (extra)"}
          </>
        )}
      </button>

      <p className="mt-2 text-center text-[9.5px] text-zinc-400">
        Target: {targetSets} sets × {targetReps} reps
        {targetRpe && ` @ RPE ${targetRpe}`}
      </p>

      {/* Phase 3D: Rest timer aparece automaticamente após gravar set */}
      {timerActive && (
        <div className="mt-3">
          <RestTimer
            seconds={restSeconds || 90}
            onClose={() => setTimerActive(false)}
          />
        </div>
      )}
    </div>
  );
}
