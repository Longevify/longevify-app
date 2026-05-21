"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Check, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProtocolTask } from "@/lib/protocolo/tasks";

/**
 * Lucas (2026-05-21): "na aba home, coloque a to-do list na lateral,
 * com as tarefas para marcar e as ja marcadas."
 *
 * Sidebar com tasks do dia — lê estado de localStorage (mesma chave
 * do /protocolo), permite marcar/desmarcar inline. Mostra:
 * - Seção "A fazer" (não marcadas) — top do card
 * - Seção "Feitas" (collapse/expand) — embaixo, mais discreto
 *
 * Em desktop fica fixed à direita da home (lg+). Em mobile, vira card
 * inline depois do progresso diário.
 */

interface TodoSidebarProps {
  tasks: ProtocolTask[];
  className?: string;
}

const TASKS_STORAGE_KEY = "longevify-tasks-done";

export function TodoSidebar({ tasks, className }: TodoSidebarProps) {
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [showDone, setShowDone] = useState(false);

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
    setHydrated(true);
  }, []);

  const toggle = useCallback((taskId: string) => {
    setDoneIds((prev) => {
      const next = new Set(prev);
      const isNowDone = !next.has(taskId);
      if (isNowDone) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }
      try {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      // Persiste em DB pro streak — fire-and-forget igual ao /protocolo
      fetch("/api/protocolo/task-completion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, done: isNowDone }),
        keepalive: true,
      }).catch(() => {});
      return next;
    });
  }, []);

  // Pra evitar hydration mismatch (server renderiza sem localStorage),
  // só mostra o estado real depois do useEffect.
  const pending = hydrated ? tasks.filter((t) => !doneIds.has(t.id)) : tasks;
  const done = hydrated ? tasks.filter((t) => doneIds.has(t.id)) : [];

  return (
    <aside
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-[0_4px_20px_-12px_rgba(13,40,24,.12)]",
        className,
      )}
    >
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">
          <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" />
          Suas tarefas
        </h3>
        <Link
          href="/protocolo"
          className="inline-flex items-center gap-1 text-[11.5px] font-medium text-brand-700 hover:text-brand-900"
        >
          Ver tudo <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      {pending.length === 0 ? (
        <div className="rounded-xl bg-brand-50/60 px-3 py-4 text-center">
          <div className="text-[20px]" aria-hidden>
            🎉
          </div>
          <div className="mt-1 text-[12.5px] font-semibold text-brand-800">
            Tudo feito por hoje!
          </div>
          <div className="mt-0.5 text-[11px] text-brand-700/70">
            Volta amanhã pra continuar a sequência.
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {pending.slice(0, 6).map((task) => (
            <TodoItem
              key={task.id}
              task={task}
              done={false}
              onToggle={() => toggle(task.id)}
            />
          ))}
          {pending.length > 6 && (
            <li>
              <Link
                href="/protocolo"
                className="block rounded-lg px-2 py-1.5 text-center text-[11px] font-medium text-brand-700 hover:bg-brand-50/60"
              >
                +{pending.length - 6} mais
              </Link>
            </li>
          )}
        </ul>
      )}

      {/* Feitas — collapsible */}
      {done.length > 0 && (
        <div className="border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="flex w-full items-center justify-between text-[11px] font-medium text-zinc-500 transition hover:text-zinc-700"
          >
            <span>
              Feitas hoje · <span className="font-semibold text-brand-700">{done.length}</span>
            </span>
            <span className="text-[11px]">{showDone ? "Ocultar" : "Ver"}</span>
          </button>
          {showDone && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {done.slice(0, 8).map((task) => (
                <TodoItem
                  key={task.id}
                  task={task}
                  done
                  onToggle={() => toggle(task.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}

// ─── TodoItem ────────────────────────────────────────────────────────────

interface TodoItemProps {
  task: ProtocolTask;
  done: boolean;
  onToggle: () => void;
}

function TodoItem({ task, done, onToggle }: TodoItemProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition",
          done
            ? "opacity-60 hover:opacity-100"
            : "hover:bg-brand-50/40",
        )}
        aria-label={done ? "Desmarcar" : "Marcar como feito"}
      >
        <span
          className={cn(
            "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition",
            done
              ? "border-brand-500 bg-brand-500"
              : "border-zinc-300 hover:border-brand-400",
          )}
        >
          {done && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 text-[12.5px] leading-snug",
            done ? "text-zinc-500 line-through decoration-brand-400/60" : "text-zinc-800",
          )}
        >
          {task.label}
        </span>
      </button>
    </li>
  );
}
