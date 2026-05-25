"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Trophy, TrendingUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Exercise,
  MUSCLE_GROUP_LABEL,
  EQUIPMENT_LABEL,
} from "@/lib/fitness/types";

/**
 * Lucas (2026-05-21): "para cada exercício ele consiga ver um
 * dashboard."
 *
 * Popup que abre ao expandir um exercício no /fitness/musculacao,
 * mostrando:
 *  - Top set (PR — maior peso × reps)
 *  - Total de sets registrados
 *  - Lista dos últimos N sets (data, peso, reps, RPE)
 *  - Mini chart de progressão (max weight per session_date)
 *  - Vídeo de execução se houver (YouTube embed)
 *
 * Fetch lazy via /api/fitness/exercises/[id]/history (próximo PR pode
 * adicionar — por enquanto recebe history via prop).
 */

export interface PastSet {
  id: string;
  weightKg: number | null;
  reps: number;
  rpe: number | null;
  sessionDate: string;
  createdAt: string;
}

interface ExerciseHistoryPopupProps {
  open: boolean;
  onClose: () => void;
  exercise: Exercise;
  history: PastSet[];
  loading?: boolean;
}

export function ExerciseHistoryPopup({
  open,
  onClose,
  exercise,
  history,
  loading = false,
}: ExerciseHistoryPopupProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const stats = useMemo(() => {
    if (history.length === 0)
      return { pr: null, totalSets: 0, maxByDate: [] as Array<{ date: string; max: number }> };
    // PR = set com maior weight × reps (proxy de força)
    let pr: PastSet | null = null;
    let prScore = -1;
    for (const s of history) {
      const score = (s.weightKg ?? 0) * s.reps;
      if (score > prScore) {
        prScore = score;
        pr = s;
      }
    }
    // Max weight por dia (pra chart)
    const byDate = new Map<string, number>();
    for (const s of history) {
      const w = s.weightKg ?? 0;
      const cur = byDate.get(s.sessionDate) ?? 0;
      if (w > cur) byDate.set(s.sessionDate, w);
    }
    const maxByDate = Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, max]) => ({ date, max }));
    return { pr, totalSets: history.length, maxByDate };
  }, [history]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-[520px] sm:rounded-3xl rounded-t-3xl">
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
                {EQUIPMENT_LABEL[exercise.equipment]} ·{" "}
                {exercise.category === "compound" ? "composto" : "isolado"}
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
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-zinc-50/60 px-4 py-12 text-[12.5px] text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin text-brand-700" />
              <span>Carregando histórico…</span>
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl bg-zinc-50/60 px-4 py-8 text-center text-[12.5px] text-zinc-500">
              Nenhum set registrado pra esse exercício ainda. Toca no botão
              <span className="mx-1 inline-grid h-5 w-5 place-items-center rounded bg-brand-700 align-middle text-[10px] text-white">+</span>
              do exercício pra adicionar seu primeiro set 💪
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                    <Trophy className="h-3 w-3" />
                    Top set
                  </div>
                  <div className="mt-1 text-[16px] font-semibold leading-tight text-zinc-900 tabular-nums">
                    {stats.pr?.weightKg
                      ? `${stats.pr.weightKg}kg × ${stats.pr.reps}`
                      : `${stats.pr?.reps} reps`}
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-amber-800/70">
                    {stats.pr && fmtDate(stats.pr.sessionDate)}
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Total
                  </div>
                  <div className="mt-1 text-[16px] font-semibold leading-tight text-zinc-900 tabular-nums">
                    {stats.totalSets}
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-zinc-500">
                    sets registrados
                  </div>
                </div>
              </div>

              {/* Mini progression chart */}
              {stats.maxByDate.length >= 2 && (
                <div className="mt-5">
                  <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                    Carga máxima por sessão
                  </div>
                  <MaxWeightChart points={stats.maxByDate} />
                </div>
              )}

              {/* History list — últimos 10 */}
              <div className="mt-5">
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Histórico recente
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {history.slice(0, 10).map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 rounded-xl bg-zinc-50/60 px-3 py-2 text-[12.5px]"
                    >
                      <div className="text-[10.5px] text-zinc-500 tabular-nums w-[60px]">
                        {fmtDate(s.sessionDate)}
                      </div>
                      <div className="flex-1 tabular-nums text-zinc-800">
                        <span className="font-semibold">
                          {s.weightKg ? `${s.weightKg}kg` : "BW"}
                        </span>
                        <span className="text-zinc-400"> × </span>
                        <span className="font-semibold">{s.reps}</span>
                        <span className="text-zinc-400"> reps</span>
                      </div>
                      {s.rpe && (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                          RPE {s.rpe}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {history.length > 10 && (
                  <p className="mt-2 text-center text-[10.5px] text-zinc-400">
                    +{history.length - 10} sets mais antigos
                  </p>
                )}
              </div>
            </>
          )}

          {/* Vídeo de execução — Lucas (2026-05-25): "os vídeos tem que
              ser em português". Em vez de embedar URL hardcoded
              (frequentemente em inglês), abre busca direta no YouTube
              em PT-BR. Region+language do user garante canais BR
              (Renato Cariani, Leandro Twin, etc) ranqueados primeiro. */}
          <div className="mt-6">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Execução
            </h3>
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                `como fazer ${exercise.name} técnica em português`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-gradient-to-br from-rose-50 to-white px-4 py-3.5 transition hover:border-rose-300 hover:shadow-sm"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                  aria-hidden
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-zinc-900">
                  Ver tutorial no YouTube
                </div>
                <p className="mt-0.5 text-[11.5px] text-zinc-500">
                  Vídeos em português com técnica de execução
                </p>
              </div>
              <span className="shrink-0 text-rose-600">↗</span>
            </a>
          </div>

          {exercise.description && (
            <div className="mt-5 rounded-xl bg-brand-50/40 px-3 py-2.5 text-[12px] leading-relaxed text-brand-900/80">
              <span className="font-semibold">Técnica: </span>
              {exercise.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Chart inline simples ─────────────────────────────────────────────

function MaxWeightChart({ points }: { points: Array<{ date: string; max: number }> }) {
  const w = 320;
  const h = 80;
  const min = 0;
  const max = Math.max(...points.map((p) => p.max), 1);
  const range = max - min || 1;

  const pts = points.map((p, i) => {
    const x = (i / (points.length - 1)) * (w - 8) + 4;
    const y = h - 6 - ((p.max - min) / range) * (h - 12);
    return { x, y, value: p.max, date: p.date };
  });

  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${h} L ${pts[0].x.toFixed(1)} ${h} Z`;

  const lastPt = pts[pts.length - 1];

  return (
    <div className="relative h-20 w-full">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-20 w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="grad-max-weight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(63, 154, 107, 0.3)" />
            <stop offset="100%" stopColor="rgba(63, 154, 107, 0)" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#grad-max-weight)" />
        <path
          d={linePath}
          fill="none"
          stroke="#2a7a53"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* Dot final HTML overlay (não estica) */}
      <span
        aria-hidden
        className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-700 bg-white"
        style={{
          left: `${(lastPt.x / w) * 100}%`,
          top: `${(lastPt.y / h) * 100}%`,
        }}
      />
      <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
        <span>{fmtDate(points[0].date)}</span>
        <span className="font-semibold text-emerald-700">
          atual: {lastPt.value}kg
        </span>
        <span>{fmtDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00.000Z");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
