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

// ─── Severity → estilo colorido (Lucas: "colorido na parte working on") ──────

const SEVERITY_STYLES = {
  high: {
    card: "bg-gradient-to-br from-rose-50 via-rose-50/60 to-white border-rose-200",
    badge: "bg-rose-500 text-white",
    accent: "text-rose-700",
    label: "Prioridade alta",
  },
  medium: {
    card: "bg-gradient-to-br from-amber-50 via-amber-50/60 to-white border-amber-200",
    badge: "bg-amber-500 text-white",
    accent: "text-amber-700",
    label: "Otimizar",
  },
  low: {
    card: "bg-gradient-to-br from-emerald-50 via-emerald-50/60 to-white border-emerald-200",
    badge: "bg-emerald-500 text-white",
    accent: "text-emerald-700",
    label: "Manutenção",
  },
} as const;

function WorkingOnRow({
  item,
  index,
}: {
  item: WorkingOnGoal;
  index: number;
}) {
  const style = SEVERITY_STYLES[item.severity];
  return (
    <article
      className={cn(
        "flex gap-4 rounded-2xl border px-5 py-4 transition hover:shadow-md",
        style.card,
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[15px] font-bold shadow-sm",
          style.badge,
        )}
      >
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[16px] font-semibold leading-snug text-ink">
            {item.title}
          </h3>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              style.accent,
              "bg-white/70 backdrop-blur",
            )}
          >
            {style.label}
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          {item.description}
        </p>
      </div>
    </article>
  );
}
