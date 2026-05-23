"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Dumbbell,
  Search,
  X,
  Plus,
  Loader2,
  TrendingUp,
  Flame,
  History,
  Sparkles,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Exercise,
  type MuscleGroup,
  MUSCLE_GROUP_LABEL,
  MUSCLE_GROUP_EMOJI,
  EQUIPMENT_LABEL,
} from "@/lib/fitness/types";
import { logStrengthSet } from "../actions";
import { toast } from "@/lib/toast";
import {
  ExerciseHistoryPopup,
  type PastSet,
} from "@/components/fitness/exercise-history-popup";
import { WeeklyMuscleAnalysis } from "@/components/fitness/weekly-muscle-analysis";
import { RestTimer } from "@/components/fitness/rest-timer";
import { PlateCalculator } from "@/components/fitness/plate-calculator";
import {
  ShareWorkoutModal,
  type ShareWorkoutData,
} from "@/components/fitness/share-workout-modal";

/**
 * Musculação (Phase 2):
 * - Resumo semanal (volume total kg + total sets + dias ativos)
 * - WeeklyMuscleAnalysis: card "🥇 músculo que mais evoluiu" (Lucas pediu)
 * - Lista de exercícios agrupados por muscle_group (filtrável via search)
 * - Click no exercício → popup de histórico/dashboard (PR, chart, sets)
 * - Botão "+" lateral → modal pra logar set (peso + reps + RPE opcional)
 * - Vídeo de execução embedado no popup quando exercise.videoUrl existe
 *
 * Próximas fases (em progresso):
 *  - AI workout generator (Phase 2B)
 *  - Corrida full c/ GPS + pace (Phase 2C)
 *  - Demais exercícios — bike/natação/yoga (Phase 2D)
 */

interface MuscleGroupRow {
  muscleGroup: string;
  thisWeekVolume: number;
  lastWeekVolume: number;
  thisWeekSets: number;
  deltaPct: number;
}

interface TodayWorkoutSummary {
  dayIndex: number;
  totalDays: number;
  dayName: string;
  focus: string[];
  exerciseCount: number;
  programName: string;
}

interface MusculacaoClientProps {
  exercises: Exercise[];
  volumeHistory: Array<{ date: string; volumeKg: number; setsCount: number }>;
  muscleAnalysis: MuscleGroupRow[];
  todayWorkout?: TodayWorkoutSummary | null;
}

export function MusculacaoClient({
  exercises,
  volumeHistory,
  muscleAnalysis,
  todayWorkout,
}: MusculacaoClientProps) {
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<MuscleGroup | "all">("all");
  const [openExercise, setOpenExercise] = useState<Exercise | null>(null);
  // Lucas (2026-05-21) Phase 2: histórico/dashboard popup separado do
  // log modal — usuário clica num exercício pra VER progressão, ou no
  // botão "+" pra REGISTRAR set.
  const [historyExercise, setHistoryExercise] = useState<Exercise | null>(null);
  const [historyData, setHistoryData] = useState<PastSet[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Lazy fetch quando abre popup de histórico
  useEffect(() => {
    if (!historyExercise) {
      setHistoryData([]);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    fetch(`/api/fitness/exercises/${historyExercise.id}/history`)
      .then((r) => r.json())
      .then((data: { history?: PastSet[] }) => {
        if (!cancelled) setHistoryData(data.history ?? []);
      })
      .catch(() => {
        if (!cancelled) setHistoryData([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [historyExercise]);

  // Resumo semanal (últimos 7 dias)
  const weekly = useMemo(() => {
    const last7 = volumeHistory.slice(-7);
    const totalVolume = last7.reduce((s, d) => s + d.volumeKg, 0);
    const totalSets = last7.reduce((s, d) => s + d.setsCount, 0);
    const activeDays = last7.filter((d) => d.setsCount > 0).length;
    return { totalVolume, totalSets, activeDays };
  }, [volumeHistory]);

  // Stats de hoje pra share button
  const today = useMemo(() => {
    const todayDate = new Date().toISOString().slice(0, 10);
    const row = volumeHistory.find((d) => d.date === todayDate);
    return row ?? { date: todayDate, volumeKg: 0, setsCount: 0 };
  }, [volumeHistory]);

  // Lucas (2026-05-23): "tem que ter algum botão fácil de acessar para
  // compartilhar treinos" → share modal pra hoje
  const [shareModalData, setShareModalData] =
    useState<ShareWorkoutData | null>(null);

  const openShareToday = () => {
    if (today.setsCount === 0) {
      // Fallback pro último dia treinado
      const last = [...volumeHistory]
        .reverse()
        .find((d) => d.setsCount > 0);
      if (!last) return;
      setShareModalData({
        kind: "workout",
        title: "Mais um dia de treino",
        primaryStat: {
          value: `${Math.round(last.volumeKg).toLocaleString("pt-BR")}`,
          label: "kg movidos",
        },
        secondaryStats: [
          { value: `${last.setsCount}`, label: "sets" },
          {
            value: new Date(last.date + "T00:00").toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            }),
            label: "dia",
          },
        ],
      });
      return;
    }
    setShareModalData({
      kind: "workout",
      title: "Treino concluído hoje 💪",
      primaryStat: {
        value: `${Math.round(today.volumeKg).toLocaleString("pt-BR")}`,
        label: "kg movidos",
      },
      secondaryStats: [
        { value: `${today.setsCount}`, label: "sets" },
        {
          value: `${weekly.activeDays}/7`,
          label: "ativos sem.",
        },
      ],
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((e) => {
      if (groupFilter !== "all" && e.muscleGroup !== groupFilter) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [exercises, query, groupFilter]);

  // Agrupa por muscleGroup
  const grouped = useMemo(() => {
    const map = new Map<MuscleGroup, Exercise[]>();
    for (const e of filtered) {
      const arr = map.get(e.muscleGroup) ?? [];
      arr.push(e);
      map.set(e.muscleGroup, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const groupChips: Array<MuscleGroup | "all"> = [
    "all",
    "chest",
    "back",
    "legs",
    "shoulders",
    "arms",
    "core",
    "full_body",
  ];

  return (
    <>
      {/* Resumo semanal */}
      <section className="mb-3 grid grid-cols-3 gap-3">
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          label="Volume (7d)"
          value={`${Math.round(weekly.totalVolume).toLocaleString("pt-BR")} kg`}
          hint="peso × reps"
        />
        <SummaryCard
          icon={<Dumbbell className="h-4 w-4 text-brand-700" />}
          label="Sets"
          value={`${weekly.totalSets}`}
          hint="últimos 7 dias"
        />
        <SummaryCard
          icon={<Flame className="h-4 w-4 text-orange-500" />}
          label="Dias ativos"
          value={`${weekly.activeDays}`}
          hint="de 7"
        />
      </section>

      {/* Compartilhar treino — Lucas (2026-05-23) "tem que ter algum
          botão fácil de acessar para compartilhar treinos" */}
      {(today.setsCount > 0 || weekly.totalSets > 0) && (
        <button
          type="button"
          onClick={openShareToday}
          className="group mb-5 flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-brand-300 hover:shadow-sm"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 text-white shadow-sm">
            <Share2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-zinc-900">
              {today.setsCount > 0
                ? "Compartilhar treino de hoje"
                : "Compartilhar último treino"}
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {today.setsCount > 0
                ? `${Math.round(today.volumeKg).toLocaleString("pt-BR")} kg · ${today.setsCount} sets · imagem pronta pra IG/X/feed`
                : "Imagem com volume + sets pronta pra IG/X/feed Longevify"}
            </p>
          </div>
          <span className="shrink-0 text-brand-700 group-hover:translate-x-0.5 transition">
            →
          </span>
        </button>
      )}

      {/* Treino do dia (Phase 3B) */}
      {todayWorkout && (
        <Link
          href="/fitness/musculacao/hoje"
          className="mb-5 block overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 text-white shadow-md transition hover:shadow-lg"
        >
          <div className="flex items-center gap-4 px-5 py-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <Sparkles className="h-5 w-5 text-amber-200" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Treino de hoje · Dia {todayWorkout.dayIndex}/{todayWorkout.totalDays}
              </div>
              <div className="mt-0.5 truncate text-[16px] font-semibold leading-tight">
                {todayWorkout.dayName}
              </div>
              <div className="mt-0.5 text-[11px] text-white/70">
                {todayWorkout.exerciseCount} exercício
                {todayWorkout.exerciseCount === 1 ? "" : "s"} ·{" "}
                {todayWorkout.programName}
              </div>
            </div>
            <span className="shrink-0 text-white">→</span>
          </div>
        </Link>
      )}

      {/* Weekly muscle analysis (Lucas pediu — "musculo que mais evoluiu") */}
      <WeeklyMuscleAnalysis data={muscleAnalysis} />

      {/* CTA AI workout generator (Phase 2B: ativo) */}
      <Link
        href="/fitness/musculacao/programa"
        className="mb-5 block rounded-2xl border border-brand-300 bg-gradient-to-br from-brand-50 via-brand-50/60 to-white px-4 py-3.5 transition hover:shadow-md"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-brand-900">
              Gerar treino com Dr. Lon
            </div>
            <p className="mt-0.5 text-[11.5px] text-brand-700/80">
              5 perguntas → programa personalizado pra seus objetivos.
            </p>
          </div>
          <span className="shrink-0 self-center text-brand-700">→</span>
        </div>
      </Link>

      {/* Search + filtro */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar exercício..."
            className="w-full rounded-full border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-[13.5px] text-zinc-800 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {groupChips.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroupFilter(g)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11.5px] font-medium transition",
                groupFilter === g
                  ? "bg-brand-700 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
              )}
            >
              {g === "all" ? "Todos" : MUSCLE_GROUP_LABEL[g]}
            </button>
          ))}
        </div>
      </div>

      {/* Lista por muscle_group */}
      <section className="flex flex-col gap-5">
        {grouped.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-8 text-center text-[12.5px] text-zinc-500">
            Nenhum exercício encontrado com esse filtro.
          </div>
        ) : (
          grouped.map(([group, list]) => (
            <div key={group}>
              <h3 className="mb-2 inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                <span aria-hidden>{MUSCLE_GROUP_EMOJI[group]}</span>
                {MUSCLE_GROUP_LABEL[group]}
                <span className="ml-1 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9.5px] text-zinc-500">
                  {list.length}
                </span>
              </h3>
              <ul className="flex flex-col gap-1.5">
                {list.map((ex) => (
                  <li key={ex.id}>
                    <div className="flex items-stretch gap-1.5">
                      <button
                        type="button"
                        onClick={() => setHistoryExercise(ex)}
                        className="flex flex-1 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-brand-300 hover:shadow-sm"
                        title="Ver progressão"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                          <Dumbbell className="h-4 w-4" strokeWidth={2} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] font-medium text-zinc-900">
                            {ex.name}
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10.5px] text-zinc-500">
                            {ex.equipment ? (
                              <span>{EQUIPMENT_LABEL[ex.equipment]}</span>
                            ) : null}
                            <span>· {ex.category === "compound" ? "composto" : "isolado"}</span>
                          </div>
                        </div>
                        <History className="h-4 w-4 shrink-0 text-zinc-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenExercise(ex)}
                        aria-label={`Registrar set de ${ex.name}`}
                        title="Registrar set"
                        className="grid w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 text-white shadow-sm transition hover:from-brand-600 hover:to-brand-700"
                      >
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {/* Modal de log */}
      {openExercise && (
        <LogSetModal
          exercise={openExercise}
          onClose={() => setOpenExercise(null)}
        />
      )}

      {/* Popup de histórico/dashboard */}
      {historyExercise && (
        <ExerciseHistoryPopup
          open={!!historyExercise}
          onClose={() => setHistoryExercise(null)}
          exercise={historyExercise}
          history={historyData}
          loading={historyLoading}
        />
      )}

      {/* Share modal */}
      {shareModalData && (
        <ShareWorkoutModal
          open
          data={shareModalData}
          modalTitle="Compartilhar treino"
          onClose={() => setShareModalData(null)}
        />
      )}
    </>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 shadow-[0_2px_8px_-4px_rgba(13,40,24,.08)]">
      <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-[18px] font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-[10.5px] text-zinc-400">{hint}</div>
    </div>
  );
}

// ─── Log set modal ────────────────────────────────────────────────────

function LogSetModal({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  // Phase 3D: rest timer + plate calc
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(90);
  const [showPlateCalc, setShowPlateCalc] = useState(false);

  const submit = () => {
    const w = parseFloat(weight.replace(",", "."));
    const r = parseInt(reps, 10);
    if (!r || r <= 0) {
      toast.error({ title: "Reps inválido", description: "Informe pelo menos 1 rep." });
      return;
    }
    startTransition(async () => {
      const result = await logStrengthSet({
        exerciseId: exercise.id,
        weightKg: Number.isFinite(w) ? w : null,
        reps: r,
        rpe,
      });
      if (result.ok) {
        toast.success({
          title: "Set registrado",
          description: `${exercise.name} · ${Number.isFinite(w) ? `${w}kg × ` : ""}${r} reps`,
        });
        // Toast extra pra cada nova conquista (Phase 3C)
        for (const ach of result.data?.newAchievements ?? []) {
          toast.success({
            title: `🏆 Nova conquista: ${ach.emoji} ${ach.title}`,
            description: `${ach.description} (+${ach.xp} XP)`,
          });
        }
        // Inicia rest timer automaticamente (Phase 3D)
        setTimerActive(true);
        // Limpa campos pra próximo set
        setWeight(weight); // mantém peso (geralmente repete)
        setReps("");
        setRpe(null);
      } else {
        toast.error({ title: "Erro ao gravar", description: result.error });
      }
    });
  };

  // Peso parseado pro plate calculator (só aparece se é treino com barra)
  const weightForPlates = parseFloat(weight.replace(",", "."));
  const isBarbellExercise = exercise.equipment === "barbell";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-[480px] sm:rounded-3xl rounded-t-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-700">
              {MUSCLE_GROUP_LABEL[exercise.muscleGroup]}
            </div>
            <h2 className="mt-0.5 text-[17px] font-semibold leading-tight text-zinc-900">
              {exercise.name}
            </h2>
            {exercise.equipment && (
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {EQUIPMENT_LABEL[exercise.equipment]} · {exercise.category === "compound" ? "composto" : "isolado"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {exercise.description && (
            <p className="mb-5 rounded-xl bg-zinc-50/70 px-3 py-2.5 text-[12.5px] leading-relaxed text-zinc-600">
              {exercise.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
                Peso (kg)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="60"
                min="0"
                step="any"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[16px] tabular-nums text-zinc-900 focus:border-brand-400 focus:outline-none"
              />
              <p className="mt-1 text-[10.5px] text-zinc-400">
                Deixa vazio se for bodyweight
              </p>
            </div>
            <div>
              <label className="block text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
                Reps
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="8"
                min="1"
                step="1"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[16px] tabular-nums text-zinc-900 focus:border-brand-400 focus:outline-none"
              />
              <p className="mt-1 text-[10.5px] text-zinc-400">
                Quantas repetições?
              </p>
            </div>
          </div>

          {/* RPE opcional */}
          <div className="mt-4">
            <label className="block text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
              Esforço percebido (RPE) <span className="text-zinc-400">— opcional</span>
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[6, 7, 8, 9, 10].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setRpe(rpe === v ? null : v)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] font-semibold transition",
                    rpe === v
                      ? "bg-brand-700 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10.5px] text-zinc-400">
              10 = falha total. 8 = 2 reps na reserva. 6 = leve.
            </p>
          </div>

          {/* Phase 3D: Rest timer (aparece após gravar set) */}
          {timerActive && (
            <div className="mt-5">
              <RestTimer
                seconds={timerSeconds}
                onComplete={() => {
                  /* deixa o usuário ver "Pronto!" */
                }}
                onClose={() => setTimerActive(false)}
              />
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10.5px]">
                <span className="text-zinc-500">Sugestão pra duração:</span>
                {[60, 90, 120, 180].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTimerSeconds(s)}
                    className={cn(
                      "rounded px-1.5 py-0.5 font-semibold tabular-nums transition",
                      timerSeconds === s
                        ? "bg-brand-700 text-white"
                        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200",
                    )}
                  >
                    {s < 60 ? `${s}s` : `${Math.floor(s / 60)}min`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Phase 3D: Calculadora de anilhas */}
          {isBarbellExercise && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowPlateCalc((s) => !s)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-[11.5px] font-semibold text-zinc-700 transition hover:bg-zinc-200"
              >
                🧮 {showPlateCalc ? "Esconder" : "Mostrar"} cálculo de anilhas
              </button>
              {showPlateCalc &&
                Number.isFinite(weightForPlates) &&
                weightForPlates > 0 && (
                  <div className="mt-2">
                    <PlateCalculator totalKg={weightForPlates} />
                  </div>
                )}
              {showPlateCalc &&
                (!Number.isFinite(weightForPlates) || weightForPlates <= 0) && (
                  <p className="mt-2 text-[10.5px] text-zinc-500">
                    Informe o peso pra calcular as anilhas.
                  </p>
                )}
            </div>
          )}

          {/* Video library hint */}
          {exercise.videoUrl ? (
            <a
              href={exercise.videoUrl}
              target="_blank"
              rel="noopener"
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-700 underline-offset-2 hover:underline"
            >
              Ver vídeo de execução ↗
            </a>
          ) : (
            <p className="mt-4 text-[10.5px] text-zinc-400">
              📹 Biblioteca de vídeos · em breve
            </p>
          )}
        </div>

        <footer className="border-t border-zinc-100 px-5 py-3">
          <button
            type="button"
            onClick={submit}
            disabled={pending || !reps}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 px-5 py-3 text-[14px] font-semibold text-white transition disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Gravando…
              </>
            ) : (
              <>Registrar set</>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
