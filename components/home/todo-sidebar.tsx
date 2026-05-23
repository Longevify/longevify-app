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
 * Lucas (2026-05-22, segunda iteração): "Deixe a letra do caderno
 * igual as demais letras, aumente a largura e altura desse caderno,
 * a cor não pode ser vermelha e sim verde."
 *
 * Visual final do caderno pautado:
 *   - Background cream (#fdfcf5) com linhas horizontais verdes sutis
 *     (a cada 36px — antes 28px → mais espaço pra cada task respirar)
 *   - Margem VERDE vertical à esquerda (era vermelha)
 *   - Letra padrão sans (era cursive Caveat)
 *   - Padding interno maior pra caderno ficar mais robusto
 *   - Mostra até 14 tasks visíveis (era 10)
 *
 * Comportamento:
 *   - Lista ÚNICA com TODAS as tasks (não separa "feitas" em colapso).
 *   - Click marca/desmarca — task fica riscada NO LUGAR com X verde.
 *   - Mantém persist em localStorage + DB.
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

  // Lucas (2026-05-23): "quero que o card de tarefas esteja alinhado
  // na parte de baixo com o card da idade biológica" — 8 tasks
  // visíveis (era 14). Stack Score+BioAge tem altura ~280px,
  // 8 tasks × 36px = 288px + header ~60px = ~348px que casa melhor.
  // Resto vira link "+ X outras…".
  const visibleTasks = tasks.slice(0, 8);
  const remaining = tasks.length - visibleTasks.length;

  return (
    <aside
      className={cn(
        "relative flex flex-col rounded-2xl shadow-[0_8px_24px_-12px_rgba(13,40,24,.18)]",
        className,
      )}
      style={{
        // Papel cream pautado com linhas horizontais VERDES sutis (linha
        // a cada 36px pra task ficar bem espaçada).
        backgroundColor: "#fdfcf5",
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent 0px, transparent 35px, rgba(63, 154, 107, 0.18) 35px, rgba(63, 154, 107, 0.18) 36px)",
        backgroundPositionY: "48px",
      }}
    >
      {/* Margem VERTICAL VERDE (era vermelha) — estilo fichário */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-[32px] w-px"
        style={{ backgroundColor: "rgba(42, 122, 83, 0.5)" }}
      />
      {/* Sombra dobrada no canto */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-6 w-6 rounded-br-2xl bg-gradient-to-tl from-zinc-200/40 to-transparent"
      />

      <header className="relative flex items-baseline justify-between gap-2 px-5 pt-5 pb-3">
        <h3 className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-zinc-700">
          <ListTodo className="h-4 w-4 text-brand-600" />
          Suas tarefas
          {hydrated && doneCount > 0 && (
            <span className="ml-1 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 tabular-nums">
              {doneCount}/{tasks.length}
            </span>
          )}
        </h3>
        <Link
          href="/protocolo"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-zinc-500 hover:text-brand-700"
        >
          Ver tudo <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      {tasks.length === 0 ? (
        <div className="relative px-5 pb-5">
          <div className="rounded-xl bg-brand-50/60 px-3 py-4 text-center">
            <div className="text-[20px]" aria-hidden>
              🎉
            </div>
            <div className="mt-1 text-[13px] font-semibold text-brand-800">
              Tudo limpo!
            </div>
            <div className="mt-0.5 text-[11.5px] text-brand-700/70">
              Sem tarefas pendentes hoje.
            </div>
          </div>
        </div>
      ) : (
        <ul className="relative flex flex-col pl-14 pr-5 pb-5">
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
            <li className="relative flex items-center h-[36px]">
              <Link
                href="/protocolo"
                className="text-[13px] text-zinc-500 italic hover:text-brand-700"
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
 * Linha individual estilo anotação em caderno:
 *  - Checkbox redondo com borda zinc → verde brand quando done
 *  - Quando done: X verde brand desenhado por cima + line-through verde
 *  - Altura 36px exata pra encaixar nas linhas do fundo
 *  - Letra padrão (sans-serif) — não mais cursive
 */
function TodoLine({ task, done, onToggle }: TodoLineProps) {
  return (
    <li className="relative flex items-center" style={{ height: "36px" }}>
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full items-center gap-3 text-left transition"
        aria-label={done ? "Desmarcar" : "Marcar como feito"}
      >
        {/* Checkbox manuscrito */}
        <span
          className={cn(
            "relative grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border-2 transition",
            done
              ? "border-brand-600"
              : "border-zinc-400/60 group-hover:border-brand-500",
          )}
          style={{
            backgroundColor: done ? "rgba(199, 234, 213, 0.5)" : "transparent",
          }}
        >
          {done && (
            // X manuscrito verde (era vermelho)
            <svg
              viewBox="0 0 12 12"
              className="h-3 w-3"
              fill="none"
              stroke="rgb(42, 122, 83)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M 2 3 Q 6 6 10 10" />
              <path d="M 10 3 Q 6 6 2 10" />
            </svg>
          )}
        </span>

        {/* Texto da task — fonte normal, line-through verde quando done */}
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[13.5px] leading-snug transition",
            done
              ? "text-zinc-400"
              : "text-zinc-800 group-hover:text-zinc-900",
          )}
          style={
            done
              ? {
                  textDecoration: "line-through",
                  textDecorationColor: "rgba(42, 122, 83, 0.7)",
                  textDecorationThickness: "1.5px",
                  textDecorationStyle: "solid",
                }
              : undefined
          }
        >
          {task.label}
        </span>
      </button>
    </li>
  );
}
