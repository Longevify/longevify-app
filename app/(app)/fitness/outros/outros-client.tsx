"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Plus,
  X,
  Loader2,
  Clock,
  Flame,
  Activity,
  Trash2,
  Calendar,
  Play,
  Pause,
  Square,
  Check,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ActivityType,
  type IntensityLevel,
  type OtherWorkout,
  ACTIVITY_LABEL,
  ACTIVITY_EMOJI,
  INTENSITY_LABEL,
  ACTIVITY_MET,
} from "@/lib/fitness/types";
import { logOtherWorkout, deleteOtherWorkout } from "../actions";
import { toast } from "@/lib/toast";
import {
  ShareWorkoutModal,
  type ShareWorkoutData,
} from "@/components/fitness/share-workout-modal";

/**
 * Lucas (2026-05-21): "outra [aba] para demais exercícios."
 *
 * Tracking simples (não-musculação, não-corrida): bike, natação,
 * escalada, yoga, pilates, HIIT, mobilidade, caminhada, remo.
 *
 * Lucas (2026-05-23): "Quero que tenha a opção de registrar começo da
 * atividade que nem como é no de corrida. Escolhe o esporte, dá play
 * no cronometro e pronto"
 *
 * Estados do tracker (espelha corrida-client):
 *   - idle: hero com chip de modalidade + botão Iniciar, abaixo histórico
 *   - tracking: cronômetro ativo em foreground, modalidade selecionada
 *   - paused: cronômetro pausado, mantém estado
 *   - done: tela de resumo com intensidade/distância/notas + Salvar
 *
 * Mantém o LogActivityModal pra retroactive logging (botão "Registrar
 * sem cronômetro" no idle screen).
 */

interface OutrosClientProps {
  history: OtherWorkout[];
  stats: {
    totalMinutesThisMonth: number;
    totalCaloriesThisMonth: number;
    totalWorkoutsThisMonth: number;
    breakdown: Array<{ type: ActivityType; minutes: number; count: number }>;
  };
}

const ACTIVITIES: ActivityType[] = [
  "bike",
  "swim",
  "climb",
  "yoga",
  "pilates",
  "hiit",
  "mobility",
  "walking",
  "rowing",
  "other",
];

const INTENSITIES: IntensityLevel[] = ["low", "moderate", "high"];

// Atividades cuja distância faz sentido capturar
const DISTANCE_ACTIVITIES: ActivityType[] = [
  "bike",
  "swim",
  "walking",
  "rowing",
];

type TrackState = "idle" | "tracking" | "paused" | "done";

function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function OutrosClient({ history, stats }: OutrosClientProps) {
  // ─── Live tracker state ───────────────────────────────────────────────
  const [trackState, setTrackState] = useState<TrackState>("idle");
  const [selectedActivity, setSelectedActivity] =
    useState<ActivityType>("bike");
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Form (post-tracking ou retroactive) ─────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, startDeleting] = useTransition();

  // Lucas (2026-05-23): pós-save abre share modal estilo Strava
  const [postSaveShare, setPostSaveShare] = useState<ShareWorkoutData | null>(
    null,
  );

  // Cronômetro: tica a cada segundo durante tracking
  useEffect(() => {
    if (trackState === "tracking") {
      timerRef.current = setInterval(() => {
        setElapsedSecs((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [trackState]);

  // Reseta o tracker
  const resetTracker = () => {
    setTrackState("idle");
    setElapsedSecs(0);
  };

  const startTracking = (activity: ActivityType) => {
    setSelectedActivity(activity);
    setElapsedSecs(0);
    setTrackState("tracking");
  };

  const handleDelete = (sessionId: string, label: string) => {
    if (!confirm(`Apagar "${label}"? Não dá pra desfazer.`)) return;
    startDeleting(async () => {
      const result = await deleteOtherWorkout(sessionId);
      if (result.ok) {
        toast.success({ title: "Removida" });
        window.location.reload();
      } else {
        toast.error({ title: "Erro", description: result.error });
      }
    });
  };

  // ─── Render: live tracking ────────────────────────────────────────────
  if (trackState === "tracking" || trackState === "paused") {
    return (
      <TrackerView
        activity={selectedActivity}
        elapsedSecs={elapsedSecs}
        paused={trackState === "paused"}
        onPause={() => setTrackState("paused")}
        onResume={() => setTrackState("tracking")}
        onStop={() => setTrackState("done")}
        onDiscard={() => {
          if (!confirm("Descartar essa atividade? Os dados não serão salvos."))
            return;
          resetTracker();
        }}
      />
    );
  }

  // ─── Render: done view (saving form) ──────────────────────────────────
  if (trackState === "done") {
    return (
      <>
        <DoneTrackerView
          activity={selectedActivity}
          elapsedSecs={elapsedSecs}
          onCancel={resetTracker}
          onSaved={(shareData) => {
            // Em vez de reload imediato, mostra share modal
            setPostSaveShare(shareData);
          }}
        />
        {postSaveShare && (
          <ShareWorkoutModal
            open
            data={postSaveShare}
            modalTitle="Compartilhar atividade"
            onClose={() => {
              setPostSaveShare(null);
              resetTracker();
              window.location.reload();
            }}
          />
        )}
      </>
    );
  }

  // ─── Idle render ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Stats header */}
      <section className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Clock className="h-4 w-4 text-brand-700" />}
          label="Este mês"
          value={`${stats.totalMinutesThisMonth}`}
          hint="minutos"
        />
        <StatCard
          icon={<Flame className="h-4 w-4 text-orange-500" />}
          label="Calorias"
          value={`${stats.totalCaloriesThisMonth.toLocaleString("pt-BR")}`}
          hint="estimadas"
        />
        <StatCard
          icon={<Activity className="h-4 w-4 text-emerald-600" />}
          label="Treinos"
          value={`${stats.totalWorkoutsThisMonth}`}
          hint="no mês"
        />
      </section>

      {/* Iniciar atividade — chip grid + big start button */}
      <section className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-5 py-5 text-white shadow-[0_8px_30px_-12px_rgba(31,93,63,.6)]">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold tracking-tight">
            Iniciar atividade
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white/80">
            <Zap className="h-3 w-3" />
            cronômetro ao vivo
          </span>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-5">
          {ACTIVITIES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setSelectedActivity(a)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-[9.5px] font-medium transition",
                selectedActivity === a
                  ? "border-white/60 bg-white/20 text-white shadow-sm"
                  : "border-white/20 bg-white/5 text-white/80 hover:bg-white/10",
              )}
            >
              <span className="text-[18px]">{ACTIVITY_EMOJI[a]}</span>
              <span className="leading-tight">{ACTIVITY_LABEL[a]}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => startTracking(selectedActivity)}
          className="group relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white px-5 py-3.5 text-[14px] font-semibold text-brand-900 shadow-md transition active:scale-[0.98]"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute h-16 w-16 animate-ping rounded-full bg-brand-700/10"
            style={{ animationDuration: "2.4s" }}
          />
          <span className="relative grid h-9 w-9 place-items-center rounded-full bg-brand-700 text-white">
            <Play className="h-4 w-4 fill-white" />
          </span>
          <span className="relative">
            Começar {ACTIVITY_LABEL[selectedActivity].toLowerCase()}{" "}
            <span aria-hidden>{ACTIVITY_EMOJI[selectedActivity]}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-transparent px-3 py-2 text-[11.5px] font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          <Plus className="h-3 w-3" />
          Registrar atividade passada (sem cronômetro)
        </button>
      </section>

      {/* Breakdown por tipo */}
      {stats.breakdown.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-3.5">
          <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <Activity className="h-3 w-3" />
            Distribuição (mês)
          </div>
          <ul className="flex flex-col gap-1.5">
            {stats.breakdown.map((b) => {
              const max = stats.breakdown[0].minutes;
              const pct = (b.minutes / max) * 100;
              return (
                <li
                  key={b.type}
                  className="flex items-center gap-3 text-[12.5px]"
                >
                  <span
                    className="w-7 text-center text-[15px]"
                    aria-hidden
                  >
                    {ACTIVITY_EMOJI[b.type]}
                  </span>
                  <span className="w-24 truncate text-zinc-800">
                    {ACTIVITY_LABEL[b.type]}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-brand-400 to-brand-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-[11px] tabular-nums text-zinc-500">
                    {b.minutes} min
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Histórico */}
      <section>
        <h3 className="mb-2 px-1 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Histórico ({history.length})
        </h3>
        {history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-8 text-center text-[12.5px] text-zinc-500">
            Nenhuma atividade registrada ainda. Bike, natação, yoga, escalada
            — tudo aqui 🏊
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((w) => (
              <li
                key={w.id}
                className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-[20px]">
                  {ACTIVITY_EMOJI[w.activityType]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-zinc-900">
                      {ACTIVITY_LABEL[w.activityType]}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide",
                        w.intensity === "high"
                          ? "bg-rose-100 text-rose-700"
                          : w.intensity === "moderate"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      {INTENSITY_LABEL[w.intensity]}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10.5px] text-zinc-500 tabular-nums">
                    <span>{w.durationMinutes} min</span>
                    {w.distanceKm && (
                      <span>· {w.distanceKm.toFixed(1)} km</span>
                    )}
                    {w.estimatedCalories && (
                      <span>· {w.estimatedCalories} kcal</span>
                    )}
                    {w.sessionDate && (
                      <span>
                        ·{" "}
                        {new Date(w.sessionDate + "T00:00").toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "short" },
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleDelete(
                      w.sessionId,
                      `${ACTIVITY_LABEL[w.activityType]} · ${w.durationMinutes}min`,
                    )
                  }
                  disabled={deleting}
                  aria-label="Apagar atividade"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-rose-600 disabled:opacity-30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {modalOpen && (
        <LogActivityModal
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────

function StatCard({
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

/**
 * Tela de tracking — cronômetro grande em foreground com pause/finalizar.
 * Sem GPS (só corrida usa GPS).
 */
function TrackerView({
  activity,
  elapsedSecs,
  paused,
  onPause,
  onResume,
  onStop,
  onDiscard,
}: {
  activity: ActivityType;
  elapsedSecs: number;
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Hero: modalidade + cronômetro */}
      <section className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-10 text-center text-white shadow-md">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/80">
          <span className="text-[16px]" aria-hidden>
            {ACTIVITY_EMOJI[activity]}
          </span>
          {ACTIVITY_LABEL[activity]}
        </div>
        <div className="mt-6 text-[64px] font-semibold leading-none tracking-tight tabular-nums">
          {fmtDuration(elapsedSecs)}
        </div>
        <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
          {paused ? "Pausado" : "Em andamento"}
        </div>

        {/* Pulse ring visual indicating live recording */}
        {!paused && (
          <div className="mt-4 inline-flex items-center gap-1.5">
            <span className="relative grid h-2 w-2 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/60" />
              <span className="relative h-2 w-2 rounded-full bg-rose-400" />
            </span>
            <span className="text-[10.5px] font-medium text-white/80">
              gravando
            </span>
          </div>
        )}
      </section>

      {/* Controles */}
      <section className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onDiscard}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-white py-3 text-[12px] font-semibold text-zinc-600 transition hover:bg-zinc-50"
        >
          <X className="h-4 w-4" />
          Descartar
        </button>
        {paused ? (
          <button
            type="button"
            onClick={onResume}
            className="col-span-1 flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 py-3 text-[13px] font-semibold text-white shadow-sm"
          >
            <Play className="h-4 w-4 fill-white" />
            Continuar
          </button>
        ) : (
          <button
            type="button"
            onClick={onPause}
            className="col-span-1 flex items-center justify-center gap-1.5 rounded-2xl bg-amber-100 py-3 text-[13px] font-semibold text-amber-900 transition hover:bg-amber-200"
          >
            <Pause className="h-4 w-4" />
            Pausar
          </button>
        )}
        <button
          type="button"
          onClick={onStop}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-rose-600 py-3 text-[13px] font-semibold text-white shadow-sm hover:bg-rose-700"
        >
          <Square className="h-4 w-4 fill-white" />
          Finalizar
        </button>
      </section>

      <p className="text-center text-[10.5px] text-zinc-400">
        Mantenha o app aberto pra cronômetro continuar contando
      </p>
    </div>
  );
}

/**
 * Tela "done" — captura intensidade, distância (se aplicável) e notas.
 * Auto-preenche durationMinutes do cronômetro.
 */
function DoneTrackerView({
  activity,
  elapsedSecs,
  onCancel,
  onSaved,
}: {
  activity: ActivityType;
  elapsedSecs: number;
  onCancel: () => void;
  onSaved: (shareData: ShareWorkoutData) => void;
}) {
  const [intensity, setIntensity] = useState<IntensityLevel>("moderate");
  const [distance, setDistance] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, startSaving] = useTransition();

  // Arredonda pra ao menos 1 minuto (se finalizar em < 60s)
  const durationMinutes = Math.max(1, Math.round(elapsedSecs / 60));
  const showDistance = DISTANCE_ACTIVITIES.includes(activity);

  // Calorias via MET × peso × tempo (assume 70kg)
  const estimatedCalories = useMemo(() => {
    const met = ACTIVITY_MET[activity][intensity];
    const weightKg = 70;
    return Math.round(met * weightKg * (durationMinutes / 60));
  }, [activity, intensity, durationMinutes]);

  const submit = () => {
    if (durationMinutes <= 0) {
      toast.error({
        title: "Duração inválida",
        description: "Cronômetro precisa ter ao menos 1 minuto.",
      });
      return;
    }
    const dist = parseFloat(distance.replace(",", "."));
    startSaving(async () => {
      const result = await logOtherWorkout({
        activityType: activity,
        durationMinutes,
        intensity,
        distanceKm:
          showDistance && Number.isFinite(dist) && dist > 0 ? dist : null,
        estimatedCalories,
        notes,
        sessionDate: new Date().toISOString().slice(0, 10),
      });
      if (result.ok) {
        toast.success({
          title: "Atividade salva",
          description: `${ACTIVITY_LABEL[activity]} · ${durationMinutes}min · ${INTENSITY_LABEL[intensity]}`,
        });
        for (const ach of result.data?.newAchievements ?? []) {
          toast.success({
            title: `🏆 Nova conquista: ${ach.emoji} ${ach.title}`,
            description: `${ach.description} (+${ach.xp} XP)`,
          });
        }
        // Monta dados pro share modal estilo Strava
        const secondary: ShareWorkoutData["secondaryStats"] = [
          { value: `${durationMinutes} min`, label: "tempo" },
          { value: `${estimatedCalories} kcal`, label: "calorias" },
          { value: INTENSITY_LABEL[intensity], label: "intensidade" },
        ];
        const distNum =
          showDistance && Number.isFinite(dist) && dist > 0 ? dist : null;
        const primaryStat = distNum
          ? { value: `${distNum.toFixed(1)} km`, label: "distância" }
          : { value: `${durationMinutes}`, label: "minutos" };
        onSaved({
          kind: "other",
          title: `${ACTIVITY_LABEL[activity]} concluída`,
          emoji: ACTIVITY_EMOJI[activity],
          primaryStat,
          secondaryStats: distNum ? secondary : secondary.slice(0, 2),
        });
      } else {
        toast.error({ title: "Erro", description: result.error });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Hero "done" */}
      <section className="overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white px-5 py-6 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-emerald-800">
          <Check className="h-3 w-3" />
          Atividade finalizada
        </div>
        <div className="mt-3 text-[16px] font-medium text-zinc-700">
          <span aria-hidden className="mr-1">
            {ACTIVITY_EMOJI[activity]}
          </span>
          {ACTIVITY_LABEL[activity]}
        </div>
        <div className="mt-2 text-[44px] font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">
          {fmtDuration(elapsedSecs)}
        </div>
        <div className="mt-1 text-[11px] text-zinc-500">
          ~{durationMinutes} {durationMinutes === 1 ? "minuto" : "minutos"}{" "}
          gravado{durationMinutes === 1 ? "" : "s"}
        </div>
      </section>

      {/* Intensidade */}
      <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-3.5">
        <label className="block text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
          Como foi a intensidade?
        </label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {INTENSITIES.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIntensity(i)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition",
                intensity === i
                  ? i === "high"
                    ? "border-rose-300 bg-rose-50 text-rose-800"
                    : i === "moderate"
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
              )}
            >
              {INTENSITY_LABEL[i]}
            </button>
          ))}
        </div>
      </section>

      {/* Distância opcional */}
      {showDistance && (
        <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-3.5">
          <label className="block text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
            Distância (km) — opcional
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="ex: 15"
            min="0"
            step="0.1"
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[16px] tabular-nums text-zinc-900 focus:border-brand-400 focus:outline-none"
          />
        </section>
      )}

      {/* Notas */}
      <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-3.5">
        <label className="block text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
          Notas <span className="text-zinc-400">— opcional</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Como foi? Algum detalhe que vale anotar?"
          rows={2}
          maxLength={300}
          className="mt-1 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12.5px] text-zinc-800 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
        />
      </section>

      {/* Preview calorias */}
      <div className="inline-flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-[12px] text-orange-900">
        <Flame className="h-3.5 w-3.5 text-orange-500" />
        <span>
          Estimativa:{" "}
          <strong className="tabular-nums">~{estimatedCalories} kcal</strong>{" "}
          <span className="text-orange-700/70">(MET × 70kg × tempo)</span>
        </span>
      </div>

      {/* Save / Cancel */}
      <section className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            if (!confirm("Descartar essa atividade? Os dados não serão salvos."))
              return;
            onCancel();
          }}
          disabled={saving}
          className="flex-1 rounded-xl border border-zinc-200 bg-white py-3 text-[13px] font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
        >
          Descartar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 py-3 text-[14px] font-semibold text-white shadow-sm transition disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando…
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Salvar
            </>
          )}
        </button>
      </section>
    </div>
  );
}

/**
 * Modal para registro retroativo (sem cronômetro) — mantido pra quando o
 * usuário esqueceu de iniciar o tracker e quer logar uma atividade que
 * já aconteceu.
 */
function LogActivityModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [activityType, setActivityType] = useState<ActivityType>("bike");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [intensity, setIntensity] = useState<IntensityLevel>("moderate");
  const [distance, setDistance] = useState("");
  const [notes, setNotes] = useState("");
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [saving, startSaving] = useTransition();

  // Calorias estimadas via MET (assume peso 70kg como fallback — pode
  // ler do profile depois)
  const estimatedCalories = useMemo(() => {
    const mins = parseInt(durationMinutes, 10);
    if (!Number.isFinite(mins) || mins <= 0) return null;
    const met = ACTIVITY_MET[activityType][intensity];
    const weightKg = 70; // TODO: pegar do profile
    return Math.round(met * weightKg * (mins / 60));
  }, [activityType, intensity, durationMinutes]);

  const showDistance = DISTANCE_ACTIVITIES.includes(activityType);

  const submit = () => {
    const mins = parseInt(durationMinutes, 10);
    if (!Number.isFinite(mins) || mins <= 0) {
      toast.error({
        title: "Duração inválida",
        description: "Informe ao menos 1 minuto.",
      });
      return;
    }
    const dist = parseFloat(distance.replace(",", "."));
    startSaving(async () => {
      const result = await logOtherWorkout({
        activityType,
        durationMinutes: mins,
        intensity,
        distanceKm:
          showDistance && Number.isFinite(dist) && dist > 0 ? dist : null,
        estimatedCalories,
        notes,
        sessionDate,
      });
      if (result.ok) {
        toast.success({
          title: "Atividade registrada",
          description: `${ACTIVITY_LABEL[activityType]} · ${mins}min · ${INTENSITY_LABEL[intensity]}`,
        });
        for (const ach of result.data?.newAchievements ?? []) {
          toast.success({
            title: `🏆 Nova conquista: ${ach.emoji} ${ach.title}`,
            description: `${ach.description} (+${ach.xp} XP)`,
          });
        }
        onSaved();
      } else {
        toast.error({ title: "Erro", description: result.error });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-[520px] sm:rounded-3xl rounded-t-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-[17px] font-semibold leading-tight text-zinc-900">
              Registrar atividade passada
            </h2>
            <p className="mt-0.5 text-[11.5px] text-zinc-500">
              Treino que já aconteceu — sem cronômetro
            </p>
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
          {/* Atividade — chip grid */}
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
              Atividade
            </label>
            <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {ACTIVITIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setActivityType(a)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[10.5px] font-medium transition",
                    activityType === a
                      ? "border-brand-700 bg-brand-50 text-brand-900 shadow-sm"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                  )}
                >
                  <span className="text-[18px]">{ACTIVITY_EMOJI[a]}</span>
                  <span>{ACTIVITY_LABEL[a]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duração + distância */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
                Duração (min)
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="45"
                min="1"
                step="1"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[16px] tabular-nums text-zinc-900 focus:border-brand-400 focus:outline-none"
              />
            </div>
            {showDistance && (
              <div>
                <label className="block text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
                  Distância (km)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="15"
                  min="0"
                  step="0.1"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[16px] tabular-nums text-zinc-900 focus:border-brand-400 focus:outline-none"
                />
                <p className="mt-1 text-[10.5px] text-zinc-400">Opcional</p>
              </div>
            )}
          </div>

          {/* Intensidade */}
          <div className="mt-5">
            <label className="block text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
              Intensidade
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {INTENSITIES.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIntensity(i)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-[12px] font-semibold transition",
                    intensity === i
                      ? i === "high"
                        ? "border-rose-300 bg-rose-50 text-rose-800"
                        : i === "moderate"
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                  )}
                >
                  {INTENSITY_LABEL[i]}
                </button>
              ))}
            </div>
          </div>

          {/* Data */}
          <div className="mt-5">
            <label className="block text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
              <Calendar className="-mt-0.5 mr-1 inline h-3 w-3" />
              Quando foi?
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 focus:border-brand-400 focus:outline-none"
            />
          </div>

          {/* Notas opcional */}
          <div className="mt-5">
            <label className="block text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
              Notas <span className="text-zinc-400">— opcional</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Como foi? Algum detalhe que vale anotar?"
              rows={2}
              maxLength={300}
              className="mt-1 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12.5px] text-zinc-800 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
            />
          </div>

          {/* Preview calorias */}
          {estimatedCalories !== null && estimatedCalories > 0 && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-[12px] text-orange-900">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              <span>
                Estimativa:{" "}
                <strong className="tabular-nums">~{estimatedCalories} kcal</strong>{" "}
                <span className="text-orange-700/70">
                  (MET × peso × tempo · assume 70kg)
                </span>
              </span>
            </div>
          )}
        </div>

        <footer className="border-t border-zinc-100 px-5 py-3">
          <button
            type="button"
            onClick={submit}
            disabled={saving || !durationMinutes}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 px-5 py-3 text-[14px] font-semibold text-white transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gravando…
              </>
            ) : (
              <>Registrar</>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
