"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Sun,
  Moon,
  Droplet,
  Activity,
  Check,
  ShoppingCart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import type {
  ProtocolTask,
  WorkingOnGoal,
} from "@/lib/protocolo/tasks";
import { cn } from "@/lib/utils";

// ─── Tipos & const ────────────────────────────────────────────────────────────

interface ProtocoloClientProps {
  tasks: ProtocolTask[];
  workingOn: WorkingOnGoal[];
}

const TASKS_STORAGE_KEY = "longevify-tasks-done";

const LIFESTYLE_ICONS: Record<string, LucideIcon> = {
  sun: Sun,
  moon: Moon,
  droplet: Droplet,
  activity: Activity,
};

const LIFESTYLE_ACCENTS: Record<string, string> = {
  sun: "bg-[#FCEBD8] text-[#A8651B]",
  moon: "bg-[#E5E7EB] text-[#475569]",
  droplet: "bg-[#DBEAFE] text-[#1E40AF]",
  activity: "bg-[#DCFCE7] text-[#15803D]",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProtocoloClient({ tasks, workingOn }: ProtocoloClientProps) {
  const [doneTasks, setDoneTasks] = useState<Set<string>>(new Set());

  // Hydrate from localStorage after mount (evita hydration mismatch — SSR
  // renderiza sem localStorage, client hidrata depois)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TASKS_STORAGE_KEY);
      if (raw) {
        const parsed: string[] = JSON.parse(raw);
        setDoneTasks(new Set(parsed));
      }
    } catch {
      // ignore parse errors — stale data
    }
  }, []);

  const toggleDone = useCallback((taskId: string) => {
    setDoneTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      try {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6 sm:py-10">
      <header className="pb-8">
        <span className="text-[13px] text-muted">Personalizado para você</span>
        <h1 className="text-[32px] leading-[1.05] font-semibold tracking-tight sm:text-[40px]">
          Protocolo
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Com base no seu painel de biomarcadores, a Longevify recomenda as
          intervenções abaixo. Não recomendamos exames extras como tratamento —
          só onde realmente faz sentido clinicamente.
        </p>
      </header>

      {/* Ações de hoje */}
      <section>
        <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
          Ações de hoje
        </h2>
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskRow
                task={task}
                isDone={doneTasks.has(task.id)}
                onToggleDone={() => toggleDone(task.id)}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* No que estamos trabalhando */}
      <section className="mt-12">
        <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
          No que estamos trabalhando
        </h2>
        <ul className="flex flex-col gap-3">
          {workingOn.map((item, idx) => (
            <li key={item.id}>
              <WorkingOnRow item={item} index={idx + 1} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ─── TaskRow ──────────────────────────────────────────────────────────────────
//
// Cada linha de task tem:
//   - Checkbox (marcar feito)
//   - Imagem ou ícone (suplemento ou lifestyle)
//   - Label (posologia médica)
//   - Botão "Comprar X" à direita (se tem produto vinculado) → /loja?q=NAME
//     (clicar não marca feito — só leva pra loja com filtro)
//
// Pra task lifestyle (sol, água) sem produto, mostra só o checkbox.

function TaskRow({
  task,
  isDone,
  onToggleDone,
}: {
  task: ProtocolTask;
  isDone: boolean;
  onToggleDone: () => void;
}) {
  const Icon = task.lifestyleIcon ? LIFESTYLE_ICONS[task.lifestyleIcon] : null;
  const iconAccent = task.lifestyleIcon
    ? LIFESTYLE_ACCENTS[task.lifestyleIcon]
    : "bg-brand-50 text-brand-700";

  return (
    <article
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3 transition",
        isDone
          ? "border-brand-200 bg-brand-50/60"
          : "border-border bg-surface hover:border-brand-200 hover:bg-brand-50/30",
      )}
    >
      {/* Checkbox visual + toggle done */}
      <button
        type="button"
        onClick={onToggleDone}
        aria-label={isDone ? "Desmarcar feito" : "Marcar como feito"}
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition",
          isDone
            ? "border-brand-500 bg-brand-500"
            : "border-border bg-surface hover:border-brand-400",
        )}
      >
        {isDone && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </button>

      {/* Imagem do produto OU ícone lifestyle */}
      {task.product?.image ? (
        <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-50">
          <Image
            src={task.product.image}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 object-cover"
          />
        </span>
      ) : Icon ? (
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-full",
            iconAccent,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      ) : null}

      {/* Label + reasoning */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[14px] font-medium leading-snug transition",
            isDone ? "text-muted line-through decoration-brand-400" : "text-ink",
          )}
        >
          {task.label}
        </p>
        {task.reasoning && !isDone && (
          <p className="mt-0.5 text-[11.5px] leading-snug text-muted">
            {task.reasoning}
          </p>
        )}
      </div>

      {/* Botão "Comprar X" — leva direto pra grade de produtos da loja
          (anchor #produtos pula seção de recomendados) */}
      {task.product && !isDone && task.shopQuery && (
        <Link
          href={`/loja?q=${encodeURIComponent(task.shopQuery)}#produtos`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-700 px-3 py-1.5 text-[11.5px] font-semibold text-white shadow-sm transition hover:bg-brand-800"
        >
          <ShoppingCart className="h-3 w-3" />
          <span className="hidden sm:inline">Comprar</span>
        </Link>
      )}
    </article>
  );
}

// ─── WorkingOnRow ─────────────────────────────────────────────────────────────
//
// Visual premium em verde Longevify (Lucas 2026-05: "mais animações e verde,
// algo melhor feito"). Cada card tem:
//   - Gradient verde Longevify com saturação por severidade
//   - Badge numerado com glow contextual
//   - Sparkle decorativo flutuante (animação)
//   - Pulse ring no badge de alta-prioridade
//   - Fade-in stagger no mount (delay incremental)
//   - Border subtle com glow ao hover
//   - Mini progress hint na base
//   - Label severity com cor sutil

const SEVERITY_THEME = {
  high: {
    // verde+ amber accent — atenção sem ser alarmante
    card:
      "bg-gradient-to-br from-emerald-50/90 via-brand-50 to-brand-100/40 " +
      "border-brand-200 hover:border-brand-300 " +
      "shadow-[0_4px_20px_-8px_rgba(31,93,63,0.15)] " +
      "hover:shadow-[0_10px_30px_-10px_rgba(31,93,63,0.25)]",
    badge:
      "bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 " +
      "text-white shadow-[0_6px_16px_-4px_rgba(31,93,63,0.4)] " +
      "ring-2 ring-emerald-300/30",
    pulse: true,
    label: "Prioridade alta",
    labelColor: "text-brand-700 bg-brand-100/80",
    progressPct: 18,
    sparkleColor: "text-brand-400",
  },
  medium: {
    card:
      "bg-gradient-to-br from-white via-brand-50/60 to-emerald-50/40 " +
      "border-brand-100 hover:border-brand-200 " +
      "shadow-[0_4px_16px_-8px_rgba(31,93,63,0.1)] " +
      "hover:shadow-[0_8px_24px_-10px_rgba(31,93,63,0.18)]",
    badge:
      "bg-gradient-to-br from-brand-500 to-brand-700 text-white " +
      "shadow-[0_4px_12px_-3px_rgba(63,154,107,0.35)]",
    pulse: false,
    label: "Em otimização",
    labelColor: "text-brand-700 bg-brand-50",
    progressPct: 45,
    sparkleColor: "text-brand-300",
  },
  low: {
    card:
      "bg-gradient-to-br from-white via-white to-brand-50/30 " +
      "border-zinc-200 hover:border-brand-200 " +
      "shadow-sm hover:shadow-[0_4px_14px_-6px_rgba(31,93,63,0.12)]",
    badge:
      "bg-gradient-to-br from-brand-300 to-brand-500 text-white " +
      "shadow-[0_3px_8px_-2px_rgba(159,212,179,0.4)]",
    pulse: false,
    label: "Manutenção",
    labelColor: "text-brand-600 bg-brand-50/70",
    progressPct: 72,
    sparkleColor: "text-brand-200",
  },
} as const;

function WorkingOnRow({
  item,
  index,
}: {
  item: WorkingOnGoal;
  index: number;
}) {
  const theme = SEVERITY_THEME[item.severity];
  // Stagger: cada card entra com delay incremental (snappy fade-in + slide up)
  const animationDelay = `${index * 80}ms`;

  return (
    <article
      className={cn(
        "working-on-card group relative overflow-hidden rounded-2xl border px-5 py-4 transition-all duration-300",
        "hover:-translate-y-0.5",
        theme.card,
      )}
      style={{ animationDelay }}
    >
      {/* Glow radial decorativo verde-Longevify */}
      <span
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-300/15 blur-2xl transition-opacity duration-500 group-hover:bg-brand-400/25"
        aria-hidden="true"
      />

      {/* Sparkle flutuante decorativo */}
      <span
        className={cn(
          "pointer-events-none absolute right-4 top-4 transition-transform duration-700",
          "group-hover:rotate-180 group-hover:scale-110",
          theme.sparkleColor,
        )}
        aria-hidden="true"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" opacity="0.6" />
        </svg>
      </span>

      <div className="relative flex items-start gap-4">
        {/* Badge numerado com pulse no high */}
        <div className="relative shrink-0">
          {theme.pulse && (
            <span
              className="absolute inset-0 rounded-2xl bg-brand-500/30 animate-ping-slow"
              aria-hidden="true"
            />
          )}
          <span
            className={cn(
              "relative grid h-11 w-11 place-items-center rounded-2xl text-[18px] font-bold",
              theme.badge,
            )}
          >
            {index}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15.5px] font-semibold leading-snug text-ink">
              {item.title}
            </h3>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] backdrop-blur",
                theme.labelColor,
              )}
            >
              {theme.label}
            </span>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
            {item.description}
          </p>

          {/* Mini barra de progresso visual — quanto perto está da meta */}
          <div className="mt-3 flex items-center gap-2">
            <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-brand-100/60">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-1000"
                style={{ width: `${theme.progressPct}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold tabular-nums text-brand-700/70">
              {theme.progressPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Animação fade-in + slide-up + pulse ping-slow — inline pra não
          poluir tailwind.config global */}
      <style jsx>{`
        .working-on-card {
          opacity: 0;
          animation: workingOnEnter 600ms ease-out forwards;
        }
        @keyframes workingOnEnter {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        :global(.animate-ping-slow) {
          animation: pingSlow 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes pingSlow {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          80%,
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
      `}</style>
    </article>
  );
}
