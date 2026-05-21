"use client";

import { useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { X, Flame, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProtocolTask } from "@/lib/protocolo/tasks";

/**
 * Lucas (2026-05-21): "Quando clicar em algum card da aba home, tem
 * que abrir a aba mostrando a evolução, histórico (que pode mudar
 * l7d, l30d, l6m) e o overall score."
 *
 * Popup que abre ao clicar nos cards "Feitas hoje" / "A fazer" do
 * DailyProgressGrid. Mostra:
 * - Score 0-100 do dia (% das tasks completadas hoje)
 * - Streak atual em destaque
 * - Calendar heatmap dos últimos 30 dias (estilo GitHub contributions)
 * - Lista das tasks pendentes hoje (com link pra /protocolo)
 */

interface TaskHistoryPopupProps {
  open: boolean;
  onClose: () => void;
  tasks: ProtocolTask[];
  doneIds: Set<string>;
  /** Last 30 days: [{date, count}] ASC. Vindo do server. */
  completionsHistory: Array<{ date: string; count: number }>;
  streakDays: number;
}

export function TaskHistoryPopup({
  open,
  onClose,
  tasks,
  doneIds,
  completionsHistory,
  streakDays,
}: TaskHistoryPopupProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  // Score do dia: % de tasks completadas dentre as do plano
  const todayScore = useMemo(() => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter((t) => doneIds.has(t.id)).length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks, doneIds]);

  const pending = tasks.filter((t) => !doneIds.has(t.id));

  // Max count pra normalizar intensidade do heatmap (cor por quartil)
  const maxCount = useMemo(
    () => Math.max(...completionsHistory.map((d) => d.count), 1),
    [completionsHistory],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      aria-modal="true"
      role="dialog"
      aria-label="Tarefas — Histórico"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-[560px] sm:rounded-[20px] rounded-t-[20px]">
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-[16px] font-semibold text-zinc-900">
            Tarefas — histórico
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Score + streak */}
          <div className="px-5 pt-6 pb-4">
            <div className="flex items-baseline gap-3 flex-wrap">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Conclusão de hoje
                </div>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span
                    className={cn(
                      "text-[44px] font-semibold leading-none tracking-tight tabular-nums",
                      todayScore >= 75
                        ? "text-emerald-600"
                        : todayScore >= 50
                          ? "text-amber-600"
                          : "text-rose-600",
                    )}
                  >
                    {todayScore}
                  </span>
                  <span className="text-[14px] font-medium text-zinc-400">
                    %
                  </span>
                </div>
              </div>
              <div className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-[12px] font-semibold text-orange-700 ring-1 ring-orange-200">
                <Flame className="h-3.5 w-3.5" />
                {streakDays}d de sequência
              </div>
            </div>
            <p className="mt-2 text-[12.5px] text-zinc-600">
              {tasks.filter((t) => doneIds.has(t.id)).length} de{" "}
              {tasks.length} tarefas concluídas hoje.
            </p>
          </div>

          {/* Calendar heatmap — últimos 30 dias */}
          <div className="px-5 pb-5">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Histórico — últimos 30 dias
            </div>
            <Heatmap data={completionsHistory} maxCount={maxCount} />
            <div className="mt-2.5 flex items-center justify-between text-[10.5px] text-zinc-500">
              <span>Menos</span>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((level) => (
                  <span
                    key={level}
                    className={cn(
                      "h-2.5 w-2.5 rounded-sm",
                      level === 0 && "bg-zinc-100",
                      level === 1 && "bg-brand-200",
                      level === 2 && "bg-brand-400",
                      level === 3 && "bg-brand-600",
                      level === 4 && "bg-brand-800",
                    )}
                  />
                ))}
              </div>
              <span>Mais</span>
            </div>
          </div>

          {/* Tasks pendentes hoje */}
          {pending.length > 0 && (
            <div className="border-t border-zinc-100 px-5 py-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-[12.5px] font-semibold text-zinc-700">
                  Pendentes hoje{" "}
                  <span className="text-zinc-400">({pending.length})</span>
                </h3>
                <Link
                  href="/protocolo"
                  className="inline-flex items-center gap-1 text-[11.5px] font-medium text-brand-700 hover:text-brand-900"
                >
                  Marcar lá <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <ul className="flex flex-col gap-1">
                {pending.slice(0, 5).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-start gap-2 text-[12.5px] text-zinc-700"
                  >
                    <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded border border-zinc-300" />
                    <span className="leading-snug">{t.label}</span>
                  </li>
                ))}
                {pending.length > 5 && (
                  <li className="text-[11px] text-zinc-500">
                    +{pending.length - 5} mais em /protocolo
                  </li>
                )}
              </ul>
            </div>
          )}

          {pending.length === 0 && tasks.length > 0 && (
            <div className="border-t border-zinc-100 px-5 py-5 text-center">
              <div className="text-[28px]" aria-hidden>
                🎉
              </div>
              <div className="mt-2 text-[13px] font-semibold text-brand-800">
                Tudo concluído por hoje!
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-[12px] text-brand-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Volta amanhã pra continuar a sequência
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Heatmap ───────────────────────────────────────────────────────────

interface HeatmapProps {
  data: Array<{ date: string; count: number }>;
  maxCount: number;
}

/**
 * Grid 7 (dias da semana) × 5 (semanas) = até 35 dias. Cor por
 * quartil do maxCount. Tooltip na hover. Estilo GitHub contributions.
 */
function Heatmap({ data, maxCount }: HeatmapProps) {
  // Mapeia cada day → intensidade 0-4 (level)
  const intensity = (count: number): number => {
    if (count === 0) return 0;
    const q = count / maxCount;
    if (q <= 0.25) return 1;
    if (q <= 0.5) return 2;
    if (q <= 0.75) return 3;
    return 4;
  };

  return (
    <div className="grid grid-cols-7 gap-1">
      {data.map((d) => {
        const lvl = intensity(d.count);
        const date = new Date(d.date + "T00:00:00.000Z");
        const day = date.getUTCDate();
        return (
          <div
            key={d.date}
            title={`${d.date}: ${d.count} task${d.count !== 1 ? "s" : ""}`}
            className={cn(
              "aspect-square rounded-sm transition",
              lvl === 0 && "bg-zinc-100",
              lvl === 1 && "bg-brand-200",
              lvl === 2 && "bg-brand-400",
              lvl === 3 && "bg-brand-600",
              lvl === 4 && "bg-brand-800",
            )}
          >
            {/* Mostra o dia do mês só no 1º da semana pra ficar limpo */}
            <span className="sr-only">
              {day} — {d.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
