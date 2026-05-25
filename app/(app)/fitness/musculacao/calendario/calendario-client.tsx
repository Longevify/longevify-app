"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Dumbbell,
  Flame,
  Sparkles,
  Play,
  X,
  Loader2,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkoutProgram } from "@/lib/fitness/types";
import type { MonthlyWorkoutSession, SessionDetail } from "@/lib/fitness/server";
import {
  MUSCLE_GROUP_EMOJI,
  MUSCLE_GROUP_LABEL,
  type MuscleGroup,
} from "@/lib/fitness/types";

/**
 * Calendário visual de treinos (Lucas 2026-05-25).
 *
 * Renderiza grid 7×6 de dias do mês. Cada dia:
 *  - Verde forte se tem treino completo de musculação
 *  - Verde escuro se foi corrida/cardio (outros tipos)
 *  - Outline brand se é "hoje"
 *  - Dot dourado se cai num dia do programa (round-robin)
 *
 * Click no dia abre BottomSheet com:
 *  - Treinos feitos naquele dia (com volume + sets + exercícios)
 *  - Próximo treino do programa (se for hoje/futuro)
 *  - CTAs: "Treinar agora" / "Ver detalhe completo"
 */

interface CalendarioClientProps {
  year: number;
  monthZero: number; // 0-11
  sessions: MonthlyWorkoutSession[];
  program: WorkoutProgram | null;
  todaysDayIndex: number | null; // qual dia do programa cai hoje
}

const MONTH_LABEL = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const WEEKDAYS_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];

export function CalendarioClient({
  year,
  monthZero,
  sessions,
  program,
  todaysDayIndex,
}: CalendarioClientProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Mapa: YYYY-MM-DD → sessions
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, MonthlyWorkoutSession[]>();
    for (const s of sessions) {
      const arr = map.get(s.date) ?? [];
      arr.push(s);
      map.set(s.date, arr);
    }
    return map;
  }, [sessions]);

  // Total volume + sets do mês pro header
  const monthStats = useMemo(() => {
    const strengthSessions = sessions.filter((s) => s.kind === "strength");
    const totalVolume = strengthSessions.reduce(
      (s, x) => s + x.totalVolume,
      0,
    );
    const totalSets = strengthSessions.reduce((s, x) => s + x.totalSets, 0);
    const trainedDays = new Set(sessions.map((s) => s.date)).size;
    return { totalVolume, totalSets, trainedDays };
  }, [sessions]);

  // Constrói grid: array de 42 dias (6 weeks × 7 days), cells antes/depois
  // do mês ficam null pra renderizar empty
  const monthGrid = useMemo(() => {
    const firstDay = new Date(Date.UTC(year, monthZero, 1));
    const startWeekday = firstDay.getUTCDay(); // 0=Sun
    const daysInMonth = new Date(Date.UTC(year, monthZero + 1, 0)).getUTCDate();

    const cells: Array<{ date: string; day: number } | null> = [];
    // Padding antes
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(monthZero + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ date: dStr, day: d });
    }
    // Padding depois
    while (cells.length < 42) cells.push(null);
    return cells;
  }, [year, monthZero]);

  // Navegar entre meses
  const goPrev = () => {
    const py = monthZero === 0 ? year - 1 : year;
    const pm = monthZero === 0 ? 12 : monthZero;
    router.push(`/fitness/musculacao/calendario?y=${py}&m=${pm}`);
  };
  const goNext = () => {
    const ny = monthZero === 11 ? year + 1 : year;
    const nm = monthZero === 11 ? 1 : monthZero + 2;
    router.push(`/fitness/musculacao/calendario?y=${ny}&m=${nm}`);
  };
  const goCurrent = () => {
    const now = new Date();
    router.push(
      `/fitness/musculacao/calendario?y=${now.getUTCFullYear()}&m=${now.getUTCMonth() + 1}`,
    );
  };

  // Click num dia
  const openDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    const daysSessions = sessionsByDate.get(dateStr) ?? [];
    if (daysSessions.length > 0) {
      // Carrega detalhe da primeira session (geralmente strength)
      const strengthSess =
        daysSessions.find((s) => s.kind === "strength") ?? daysSessions[0];
      setLoadingDetail(true);
      fetch(`/api/fitness/sessions/${strengthSess.sessionId}`)
        .then((r) => r.json())
        .then((data: { ok?: boolean; detail?: SessionDetail }) => {
          if (data.detail) setSessionDetail(data.detail);
        })
        .catch(() => {
          /* fall back to summary */
        })
        .finally(() => setLoadingDetail(false));
    } else {
      setSessionDetail(null);
    }
  };

  const closeDay = () => {
    setSelectedDate(null);
    setSessionDetail(null);
  };

  // Qual dia do programa cai naquela data? — round-robin a partir da
  // criação do programa
  const programDayForDate = (dateStr: string) => {
    if (!program) return null;
    const totalDays = program.structure.days.length;
    if (totalDays === 0) return null;
    const created = new Date(program.createdAt);
    const target = new Date(dateStr + "T12:00:00Z");
    const diffDays = Math.floor(
      (target.getTime() - created.getTime()) / 86_400_000,
    );
    if (diffDays < 0) return null;
    const cycleIdx = diffDays % totalDays;
    return {
      dayIndex: cycleIdx + 1,
      day: program.structure.days[cycleIdx],
    };
  };

  const selectedDaySessions = selectedDate
    ? (sessionsByDate.get(selectedDate) ?? [])
    : [];
  const selectedProgramDay = selectedDate
    ? programDayForDate(selectedDate)
    : null;
  const isSelectedToday = selectedDate === todayStr;
  const isSelectedFuture = selectedDate ? selectedDate > todayStr : false;

  return (
    <div className="pb-12">
      <Link
        href="/fitness/musculacao"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-500 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar pra musculação
      </Link>

      <header className="mb-5">
        <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-800">
          <CalendarIcon className="h-3 w-3" />
          Calendário de treinos
        </div>
        <h1 className="mt-1 text-[22px] font-semibold leading-tight text-zinc-900">
          {MONTH_LABEL[monthZero]} {year}
        </h1>
        <p className="mt-1 text-[12px] text-zinc-500">
          Clique em qualquer dia pra ver os exercícios e sets daquele treino.
        </p>
      </header>

      {/* Stats do mês */}
      <section className="mb-4 grid grid-cols-3 gap-2">
        <MonthStat
          icon={<Flame className="h-3.5 w-3.5 text-orange-500" />}
          label="Dias treinados"
          value={`${monthStats.trainedDays}`}
        />
        <MonthStat
          icon={<Dumbbell className="h-3.5 w-3.5 text-brand-700" />}
          label="Sets"
          value={`${monthStats.totalSets}`}
        />
        <MonthStat
          icon={<Target className="h-3.5 w-3.5 text-emerald-600" />}
          label="Volume"
          value={`${(monthStats.totalVolume / 1000).toFixed(1)}t`}
          hint="kg movidos"
        />
      </section>

      {/* Nav mês */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={goCurrent}
          className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100"
        >
          Hoje
        </button>
        <button
          type="button"
          onClick={goNext}
          className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Calendário */}
      <section className="rounded-3xl border border-zinc-200 bg-white p-3">
        {/* Cabeçalho dos dias da semana */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEKDAYS_SHORT.map((d, i) => (
            <div
              key={i}
              className="grid h-6 place-items-center text-[10px] font-semibold uppercase text-zinc-400"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grid de células */}
        <div className="grid grid-cols-7 gap-1">
          {monthGrid.map((cell, i) => {
            if (!cell) return <div key={`pad-${i}`} className="aspect-square" />;
            const daysSessions = sessionsByDate.get(cell.date) ?? [];
            const hasStrength = daysSessions.some((s) => s.kind === "strength");
            const hasCardio = daysSessions.some(
              (s) => s.kind === "running" || s.kind === "cardio",
            );
            const hasOther = daysSessions.some((s) => s.kind === "other");
            const isToday = cell.date === todayStr;
            const isFuture = cell.date > todayStr;

            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => openDay(cell.date)}
                className={cn(
                  "group relative aspect-square rounded-xl border text-left transition",
                  "active:scale-95",
                  isToday
                    ? "border-brand-400 bg-brand-50"
                    : hasStrength
                      ? "border-emerald-200 bg-emerald-50 hover:border-emerald-400"
                      : hasCardio || hasOther
                        ? "border-amber-200 bg-amber-50/60 hover:border-amber-300"
                        : "border-zinc-100 bg-white hover:bg-zinc-50",
                  isFuture && !isToday && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "absolute left-1.5 top-1.5 text-[12px] font-semibold tabular-nums",
                    isToday
                      ? "text-brand-900"
                      : hasStrength
                        ? "text-emerald-900"
                        : "text-zinc-700",
                  )}
                >
                  {cell.day}
                </span>
                {/* Dots indicadores */}
                <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                  {hasStrength && (
                    <span className="block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  )}
                  {hasCardio && (
                    <span className="block h-1.5 w-1.5 rounded-full bg-orange-500" />
                  )}
                  {hasOther && (
                    <span className="block h-1.5 w-1.5 rounded-full bg-violet-500" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[10px] text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Musculação
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            Corrida/Cardio
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            Outros
          </span>
        </div>
      </section>

      {/* CTA "Treinar agora" se programa ativo */}
      {program && todaysDayIndex && (
        <Link
          href="/fitness/musculacao/hoje"
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-700 to-brand-800 px-4 py-3.5 text-white shadow-md transition hover:shadow-lg"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
            <Play className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
              Vou treinar agora
            </div>
            <div className="mt-0.5 text-[14.5px] font-semibold leading-tight">
              Dia {todaysDayIndex} ·{" "}
              {program.structure.days[todaysDayIndex - 1]?.name ?? "—"}
            </div>
            <div className="mt-0.5 text-[10.5px] text-white/70">
              Preencha reps e kg pra registrar a evolução
            </div>
          </div>
          <span className="shrink-0 text-white">→</span>
        </Link>
      )}

      {!program && (
        <Link
          href="/fitness/musculacao/programa"
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-brand-300 bg-brand-50/50 px-4 py-3.5 transition hover:bg-brand-50"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-700 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold text-brand-900">
              Você ainda não tem um plano
            </div>
            <div className="mt-0.5 text-[10.5px] text-brand-700/80">
              Gere um treino com Dr. Lon pra começar a evoluir
            </div>
          </div>
          <span className="shrink-0 text-brand-700">→</span>
        </Link>
      )}

      {/* Bottom Sheet — detalhes do dia selecionado */}
      {selectedDate && (
        <DaySheet
          date={selectedDate}
          sessions={selectedDaySessions}
          sessionDetail={sessionDetail}
          loadingDetail={loadingDetail}
          programDay={selectedProgramDay}
          isToday={isSelectedToday}
          isFuture={isSelectedFuture}
          onClose={closeDay}
        />
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────

function MonthStat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2.5">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-[18px] font-semibold leading-tight text-zinc-900 tabular-nums">
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-[9.5px] text-zinc-400">{hint}</div>
      )}
    </div>
  );
}

function DaySheet({
  date,
  sessions,
  sessionDetail,
  loadingDetail,
  programDay,
  isToday,
  isFuture,
  onClose,
}: {
  date: string;
  sessions: MonthlyWorkoutSession[];
  sessionDetail: SessionDetail | null;
  loadingDetail: boolean;
  programDay: { dayIndex: number; day: WorkoutProgram["structure"]["days"][number] } | null;
  isToday: boolean;
  isFuture: boolean;
  onClose: () => void;
}) {
  const formatted = new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const hasSessions = sessions.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[88dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-[480px] sm:rounded-3xl rounded-t-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {isToday ? "Hoje" : isFuture ? "Programado" : "Treino registrado"}
            </div>
            <h2 className="mt-0.5 text-[16px] font-semibold capitalize leading-tight text-zinc-900">
              {formatted}
            </h2>
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
          {/* CASO 1: Já tem treino registrado nesse dia */}
          {hasSessions && (
            <>
              {sessions.map((s) => (
                <SessionSummaryCard key={s.sessionId} session={s} />
              ))}

              {loadingDetail && (
                <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-zinc-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Carregando exercícios…
                </div>
              )}

              {sessionDetail && !loadingDetail && (
                <SessionDetailView detail={sessionDetail} />
              )}
            </>
          )}

          {/* CASO 2: Sem treino + é hoje/futuro → mostra plano */}
          {!hasSessions && (isToday || isFuture) && programDay && (
            <div>
              <div className="rounded-2xl border border-brand-200 bg-brand-50/30 px-4 py-3.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-800">
                  📋 Plano do programa · Dia {programDay.dayIndex}
                </div>
                <h3 className="mt-1 text-[16px] font-semibold text-brand-900">
                  {programDay.day.name}
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10.5px]">
                  {programDay.day.focus.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-0.5 rounded-full bg-white px-2 py-0.5 ring-1 ring-brand-200"
                    >
                      {MUSCLE_GROUP_EMOJI[f as MuscleGroup] ?? "💪"}
                      <span className="text-brand-900">
                        {MUSCLE_GROUP_LABEL[f as MuscleGroup] ?? f}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <h4 className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
                  Exercícios planejados
                </h4>
                <ul className="space-y-1.5">
                  {programDay.day.exercises.map((ex, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-white px-3 py-2.5"
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-zinc-100 text-[10px] font-semibold text-zinc-600">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-medium text-zinc-900">
                          {ex.exerciseName ?? ex.exerciseId}
                        </div>
                        <div className="mt-0.5 text-[10.5px] text-zinc-500 tabular-nums">
                          <strong className="text-zinc-700">
                            {ex.targetSets}
                          </strong>{" "}
                          ×{" "}
                          <strong className="text-zinc-700">
                            {ex.targetReps}
                          </strong>{" "}
                          reps
                          {ex.targetRpe && ` · RPE ${ex.targetRpe}`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {isToday && (
                <Link
                  href="/fitness/musculacao/hoje"
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 px-4 py-3 text-[14px] font-semibold text-white shadow-sm"
                >
                  <Play className="h-4 w-4" />
                  Treinar agora — registrar reps & kg
                </Link>
              )}
            </div>
          )}

          {/* CASO 3: Dia passado sem treino */}
          {!hasSessions && !isToday && !isFuture && (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/40 px-4 py-8 text-center">
              <CalendarIcon className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
              <p className="text-[13px] font-medium text-zinc-700">
                Nenhum treino nesse dia
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Dia de descanso ou treino não registrado
              </p>
            </div>
          )}

          {/* CASO 4: Sem treino + hoje/futuro + sem programa */}
          {!hasSessions && (isToday || isFuture) && !programDay && (
            <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/30 px-4 py-6 text-center">
              <Sparkles className="mx-auto mb-2 h-7 w-7 text-brand-500" />
              <p className="text-[13px] font-medium text-brand-900">
                Sem plano ativo
              </p>
              <p className="mt-1 text-[11px] text-brand-700/70">
                Gere um treino personalizado com Dr. Lon
              </p>
              <Link
                href="/fitness/musculacao/programa"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-3 py-2 text-[12px] font-semibold text-white"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Gerar programa
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionSummaryCard({ session }: { session: MonthlyWorkoutSession }) {
  const kindLabel: Record<MonthlyWorkoutSession["kind"], string> = {
    strength: "💪 Musculação",
    running: "🏃 Corrida",
    cardio: "🚴 Cardio",
    other: "🧘 Outros",
  };
  const startedAt = new Date(session.startedAt);
  const endedAt = session.endedAt ? new Date(session.endedAt) : null;
  const durationMin = endedAt
    ? Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000)
    : null;
  return (
    <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-semibold text-emerald-900">
          {kindLabel[session.kind]}
        </span>
        <span className="text-[10.5px] text-emerald-700/80 tabular-nums">
          {startedAt.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {durationMin && ` · ${durationMin}min`}
        </span>
      </div>
      {session.totalSets > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[16px] font-semibold text-emerald-900 tabular-nums">
              {session.totalSets}
            </div>
            <div className="text-[9.5px] uppercase tracking-wide text-emerald-700/70">
              sets
            </div>
          </div>
          <div>
            <div className="text-[16px] font-semibold text-emerald-900 tabular-nums">
              {session.totalReps}
            </div>
            <div className="text-[9.5px] uppercase tracking-wide text-emerald-700/70">
              reps
            </div>
          </div>
          <div>
            <div className="text-[16px] font-semibold text-emerald-900 tabular-nums">
              {session.totalVolume > 0
                ? `${Math.round(session.totalVolume).toLocaleString("pt-BR")}`
                : "—"}
            </div>
            <div className="text-[9.5px] uppercase tracking-wide text-emerald-700/70">
              kg
            </div>
          </div>
        </div>
      )}
      {session.exerciseNames.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {session.exerciseNames.map((name) => (
            <span
              key={name}
              className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-emerald-900 ring-1 ring-emerald-200"
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionDetailView({ detail }: { detail: SessionDetail }) {
  return (
    <div className="mt-4">
      <h4 className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
        Detalhe dos sets
      </h4>
      <ul className="space-y-2">
        {detail.exercises.map((ex) => (
          <li
            key={ex.exerciseId}
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
          >
            <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50/60 px-3 py-2">
              {ex.muscleGroup && (
                <span className="text-[14px]">
                  {MUSCLE_GROUP_EMOJI[ex.muscleGroup]}
                </span>
              )}
              <span className="flex-1 truncate text-[13px] font-semibold text-zinc-900">
                {ex.exerciseName}
              </span>
              <span className="text-[10.5px] text-zinc-500 tabular-nums">
                {ex.sets.length} sets
              </span>
            </div>
            <ul className="divide-y divide-zinc-100">
              {ex.sets.map((s, i) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 px-3 py-1.5 text-[12px] tabular-nums"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-600">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-zinc-700">
                    {s.weightKg ? `${s.weightKg}kg` : "BW"} × {s.reps}
                  </span>
                  {s.rpe && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-zinc-600">
                      RPE {s.rpe}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
