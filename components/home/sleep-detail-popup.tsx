"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Moon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { SleepTimeline } from "./sleep-timeline";
import type { SleepStages, SleepStage } from "@/lib/wearables-mock";

/**
 * Lucas (2026-05-22): "tem que aparecer que nem a imagem anexada, um
 * retrato visual em horas da noite (quando mostrar a visão diária) e
 * barras com blocos coloridos empilhados quando mostrar a visão
 * semanal ou mensal."
 *
 * Popup completo de sono inspirado no Apple Health:
 *   - Tabs: D (diário) / W (semanal) / M (mensal)
 *   - D: Gráfico timeline Apple-style com 4 trilhas por fase
 *   - W: Stacked bars de 7 dias mostrando proporção das fases
 *   - M: Stacked bars de ~30 dias
 *   - Highlights abaixo: tempo médio, melhor dia, deep médio, etc.
 */

export interface SleepHistoryPoint {
  date: string; // YYYY-MM-DD
  sleepMinutes: number;
  stages?: SleepStages | null;
}

interface SleepDetailPopupProps {
  open: boolean;
  onClose: () => void;
  /** Histórico ordenado asc (antigo → hoje). Idealmente 30+ dias. */
  history: SleepHistoryPoint[];
}

type View = "day" | "week" | "month";

const STAGE_COLOR: Record<SleepStage, string> = {
  awake: "#F47A56",
  rem: "#8EC3F6",
  core: "#3D80F0",
  deep: "#5145C5",
};

const STAGE_LABEL: Record<SleepStage, string> = {
  deep: "Profundo",
  core: "Leve",
  rem: "REM",
  awake: "Acordado",
};

export function SleepDetailPopup({
  open,
  onClose,
  history,
}: SleepDetailPopupProps) {
  const [view, setView] = useState<View>("day");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Today's day = última entrada
  const today = history[history.length - 1] ?? null;
  const last7 = history.slice(-7);
  const last30 = history.slice(-30);

  // Stats agregadas pros highlights
  const stats = useMemo(() => {
    const compute = (rows: SleepHistoryPoint[]) => {
      if (rows.length === 0)
        return {
          avgSleep: 0,
          avgDeep: 0,
          avgCore: 0,
          avgRem: 0,
          avgAwake: 0,
          bestNight: null as SleepHistoryPoint | null,
        };
      let sumSleep = 0;
      let sumDeep = 0;
      let sumCore = 0;
      let sumRem = 0;
      let sumAwake = 0;
      let countStages = 0;
      let best = rows[0];
      for (const r of rows) {
        sumSleep += r.sleepMinutes;
        if (r.sleepMinutes > best.sleepMinutes) best = r;
        if (r.stages) {
          sumDeep += r.stages.deepMinutes;
          sumCore += r.stages.coreMinutes;
          sumRem += r.stages.remMinutes;
          sumAwake += r.stages.awakeMinutes;
          countStages += 1;
        }
      }
      return {
        avgSleep: Math.round(sumSleep / rows.length),
        avgDeep: countStages ? Math.round(sumDeep / countStages) : 0,
        avgCore: countStages ? Math.round(sumCore / countStages) : 0,
        avgRem: countStages ? Math.round(sumRem / countStages) : 0,
        avgAwake: countStages ? Math.round(sumAwake / countStages) : 0,
        bestNight: best,
      };
    };
    return {
      day: today
        ? {
            avgSleep: today.sleepMinutes,
            avgDeep: today.stages?.deepMinutes ?? 0,
            avgCore: today.stages?.coreMinutes ?? 0,
            avgRem: today.stages?.remMinutes ?? 0,
            avgAwake: today.stages?.awakeMinutes ?? 0,
            bestNight: today,
          }
        : compute([]),
      week: compute(last7),
      month: compute(last30),
    };
  }, [today, last7, last30]);

  const active = view === "day" ? stats.day : view === "week" ? stats.week : stats.month;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-[640px] sm:rounded-3xl rounded-t-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
              <Moon className="-mt-0.5 mr-1 inline h-3 w-3" />
              Sono
            </div>
            <h2 className="mt-0.5 text-[18px] font-semibold leading-tight text-zinc-900">
              {view === "day"
                ? today
                  ? new Date(today.date + "T00:00").toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    })
                  : "Hoje"
                : view === "week"
                  ? "Últimos 7 dias"
                  : "Últimos 30 dias"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Tab switcher D / W / M */}
        <div className="px-5 pt-3">
          <div className="flex rounded-full bg-zinc-100 p-1">
            {(["day", "week", "month"] as View[]).map((v) => {
              const lbl = v === "day" ? "D" : v === "week" ? "S" : "M";
              const full =
                v === "day" ? "Diário" : v === "week" ? "Semanal" : "Mensal";
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    "flex-1 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition",
                    view === v
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700",
                  )}
                  aria-label={full}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Hero — tempo total */}
          <div className="mb-4">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {view === "day" ? "Tempo dormido" : "Média"}
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-[32px] font-semibold tabular-nums leading-none text-zinc-900">
                {Math.floor(active.avgSleep / 60)}
              </span>
              <span className="text-[14px] font-medium text-zinc-500">hr</span>
              <span className="ml-2 text-[32px] font-semibold tabular-nums leading-none text-zinc-900">
                {active.avgSleep % 60}
              </span>
              <span className="text-[14px] font-medium text-zinc-500">min</span>
            </div>
          </div>

          {/* View principal: D / W / M */}
          {view === "day" && (
            <DayView point={today} />
          )}
          {view === "week" && <RangeView points={last7} label="7 dias" />}
          {view === "month" && (
            <RangeView points={last30} label="30 dias" />
          )}

          {/* Highlights — médias por fase */}
          <section className="mt-5 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Fases ({view === "day" ? "hoje" : view === "week" ? "média 7d" : "média 30d"})
            </h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StageStat label="Profundo" mins={active.avgDeep} color={STAGE_COLOR.deep} />
              <StageStat label="Leve" mins={active.avgCore} color={STAGE_COLOR.core} />
              <StageStat label="REM" mins={active.avgRem} color={STAGE_COLOR.rem} />
              <StageStat label="Acordado" mins={active.avgAwake} color={STAGE_COLOR.awake} />
            </ul>
          </section>

          {view !== "day" && stats[view].bestNight && (
            <section className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
              <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
                🏆 Melhor noite
              </h3>
              <p className="mt-1 text-[12.5px] text-emerald-900 tabular-nums">
                {new Date(
                  (stats[view].bestNight as SleepHistoryPoint).date + "T00:00",
                ).toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                })}{" "}
                · {fmtHM((stats[view].bestNight as SleepHistoryPoint).sleepMinutes)}
              </p>
            </section>
          )}

          <p className="mt-4 inline-flex items-start gap-1 rounded-md bg-zinc-50 px-2 py-1 text-[10px] text-zinc-500">
            <Info className="mt-0.5 h-2.5 w-2.5 shrink-0" />
            <span>
              Dados via Apple Health / Oura quando wearable estiver
              conectado. Sem fonte, mostra mock pra demo.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-views ────────────────────────────────────────────────────────

function DayView({ point }: { point: SleepHistoryPoint | null }) {
  if (!point || !point.stages?.segments?.length) {
    return (
      <div className="rounded-xl bg-zinc-50 px-4 py-6 text-center text-[12px] text-zinc-500">
        Sem timeline temporal pra esse dia.
      </div>
    );
  }
  return (
    <div>
      <div className="overflow-x-auto">
        <SleepTimeline segments={point.stages.segments} height={220} />
      </div>
    </div>
  );
}

function RangeView({
  points,
  label,
}: {
  points: SleepHistoryPoint[];
  label: string;
}) {
  // Stacked bars por dia: cada coluna mostra proporção das fases.
  if (points.length === 0) {
    return (
      <div className="rounded-xl bg-zinc-50 px-4 py-6 text-center text-[12px] text-zinc-500">
        Sem dados pra {label}.
      </div>
    );
  }

  // Encontra max altura (em min) entre os dias pra normalizar
  const maxMin = Math.max(...points.map((p) => p.sleepMinutes), 1);

  return (
    <div>
      <div className="flex items-end gap-1 overflow-x-auto pb-2" style={{ minHeight: 180 }}>
        {points.map((p) => {
          const total = p.sleepMinutes;
          const heightPct = (total / maxMin) * 100;
          const stages = p.stages;
          return (
            <div
              key={p.date}
              className="flex flex-1 min-w-[18px] flex-col items-center gap-1"
            >
              {/* Barra stacked */}
              <div
                className="relative flex w-full flex-col-reverse overflow-hidden rounded-md bg-zinc-100"
                style={{ height: 160 }}
                title={`${p.date}: ${fmtHM(total)}`}
              >
                {stages && total > 0 && (
                  <>
                    {/* Build stacks bottom-up: deep (bottom) → core → rem → awake (top) */}
                    {(["deep", "core", "rem", "awake"] as SleepStage[]).map(
                      (stg) => {
                        const min =
                          stg === "deep"
                            ? stages.deepMinutes
                            : stg === "core"
                              ? stages.coreMinutes
                              : stg === "rem"
                                ? stages.remMinutes
                                : stages.awakeMinutes;
                        if (min <= 0) return null;
                        const stagePct = (min / maxMin) * 100;
                        return (
                          <div
                            key={stg}
                            style={{
                              height: `${stagePct}%`,
                              backgroundColor: STAGE_COLOR[stg],
                            }}
                            title={`${STAGE_LABEL[stg]}: ${fmtHM(min)}`}
                          />
                        );
                      },
                    )}
                  </>
                )}
                {!stages && total > 0 && (
                  // Fallback: barra única indigo
                  <div
                    className="bg-indigo-500"
                    style={{ height: `${heightPct}%` }}
                  />
                )}
              </div>
              {/* Label do dia */}
              <div className="text-[9px] text-zinc-400 tabular-nums">
                {new Date(p.date + "T00:00").toLocaleDateString("pt-BR", {
                  day: "2-digit",
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[10.5px] text-zinc-500">
        Cada coluna = 1 noite. Cores empilhadas mostram tempo em cada fase.
      </p>
    </div>
  );
}

function StageStat({
  label,
  mins,
  color,
}: {
  label: string;
  mins: number;
  color: string;
}) {
  return (
    <li className="flex items-center gap-2">
      <span
        className="h-3 w-3 shrink-0 rounded-sm"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] text-zinc-500">{label}</div>
        <div className="text-[13px] font-semibold tabular-nums text-zinc-900">
          {fmtHM(mins)}
        </div>
      </div>
    </li>
  );
}

function fmtHM(totalMin: number): string {
  if (totalMin <= 0) return "0m";
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
