"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Moon,
  Activity,
  CheckCircle2,
  Circle,
  ArrowRight,
  Watch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  sleepScore,
  exerciseScore,
  scoreColor,
} from "@/lib/wearables/metric-score";
import {
  WearableMetricPopup,
  type MetricPoint,
} from "@/components/home/wearable-metric-popup";
import { TaskHistoryPopup } from "@/components/home/task-history-popup";
import type { ProtocolTask } from "@/lib/protocolo/tasks";

/**
 * Grid 2x2 com indicadores visuais de progresso pra cada quesito.
 * - Sono: minutos vs target — CLICÁVEL abre popup com histórico + score
 * - Exercício: minutos vs target — CLICÁVEL abre popup
 * - Tasks feitas: count + percentual de conclusão (link pra /protocolo)
 * - Tasks a fazer: count pendente (link pra /protocolo)
 *
 * Lucas (2026-05-21): "Quando clicar em algum card da aba home, tem
 * que abrir a aba mostrando a evolução, histórico (que pode mudar
 * l7d, l30d, l6m) e o overall score, tipo 'seu sono está com uma
 * pontuação de 82'."
 */

interface DailyHistoryPoint {
  date: string; // ISO YYYY-MM-DD
  sleepMinutes: number;
  exerciseMinutes: number;
}

interface DailyProgressGridProps {
  sleepMinutes: number;
  sleepTargetMinutes: number;
  exerciseMinutes: number;
  exerciseTargetMinutes: number;
  totalTasks: number;
  /**
   * Histórico de daily metrics (idealmente últimos 180 dias) pra alimentar
   * o popup de detalhe quando user clica num card. Ordem asc (antigo → hoje).
   */
  metricsHistory?: DailyHistoryPoint[];
  /**
   * Quando false, cards sono/exercício mostram empty state "Conectar
   * wearable" em vez de 0/7h30 (Lucas 2026-05-21: ver "0" todo dia é
   * frustrante pra user real sem Apple Health/Oura). Demo passa true.
   */
  hasWearableData?: boolean;
  /**
   * Lista completa de tasks rule-based (mesma do /protocolo) pra
   * alimentar o popup de histórico ao clicar nos cards de to-do.
   */
  tasks?: ProtocolTask[];
  /**
   * Histórico de completions dos últimos 30 dias pra calendar heatmap
   * no TaskHistoryPopup. Vindo do server (getTaskCompletionsHistory).
   */
  completionsHistory?: Array<{ date: string; count: number }>;
  /** Streak atual pra exibir no popup de tasks. */
  streakDays?: number;
  className?: string;
}

const TASKS_STORAGE_KEY = "longevify-tasks-done";

export function DailyProgressGrid({
  sleepMinutes,
  sleepTargetMinutes,
  exerciseMinutes,
  exerciseTargetMinutes,
  totalTasks,
  metricsHistory = [],
  hasWearableData = true,
  tasks = [],
  completionsHistory = [],
  streakDays = 0,
  className,
}: DailyProgressGridProps) {
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [openMetric, setOpenMetric] = useState<"sleep" | "exercise" | null>(null);
  const [openTasksPopup, setOpenTasksPopup] = useState(false);

  // Lê tasks feitas do localStorage (mesma chave do /protocolo)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TASKS_STORAGE_KEY);
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        setDoneIds(new Set(Array.isArray(ids) ? ids : []));
      }
    } catch {
      // ignore
    }
  }, []);

  const doneCount = doneIds.size;

  const pendingTasks = Math.max(0, totalTasks - doneCount);
  const tasksPct =
    totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  // Computa score 0-100 pro card de hoje (mostra inline além da barra de %)
  const todaySleepScore = sleepScore(sleepMinutes);
  const todayExerciseScore = exerciseScore(exerciseMinutes);

  // Pré-computa histórico de scores pra alimentar o popup
  const sleepHistory = useMemo<MetricPoint[]>(
    () =>
      metricsHistory.map((p) => ({
        date: p.date,
        value: p.sleepMinutes,
        score: sleepScore(p.sleepMinutes),
      })),
    [metricsHistory],
  );
  const exerciseHistory = useMemo<MetricPoint[]>(
    () =>
      metricsHistory.map((p) => ({
        date: p.date,
        value: p.exerciseMinutes,
        score: exerciseScore(p.exerciseMinutes),
      })),
    [metricsHistory],
  );

  return (
    <>
      <div className={cn("grid grid-cols-2 gap-3", className)}>
        {hasWearableData ? (
          <ClickableProgressCard
            icon={Moon}
            iconAccent="bg-indigo-50 text-indigo-700"
            label="Sono"
            value={formatHM(sleepMinutes)}
            target={`/ ${formatHM(sleepTargetMinutes)}`}
            scoreValue={todaySleepScore}
            progressPct={Math.min(
              100,
              Math.round((sleepMinutes / sleepTargetMinutes) * 100),
            )}
            progressColor="from-indigo-400 to-indigo-600"
            onClick={() => setOpenMetric("sleep")}
          />
        ) : (
          <ConnectWearableCard
            icon={Moon}
            iconAccent="bg-indigo-50 text-indigo-700"
            label="Sono"
          />
        )}
        {hasWearableData ? (
          <ClickableProgressCard
            icon={Activity}
            iconAccent="bg-emerald-50 text-emerald-700"
            label="Exercício"
            value={`${exerciseMinutes} min`}
            target={`/ ${exerciseTargetMinutes} min`}
            scoreValue={todayExerciseScore}
            progressPct={Math.min(
              100,
              Math.round((exerciseMinutes / exerciseTargetMinutes) * 100),
            )}
            progressColor="from-emerald-400 to-emerald-600"
            onClick={() => setOpenMetric("exercise")}
          />
        ) : (
          <ConnectWearableCard
            icon={Activity}
            iconAccent="bg-emerald-50 text-emerald-700"
            label="Exercício"
          />
        )}
        <ProgressCardButton
          icon={CheckCircle2}
          iconAccent="bg-brand-50 text-brand-700"
          label="Feitas hoje"
          value={`${doneCount}`}
          target={totalTasks > 0 ? `de ${totalTasks}` : "sem tarefas"}
          progressPct={tasksPct}
          progressColor="from-brand-400 to-brand-600"
          onClick={() => setOpenTasksPopup(true)}
        />
        <ProgressCardButton
          icon={Circle}
          iconAccent="bg-amber-50 text-amber-700"
          label="A fazer"
          value={`${pendingTasks}`}
          target={pendingTasks === 0 ? "tudo feito 🎉" : "pendentes"}
          progressPct={
            totalTasks > 0
              ? Math.min(100, Math.round((pendingTasks / totalTasks) * 100))
              : 0
          }
          progressColor="from-amber-400 to-amber-600"
          onClick={() => setOpenTasksPopup(true)}
        />
      </div>

      {/* Popups de detalhe — abrem ao clicar nos cards de sono/exercício */}
      <WearableMetricPopup
        open={openMetric === "sleep"}
        onClose={() => setOpenMetric(null)}
        metricKind="sleep"
        title="Sono"
        unit="min"
        history={sleepHistory}
        accentColor="#4f46e5"
      />
      <WearableMetricPopup
        open={openMetric === "exercise"}
        onClose={() => setOpenMetric(null)}
        metricKind="exercise"
        title="Exercício"
        unit="min"
        history={exerciseHistory}
        accentColor="#10b981"
      />
      {/* Popup de histórico de tasks — abre nos cards "Feitas hoje" / "A fazer" */}
      <TaskHistoryPopup
        open={openTasksPopup}
        onClose={() => setOpenTasksPopup(false)}
        tasks={tasks}
        doneIds={doneIds}
        completionsHistory={completionsHistory}
        streakDays={streakDays}
      />
    </>
  );
}

function formatHM(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0h";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

// ─── Card variants ────────────────────────────────────────────────────────

interface BaseCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconAccent: string;
  label: string;
  value: string;
  target: string;
  progressPct: number;
  progressColor: string;
}

interface ClickableProgressCardProps extends BaseCardProps {
  scoreValue: number;
  onClick: () => void;
}

/** Card clicável (sono, exercício) com score 0-100 sobreposto. */
function ClickableProgressCard({
  icon: Icon,
  iconAccent,
  label,
  value,
  target,
  scoreValue,
  progressPct,
  progressColor,
  onClick,
}: ClickableProgressCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-white p-4 text-left shadow-[0_4px_16px_-10px_rgba(13,40,24,.1)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_22px_-10px_rgba(13,40,24,.15)]"
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "grid h-8 w-8 place-items-center rounded-xl",
            iconAccent,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span
          className={cn(
            "rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums",
            scoreColor(scoreValue),
          )}
        >
          {scoreValue}/100
        </span>
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {label}
        </div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-[22px] font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">
            {value}
          </span>
          <span className="text-[11px] text-zinc-500">{target}</span>
        </div>
      </div>
      <div className="relative h-1 overflow-hidden rounded-full bg-zinc-100">
        <span
          className={cn(
            "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-[width] duration-1000",
            progressColor,
          )}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </button>
  );
}

interface ProgressCardButtonProps extends BaseCardProps {
  onClick: () => void;
}

/**
 * Card botão (tasks feitas, tasks a fazer) — abre TaskHistoryPopup.
 * Lucas (2026-05-21): click vira popup com histórico em vez de
 * navegar pra /protocolo (movimento dentro do contexto da home).
 */
function ProgressCardButton({
  icon: Icon,
  iconAccent,
  label,
  value,
  target,
  progressPct,
  progressColor,
  onClick,
}: ProgressCardButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-white p-4 text-left shadow-[0_4px_16px_-10px_rgba(13,40,24,.1)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_22px_-10px_rgba(13,40,24,.15)]"
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "grid h-8 w-8 place-items-center rounded-xl",
            iconAccent,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-zinc-300 transition group-hover:text-brand-600" />
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {label}
        </div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-[22px] font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">
            {value}
          </span>
          <span className="text-[11px] text-zinc-500">{target}</span>
        </div>
      </div>
      <div className="relative h-1 overflow-hidden rounded-full bg-zinc-100">
        <span
          className={cn(
            "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-[width] duration-1000",
            progressColor,
          )}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </button>
  );
}

// ─── ConnectWearableCard ────────────────────────────────────────────────

interface ConnectWearableCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconAccent: string;
  label: string;
}

function ConnectWearableCard({
  icon: Icon,
  iconAccent,
  label,
}: ConnectWearableCardProps) {
  return (
    <Link
      href="/wearables"
      className="group flex flex-col gap-2 rounded-2xl border border-dashed border-zinc-300/80 bg-zinc-50/50 p-4 transition hover:border-brand-300 hover:bg-brand-50/30"
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "grid h-8 w-8 place-items-center rounded-xl opacity-60 group-hover:opacity-100",
            iconAccent,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-zinc-300 transition group-hover:text-brand-600" />
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {label}
        </div>
        <div className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-700">
          <Watch className="h-3 w-3" />
          Conectar wearable
        </div>
        <div className="text-[10.5px] text-zinc-500">
          Apple Health · Oura · Whoop
        </div>
      </div>
    </Link>
  );
}
