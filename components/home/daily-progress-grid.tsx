"use client";

import { useEffect, useState } from "react";
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

/**
 * Lucas (2026-05-20): "tenha um card para cada quesito de saúde: sono,
 * exercício, to-do list feita e a fazer".
 *
 * Grid 2x2 com indicadores visuais de progresso pra cada quesito.
 * - Sono: horas dormidas vs meta (7h30)
 * - Exercício: minutos de atividade hoje vs meta
 * - Tasks feitas: count + percentual de conclusão
 * - Tasks a fazer: count pendente
 *
 * Sources:
 * - Sono/exercício vêm de props (wearables mock pra demo, hook futuro
 *   pra dados reais via Apple Health/Oura).
 * - Tasks vêm de localStorage (mesma chave do /protocolo) + count
 *   total que o pai passa (gerado das tasks rule-based).
 */

interface DailyProgressGridProps {
  sleepMinutes: number;
  sleepTargetMinutes: number;
  exerciseMinutes: number;
  exerciseTargetMinutes: number;
  totalTasks: number;
  /**
   * Quando false, cards sono/exercício mostram empty state "Conectar
   * wearable" em vez de 0/7h30 (Lucas 2026-05-21: ver "0" todo dia é
   * frustrante pra user real sem Apple Health/Oura). Demo passa true.
   */
  hasWearableData?: boolean;
  className?: string;
}

const TASKS_STORAGE_KEY = "longevify-tasks-done";

export function DailyProgressGrid({
  sleepMinutes,
  sleepTargetMinutes,
  exerciseMinutes,
  exerciseTargetMinutes,
  totalTasks,
  hasWearableData = true,
  className,
}: DailyProgressGridProps) {
  const [doneCount, setDoneCount] = useState(0);

  // Lê tasks feitas do localStorage (mesma chave do /protocolo)
  // — SSR-safe via useEffect.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TASKS_STORAGE_KEY);
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        setDoneCount(Array.isArray(ids) ? ids.length : 0);
      }
    } catch {
      // ignore
    }
  }, []);

  const pendingTasks = Math.max(0, totalTasks - doneCount);
  const tasksPct =
    totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {hasWearableData ? (
        <ProgressCard
          icon={Moon}
          iconAccent="bg-indigo-50 text-indigo-700"
          label="Sono"
          value={formatHM(sleepMinutes)}
          target={`/ ${formatHM(sleepTargetMinutes)}`}
          progressPct={Math.min(
            100,
            Math.round((sleepMinutes / sleepTargetMinutes) * 100),
          )}
          progressColor="from-indigo-400 to-indigo-600"
          href="/wearables"
        />
      ) : (
        <ConnectWearableCard
          icon={Moon}
          iconAccent="bg-indigo-50 text-indigo-700"
          label="Sono"
        />
      )}
      {hasWearableData ? (
        <ProgressCard
          icon={Activity}
          iconAccent="bg-emerald-50 text-emerald-700"
          label="Exercício"
          value={`${exerciseMinutes} min`}
          target={`/ ${exerciseTargetMinutes} min`}
          progressPct={Math.min(
            100,
            Math.round((exerciseMinutes / exerciseTargetMinutes) * 100),
          )}
          progressColor="from-emerald-400 to-emerald-600"
          href="/wearables"
        />
      ) : (
        <ConnectWearableCard
          icon={Activity}
          iconAccent="bg-emerald-50 text-emerald-700"
          label="Exercício"
        />
      )}
      <ProgressCard
        icon={CheckCircle2}
        iconAccent="bg-brand-50 text-brand-700"
        label="Feitas hoje"
        value={`${doneCount}`}
        target={totalTasks > 0 ? `de ${totalTasks}` : "sem tarefas"}
        progressPct={tasksPct}
        progressColor="from-brand-400 to-brand-600"
        href="/protocolo"
      />
      <ProgressCard
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
        href="/protocolo"
      />
    </div>
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

interface ProgressCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconAccent: string;
  label: string;
  value: string;
  target: string;
  progressPct: number;
  progressColor: string;
  href: string;
}

function ProgressCard({
  icon: Icon,
  iconAccent,
  label,
  value,
  target,
  progressPct,
  progressColor,
  href,
}: ProgressCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-[0_4px_16px_-10px_rgba(13,40,24,.1)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_22px_-10px_rgba(13,40,24,.15)]"
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
      {/* Mini progress bar */}
      <div className="relative h-1 overflow-hidden rounded-full bg-zinc-100">
        <span
          className={cn(
            "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-[width] duration-1000",
            progressColor,
          )}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </Link>
  );
}

// ─── ConnectWearableCard ────────────────────────────────────────────────
//
// Mostrado em vez do ProgressCard quando o user real não tem wearable
// conectado (hasWearableData=false). Em vez de exibir 0/7h30 frustrante,
// convida pra conectar Apple Health / Oura / Whoop.

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
