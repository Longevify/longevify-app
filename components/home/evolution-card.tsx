"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScorePoint, BioAgePoint } from "@/lib/mock-data";

/**
 * Lucas (2026-05-20): "tenha metas para o mês e evolução geral, tem
 * que ser bem gameficado, o cara tem que gostar de usar o app para
 * ver que ta melhorando."
 *
 * Card de evolução com:
 * - Sparkline grande do Longevify Score (últimos 6+ pontos)
 * - Sparkline da idade biológica (overlay)
 * - Conquistas/milestones (best score, streak ativa, etc.)
 *
 * SVG inline (não puxa biblioteca de chart pesada — sparkline é
 * trivial de desenhar à mão).
 */

interface EvolutionCardProps {
  scoreHistory: ScorePoint[];
  biologicalAgeHistory: BioAgePoint[];
  chronologicalAge: number;
  /**
   * Contexto adicional pra computar achievements mais ricos:
   * - streakDays: dias seguidos completando tasks
   * - biomarkersOptimal: count de biomarcadores em verde
   * - examsCount: quantos exames já anexou
   */
  streakDays?: number;
  biomarkersOptimal?: number;
  examsCount?: number;
  achievements?: Achievement[];
  className?: string;
}

interface Achievement {
  id: string;
  label: string;
  emoji: string;
}

export function EvolutionCard({
  scoreHistory,
  biologicalAgeHistory,
  chronologicalAge,
  streakDays,
  biomarkersOptimal,
  examsCount,
  achievements,
  className,
}: EvolutionCardProps) {
  // Constrói achievements automáticos a partir do histórico + contexto
  // se não veio achievements explícitos.
  const autoAchievements = computeAchievements(
    scoreHistory,
    biologicalAgeHistory,
    chronologicalAge,
    streakDays,
    biomarkersOptimal,
    examsCount,
  );
  const achs = achievements ?? autoAchievements;

  const bestScore = scoreHistory.length
    ? Math.max(...scoreHistory.map((s) => s.score))
    : 0;
  const currentScore = scoreHistory[scoreHistory.length - 1]?.score ?? 0;

  return (
    <section
      className={cn(
        "rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_4px_20px_-12px_rgba(13,40,24,.12)]",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="inline-flex items-center gap-1.5 text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
          <Sparkles className="h-3.5 w-3.5 text-brand-600" />
          Sua evolução
        </h2>
        <Link
          href="/dados"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-700 hover:text-brand-900"
        >
          Histórico completo <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Score sparkline */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Longevify Score
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-[26px] font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">
                {currentScore}
              </span>
              <span className="text-[11px] text-zinc-500">
                máx hist.: {bestScore}
              </span>
            </div>
          </div>
        </div>
        <Sparkline
          values={scoreHistory.map((s) => s.score)}
          color="#2a7a53"
          fillFrom="rgba(63, 154, 107, 0.18)"
          fillTo="rgba(63, 154, 107, 0)"
        />
      </div>

      {/* Bio age sparkline (smaller) */}
      <div className="mt-4 border-t border-zinc-100 pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Idade biológica
          </div>
          <span className="text-[11px] text-zinc-500">
            real: {chronologicalAge} anos
          </span>
        </div>
        <Sparkline
          values={biologicalAgeHistory.map((s) => s.age)}
          color="#0E7B45"
          fillFrom="rgba(14, 123, 69, 0.12)"
          fillTo="rgba(14, 123, 69, 0)"
          /** Inverte: idade menor = melhor (linha caindo = ganho) */
          invert
        />
      </div>

      {/* Achievements */}
      {achs.length > 0 && (
        <div className="mt-4 border-t border-zinc-100 pt-3">
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Conquistas
          </div>
          <div className="flex flex-wrap gap-1.5">
            {achs.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200"
              >
                <span aria-hidden>{a.emoji}</span>
                {a.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Sparkline ──────────────────────────────────────────────────────────────

interface SparklineProps {
  values: number[];
  color: string;
  fillFrom: string;
  fillTo: string;
  invert?: boolean;
}

function Sparkline({ values, color, fillFrom, fillTo, invert }: SparklineProps) {
  if (values.length < 2) {
    return (
      <div className="mt-2 h-12 rounded-lg bg-zinc-50 grid place-items-center text-[11px] text-zinc-400">
        Histórico insuficiente
      </div>
    );
  }

  const w = 320;
  const h = 56;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // ID do gradient SVG — sanitiza color pra evitar `#` no id (que
  // quebra `url(#grad-#xyz)`). Cores possíveis: brand-700, status colors,
  // etc — alfanuméricos com `-` são seguros após este replace.
  const gradId = `grad-${color.replace(/[^a-zA-Z0-9-]/g, "")}`;

  // Pontos normalizados
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 8) + 4;
    const norm = (v - min) / range;
    const y = invert
      ? norm * (h - 12) + 6
      : (1 - norm) * (h - 12) + 6;
    return { x, y };
  });

  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${h} L ${pts[0].x.toFixed(1)} ${h} Z`;

  const lastPt = pts[pts.length - 1];
  const firstVal = values[0];
  const lastVal = values[values.length - 1];
  const trendUp = invert ? lastVal < firstVal : lastVal > firstVal;

  return (
    <div className="mt-2">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-12 w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillFrom} />
            <stop offset="100%" stopColor={fillTo} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dot final */}
        <circle
          cx={lastPt.x}
          cy={lastPt.y}
          r="3.5"
          fill="white"
          stroke={color}
          strokeWidth="2"
        />
      </svg>
      <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
        <span>{values.length} medições</span>
        <span
          className={cn(
            "font-semibold",
            trendUp ? "text-emerald-600" : "text-rose-600",
          )}
        >
          {trendUp ? "↗ melhorando" : "↘ piorando"}
        </span>
      </div>
    </div>
  );
}

// ─── Auto-achievements ──────────────────────────────────────────────────────

function computeAchievements(
  scoreHistory: ScorePoint[],
  biologicalAgeHistory: BioAgePoint[],
  chronologicalAge: number,
  streakDays?: number,
  biomarkersOptimal?: number,
  examsCount?: number,
): Achievement[] {
  const out: Achievement[] = [];

  // Streak (lança quando >= 7d pra ser badge meaningful)
  if (streakDays && streakDays >= 30) {
    out.push({ id: "streak-30", emoji: "🔥", label: `${streakDays}d de sequência` });
  } else if (streakDays && streakDays >= 7) {
    out.push({ id: "streak-7", emoji: "🔥", label: `${streakDays}d de sequência` });
  }

  // Score history
  if (scoreHistory.length >= 2) {
    const first = scoreHistory[0].score;
    const last = scoreHistory[scoreHistory.length - 1].score;
    if (last > first + 5) {
      out.push({
        id: "score-improvement",
        emoji: "📈",
        label: `+${last - first} pts no Score`,
      });
    }
    if (last >= 80) {
      out.push({ id: "high-score", emoji: "🌟", label: "Score 80+" });
    }
  }

  // Biomarcadores ótimos (>=15 é forte)
  if (biomarkersOptimal && biomarkersOptimal >= 15) {
    out.push({
      id: "many-optimal",
      emoji: "💚",
      label: `${biomarkersOptimal} biomarcadores ótimos`,
    });
  } else if (biomarkersOptimal && biomarkersOptimal >= 5) {
    out.push({
      id: "some-optimal",
      emoji: "✅",
      label: `${biomarkersOptimal} biomarcadores ótimos`,
    });
  }

  // Exames anexados (longevidade requer série temporal)
  if (examsCount && examsCount >= 4) {
    out.push({
      id: "many-exams",
      emoji: "📊",
      label: `${examsCount} exames no histórico`,
    });
  } else if (examsCount && examsCount >= 2) {
    out.push({
      id: "trend-started",
      emoji: "📊",
      label: "Tendência rastreada",
    });
  }

  if (biologicalAgeHistory.length > 0) {
    const lastBio = biologicalAgeHistory[biologicalAgeHistory.length - 1].age;
    if (chronologicalAge - lastBio >= 3) {
      out.push({
        id: "biological-young",
        emoji: "🧬",
        label: `${(chronologicalAge - lastBio).toFixed(1)}a mais jovem`,
      });
    }
  }

  // Sempre mostra essa se nenhuma outra
  if (out.length === 0 && scoreHistory.length >= 1) {
    out.push({
      id: "started",
      emoji: "🚀",
      label: "Jornada iniciada",
    });
  }

  return out.slice(0, 4);
}
