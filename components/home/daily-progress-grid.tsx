"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Moon, Activity, ArrowRight, Watch } from "lucide-react";
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
import {
  SleepDetailPopup,
  type SleepHistoryPoint,
} from "@/components/home/sleep-detail-popup";
import { SleepTimeline } from "@/components/home/sleep-timeline";
import type { SleepStages } from "@/lib/wearables-mock";

/**
 * Lucas (2026-05-21): "pode tirar os 2 cards 'feitas hoje' e 'a fazer'
 * do /home" — DailyProgressGrid agora tem só 2 cards (Sono + Exercício).
 * Tarefas vivem na TodoSidebar à direita.
 *
 * Cada card é CLICÁVEL e abre popup com histórico + score 0-100.
 */

interface DailyHistoryPoint {
  date: string; // ISO YYYY-MM-DD
  sleepMinutes: number;
  /** Phase 3 sleep — alimenta SleepDetailPopup tabs W/M */
  sleepStages?: SleepStages | null;
  exerciseMinutes: number;
}

interface DailyProgressGridProps {
  sleepMinutes: number;
  sleepStages?: SleepStages | null;
  sleepTargetMinutes: number;
  exerciseMinutes: number;
  exerciseTargetMinutes: number;
  /**
   * Histórico de daily metrics (idealmente últimos 180 dias) pra alimentar
   * o popup de detalhe quando user clica num card. Ordem asc (antigo → hoje).
   */
  metricsHistory?: DailyHistoryPoint[];
  /**
   * Quando false, cards sono/exercício mostram empty state "Conectar
   * wearable" em vez de 0/7h30. Demo passa true.
   */
  hasWearableData?: boolean;
  className?: string;
}

export function DailyProgressGrid({
  sleepMinutes,
  sleepStages,
  sleepTargetMinutes,
  exerciseMinutes,
  exerciseTargetMinutes,
  metricsHistory = [],
  hasWearableData = true,
  className,
}: DailyProgressGridProps) {
  const [openMetric, setOpenMetric] = useState<"sleep" | "exercise" | null>(null);

  // Computa score 0-100 pro card de hoje (mostra inline além da barra de %)
  const todaySleepScore = sleepScore(sleepMinutes);
  const todayExerciseScore = exerciseScore(exerciseMinutes);

  // Pré-computa histórico de scores pra alimentar o popup
  const sleepHistory = useMemo<SleepHistoryPoint[]>(
    () =>
      metricsHistory.map((p) => ({
        date: p.date,
        sleepMinutes: p.sleepMinutes,
        stages: p.sleepStages ?? null,
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
          <SleepCard
            sleepMinutes={sleepMinutes}
            sleepStages={sleepStages ?? null}
            sleepTargetMinutes={sleepTargetMinutes}
            scoreValue={todaySleepScore}
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
      </div>

      {/* Popups de detalhe — abrem ao clicar nos cards de sono/exercício.
          Lucas (2026-05-21): cards "Feitas hoje" / "A fazer" removidos —
          tarefas vivem só na TodoSidebar à direita (na home).
          Lucas (2026-05-22): sleep ganhou popup dedicado com tabs D/W/M
          (Apple-Health-style timeline na visão diária + stacked bars
          na semanal/mensal). */}
      <SleepDetailPopup
        open={openMetric === "sleep"}
        onClose={() => setOpenMetric(null)}
        history={sleepHistory}
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

// ─── SleepCard — variante com fases do sono (deep/core/REM/awake) ──────

interface SleepCardProps {
  sleepMinutes: number;
  sleepStages: SleepStages | null;
  sleepTargetMinutes: number;
  scoreValue: number;
  onClick: () => void;
}

/**
 * Lucas (2026-05-22): "No apple watch tem informações de quanto tempo
 * você dormiu em cada fase do sono (Profundo, leve, quando você
 * acordou, etc.) quero que você mostre isso no home também."
 *
 * Cores semelhantes Apple Health:
 *   - deep: roxo escuro (#5145C5)
 *   - core/light: azul médio (#3D80F0)
 *   - rem: azul claro (#8EC3F6)
 *   - awake: laranja/rosa (#E76A56)
 */
type StageMinKey = "deepMinutes" | "coreMinutes" | "remMinutes" | "awakeMinutes";

const STAGE_COLORS: Record<StageMinKey, { bg: string; label: string }> = {
  deepMinutes: { bg: "bg-indigo-800", label: "Profundo" },
  coreMinutes: { bg: "bg-blue-500", label: "Leve" },
  remMinutes: { bg: "bg-sky-300", label: "REM" },
  awakeMinutes: { bg: "bg-orange-400", label: "Acordado" },
};

function SleepCard({
  sleepMinutes,
  sleepStages,
  sleepTargetMinutes,
  scoreValue,
  onClick,
}: SleepCardProps) {
  const progressPct = Math.min(
    100,
    Math.round((sleepMinutes / sleepTargetMinutes) * 100),
  );

  // Calcula proporções pra stacked bar (caso falte sleepStages, fallback
  // pra única barra do sleepMinutes total estilo antes)
  const hasStages = !!sleepStages && sleepMinutes > 0;
  const totalForStages = sleepStages
    ? sleepStages.deepMinutes +
      sleepStages.coreMinutes +
      sleepStages.remMinutes +
      sleepStages.awakeMinutes
    : 0;

  const order: StageMinKey[] = [
    "deepMinutes",
    "coreMinutes",
    "remMinutes",
    "awakeMinutes",
  ];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-white p-4 text-left shadow-[0_4px_16px_-10px_rgba(13,40,24,.1)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_22px_-10px_rgba(13,40,24,.15)]"
    >
      <div className="flex items-center justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
          <Moon className="h-4 w-4" />
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
          Sono
        </div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-[22px] font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">
            {formatHM(sleepMinutes)}
          </span>
          <span className="text-[11px] text-zinc-500">
            / {formatHM(sleepTargetMinutes)}
          </span>
        </div>
      </div>

      {/* Mini timeline Apple-style (se houver segments) ou stacked bar */}
      {hasStages && sleepStages?.segments && sleepStages.segments.length > 0 ? (
        <div className="mt-1">
          <SleepTimeline
            segments={sleepStages.segments}
            height={52}
            compact
          />
          {/* Legend compacta com 4 fases — mais valor que stacked bar simples */}
          <ul className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9.5px]">
            {order.map((key) => {
              const min = sleepStages![key];
              return (
                <li
                  key={key}
                  className="flex items-center gap-1 truncate text-zinc-600 tabular-nums"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-sm",
                      STAGE_COLORS[key].bg,
                    )}
                    aria-hidden
                  />
                  <span className="truncate">{STAGE_COLORS[key].label}</span>
                  <span className="ml-auto text-zinc-500">{formatHM(min)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : hasStages ? (
        // Tem stages mas não segments — fallback pra stacked bar
        <div className="mt-1">
          <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100">
            {order.map((key) => {
              const min = sleepStages![key];
              if (min <= 0) return null;
              const widthPct = (min / totalForStages) * 100;
              return (
                <span
                  key={key}
                  className={cn(STAGE_COLORS[key].bg, "first:rounded-l-full last:rounded-r-full")}
                  style={{ width: `${widthPct}%` }}
                  title={`${STAGE_COLORS[key].label}: ${formatHM(min)}`}
                />
              );
            })}
          </div>
          <ul className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9.5px]">
            {order.map((key) => {
              const min = sleepStages![key];
              return (
                <li
                  key={key}
                  className="flex items-center gap-1 truncate text-zinc-600 tabular-nums"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-sm",
                      STAGE_COLORS[key].bg,
                    )}
                    aria-hidden
                  />
                  <span className="truncate">{STAGE_COLORS[key].label}</span>
                  <span className="ml-auto text-zinc-500">{formatHM(min)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        // Fallback (sem stages): barra única de progresso vs target
        <div className="relative h-1 overflow-hidden rounded-full bg-zinc-100">
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-[width] duration-1000"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
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
