"use client";

import { useEffect, useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HabitRow } from "@/components/habits/habit-row";
import { HabitHeatmap } from "@/components/habits/heatmap";
import { formatDatePtBR } from "@/lib/utils";
import {
  type HabitDef,
  type HabitState,
  type HabitStatus,
} from "@/lib/habits/types";
import {
  adherence,
  loadState,
  saveState,
  setStatus,
  streak,
  todayISO,
} from "@/lib/habits/storage";

export default function HabitosPage() {
  const today = todayISO();
  const [state, setState] = useState<HabitState>(() => ({
    habits: [],
    log: {},
  }));
  const [hydrated, setHydrated] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newHabit, setNewHabit] = useState("");

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  function update(next: HabitState) {
    setState(next);
    saveState(next);
  }

  function handleSet(habitId: string, s: HabitStatus | null) {
    update(setStatus(state, habitId, today, s));
  }

  function handleAdd() {
    const label = newHabit.trim();
    if (!label) return;
    const id = `${Date.now()}-${label.toLowerCase().replace(/\s+/g, "-")}`;
    const habit: HabitDef = { id, label, custom: true };
    update({ ...state, habits: [...state.habits, habit] });
    setNewHabit("");
    setAdding(false);
  }

  function handleRemove(id: string) {
    if (!window.confirm("Remover esse hábito? O histórico fica preservado.")) {
      return;
    }
    update({ ...state, habits: state.habits.filter((h) => h.id !== id) });
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-10">
      <header className="pb-8">
        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
          <Sparkles className="h-3.5 w-3.5" />
          Conta · Acompanhamento
        </span>
        <h1 className="mt-1 text-[40px] leading-[1.05] font-semibold tracking-tight">
          Hábitos
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Marque hábitos do dia. O streak e a adesão semanal entram no contexto
          do Concierge IA — quanto mais consistente, mais relevante a
          recomendação.
        </p>
      </header>

      <section className="mb-10 flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[18px] font-semibold tracking-tight">
            Hoje · {formatDatePtBR(today)}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdding((v) => !v)}
          >
            <Plus className="h-4 w-4" />
            Adicionar hábito
          </Button>
        </div>

        {adding ? (
          <Card className="flex flex-wrap items-center gap-2 p-4">
            <input
              autoFocus
              value={newHabit}
              onChange={(e) => setNewHabit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="Ex: 2 litros de água"
              className="h-10 flex-1 rounded-full border border-border bg-brand-50/30 px-4 text-[14px] outline-none focus:border-brand-400 focus:bg-white"
            />
            <Button variant="primary" size="sm" onClick={handleAdd}>
              Adicionar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(false);
                setNewHabit("");
              }}
            >
              Cancelar
            </Button>
          </Card>
        ) : null}

        <Card className="divide-y divide-border px-5">
          {hydrated && state.habits.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-muted">
              Sem hábitos cadastrados. Toque em "Adicionar hábito" pra começar.
            </div>
          ) : (
            state.habits.map((h) => (
              <div key={h.id} className="group relative">
                <HabitRow
                  label={h.label}
                  status={state.log[h.id]?.[today]}
                  streak={streak(state, h.id)}
                  onSet={(s) => handleSet(h.id, s)}
                />
                {h.custom ? (
                  <button
                    type="button"
                    onClick={() => handleRemove(h.id)}
                    title="Remover"
                    className="absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-12 text-muted hover:text-[#B6333A] group-hover:inline-flex"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            ))
          )}
        </Card>
      </section>

      {state.habits.length > 0 ? (
        <section className="flex flex-col gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[18px] font-semibold tracking-tight">
              Consistência
            </h2>
            <span className="text-[12px] text-muted">
              últimas 12 semanas · cada quadrado = um dia
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {state.habits.map((h) => {
              const week = adherence(state, h.id, 7);
              const month = adherence(state, h.id, 30);
              return (
                <Card key={h.id} className="flex flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[14px] font-semibold leading-tight">
                        {h.label}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[11.5px] text-muted">
                        <span>
                          Semana:{" "}
                          <span className="font-semibold text-ink tabular-nums">
                            {week}%
                          </span>
                        </span>
                        <span className="text-border">·</span>
                        <span>
                          Mês:{" "}
                          <span className="font-semibold text-ink tabular-nums">
                            {month}%
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <HabitHeatmap state={state} habitId={h.id} weeks={12} />
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
