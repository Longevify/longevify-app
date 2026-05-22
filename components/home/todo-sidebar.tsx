"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProtocolTask } from "@/lib/protocolo/tasks";

/**
 * Lucas (2026-05-21): "na aba home, coloque a to-do list na lateral,
 * com as tarefas para marcar e as ja marcadas."
 *
 * Lucas (2026-05-22): "a aba de suas tarefas pode imitar o design de
 * um papel, como se aquilo tivesse sido feito em um caderninho de
 * papel mesmo com linhas. Além disso, quando eu clicar na task falando
 * que preenchi ela, quero que apareça a task com um check por cima e
 * que a task não suma simplesmente."
 *
 * Visual: caderno pautado.
 *   - Fundo cream (#fefef0) com linhas horizontais via repeating-linear-gradient
 *   - Margem vermelha vertical à esquerda (estilo fichário)
 *   - Bordas suaves + sombra de papel
 *   - Font handwritten (Caveat ou Patrick Hand via fallback system cursive)
 *
 * Comportamento (mudança importante):
 *   - Lista ÚNICA com TODAS as tasks (não separa "feitas" em seção colapsada).
 *   - Click marca/desmarca — task fica riscada NO LUGAR (não some).
 *   - Mantém persist em localStorage + DB (igual antes).
 */

interface TodoSidebarProps {
  tasks: ProtocolTask[];
  className?: string;
}

const TASKS_STORAGE_KEY = "longevify-tasks-done";

export function TodoSidebar({ tasks, className }: TodoSidebarProps) {
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TASKS_STORAGE_KEY);
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        setDoneIds(new Set(Array.isArray(ids) ? ids : []));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const toggle = useCallback((taskId: string) => {
    setDoneIds((prev) => {
      const next = new Set(prev);
      const isNowDone = !next.has(taskId);
      if (isNowDone) next.add(taskId);
      else next.delete(taskId);
      try {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      fetch("/api/protocolo/task-completion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, done: isNowDone }),
        keepalive: true,
      }).catch(() => {});
      return next;
    });
  }, []);

  const doneCount = hydrated
    ? tasks.filter((t) => doneIds.has(t.id)).length
    : 0;

  // Mostra até 10 tasks no card; resto via link "Ver tudo".
  const visibleTasks = tasks.slice(0, 10);
  const remaining = tasks.length - visibleTasks.length;

  return (
    <aside
      className={cn(
        "relative flex flex-col rounded-2xl shadow-[0_8px_24px_-12px_rgba(13,40,24,.18)]",
        className,
      )}
      style={{
        // Papel cream pautado com linhas horizontais (estilo caderno
        // pautado clássico). Linha azul sutil a cada 28px.
        backgroundColor: "#fdfcf5",
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent 0px, transparent 27px, rgba(99, 134, 184, 0.18) 27px, rgba(99, 134, 184, 0.18) 28px)",
        backgroundPositionY: "40px",
      }}
    >
      {/* Margem vermelha vertical (fichário) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-[28px] w-px"
        style={{ backgroundColor: "rgba(220, 80, 80, 0.45)" }}
      />
      {/* Sombra dobrada do papel no canto */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-6 w-6 rounded-br-2xl bg-gradient-to-tl from-zinc-200/40 to-transparent"
      />

      <header className="relative flex items-baseline justify-between gap-2 px-5 pt-4 pb-2">
        <h3 className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-zinc-700">
          <ListTodo className="h-3.5 w-3.5 text-rose-500" />
          Suas tarefas
          {hydrated && doneCount > 0 && (
            <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-700 tabular-nums">
              {doneCount}/{tasks.length}
            </span>
          )}
        </h3>
        <Link
          href="/protocolo"
          className="inline-flex items-center gap-1 text-[11.5px] font-medium text-zinc-500 hover:text-rose-600"
        >
          Ver tudo <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      {tasks.length === 0 ? (
        <div className="relative px-5 pb-5">
          <div className="rounded-xl bg-emerald-50/60 px-3 py-4 text-center">
            <div className="text-[20px]" aria-hidden>
              🎉
            </div>
            <div className="mt-1 text-[12.5px] font-semibold text-emerald-800">
              Tudo limpo!
            </div>
            <div className="mt-0.5 text-[11px] text-emerald-700/70">
              Sem tarefas pendentes hoje.
            </div>
          </div>
        </div>
      ) : (
        <ul
          className="relative flex flex-col pl-12 pr-4 pb-4"
          style={{
            // Cada item ocupa exatos 28px de altura pra encaixar nas linhas
            fontFamily:
              '"Caveat", "Patrick Hand", "Bradley Hand", "Comic Sans MS", cursive',
          }}
        >
          {visibleTasks.map((task) => {
            const done = hydrated && doneIds.has(task.id);
            return (
              <TodoLine
                key={task.id}
                task={task}
                done={done}
                onToggle={() => toggle(task.id)}
              />
            );
          })}
          {remaining > 0 && (
            <li
              className="relative flex items-center h-[28px] text-[15px]"
              style={{ marginLeft: "-2px" }}
            >
              <Link
                href="/protocolo"
                className="text-[14px] italic text-zinc-500 hover:text-rose-600"
              >
                + {remaining} {remaining === 1 ? "outra" : "outras"}…
              </Link>
            </li>
          )}
        </ul>
      )}
    </aside>
  );
}

// ─── TodoLine ────────────────────────────────────────────────────────────

interface TodoLineProps {
  task: ProtocolTask;
  done: boolean;
  onToggle: () => void;
}

/**
 * Linha individual estilo "anotação manual em caderno":
 *  - Checkbox redondo manuscrito (border-2 com cor da caneta)
 *  - Quando done: check ❌ ou ✓ desenhado por cima + texto riscado
 *  - Hover bg sutil mas sem destruir o "papel"
 *  - Altura 28px exata pra encaixar nas linhas do fundo
 */
function TodoLine({ task, done, onToggle }: TodoLineProps) {
  return (
    <li className="relative flex items-center" style={{ height: "28px" }}>
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full items-center gap-2.5 text-left transition"
        aria-label={done ? "Desmarcar" : "Marcar como feito"}
      >
        {/* Checkbox manuscrito */}
        <span
          className={cn(
            "relative grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border-2 transition",
            done
              ? "border-rose-500"
              : "border-zinc-400/60 group-hover:border-rose-400",
          )}
          style={{
            backgroundColor: done ? "rgba(254, 226, 226, 0.4)" : "transparent",
          }}
        >
          {done && (
            // X manuscrito (mais pra "risquei feito" do que checkmark)
            <svg
              viewBox="0 0 12 12"
              className="h-3 w-3"
              fill="none"
              stroke="rgb(220, 38, 38)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M 2 3 Q 6 6 10 10" />
              <path d="M 10 3 Q 6 6 2 10" />
            </svg>
          )}
        </span>

        {/* Texto da task — cursive, riscado quando done */}
        <span
          className={cn(
            "min-w-0 flex-1 truncate transition",
            done
              ? "text-zinc-400"
              : "text-zinc-800 group-hover:text-zinc-900",
          )}
          style={{
            fontSize: "16px",
            lineHeight: "1",
            // Risco manuscrito SVG via text-decoration nativo não fica
            // "manuscrito"; usa text-decoration-style wavy/squiggly
            ...(done && {
              textDecoration: "line-through",
              textDecorationColor: "rgba(220, 38, 38, 0.7)",
              textDecorationThickness: "1.5px",
              textDecorationStyle: "solid",
            }),
          }}
        >
          {task.label}
        </span>
      </button>
    </li>
  );
}
