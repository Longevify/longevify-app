"use client";

import { useState } from "react";
import { Plus, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  MealEntry,
  Nutrients,
  NutrientTargets,
} from "@/lib/dieta/types";
import { MEAL_TYPE_ICON, MEAL_TYPE_LABEL } from "@/lib/dieta/types";
import type { DietInsight } from "@/lib/dieta/calculations";
import { AddMealModal } from "@/components/dieta/add-meal-modal";

interface DietaClientProps {
  todayMeals: MealEntry[];
  todayTotals: Nutrients;
  targets: NutrientTargets;
  weeklyTrend: { date: string; nutrients: Nutrients }[];
  insights: DietInsight[];
}

const INSIGHT_STYLE = {
  good: "bg-emerald-50 border-emerald-200 text-emerald-700",
  warn: "bg-amber-50 border-amber-200 text-amber-800",
  info: "bg-blue-50 border-blue-200 text-blue-700",
} as const;

const INSIGHT_DOT = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  info: "bg-blue-500",
} as const;

function fmt(n: number, digits = 0): string {
  return n.toFixed(digits).replace(".", ",");
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtWeekday(iso: string): string {
  const d = new Date(iso);
  return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d.getDay()];
}

export function DietaClient({
  todayMeals,
  todayTotals,
  targets,
  weeklyTrend,
  insights,
}: DietaClientProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const calPct = Math.min((todayTotals.calories / targets.calories) * 100, 100);
  const proteinPct = Math.min((todayTotals.protein / targets.protein) * 100, 100);
  const carbsPct = Math.min((todayTotals.carbs / targets.carbs) * 100, 100);
  const fatPct = Math.min((todayTotals.fat / targets.fat) * 100, 100);

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6 sm:py-10">
      {/* Header */}
      <header className="mb-6">
        <span className="text-[13px] text-muted">Tracking nutricional</span>
        <h1 className="text-[32px] leading-[1.05] font-semibold tracking-tight sm:text-[40px]">
          Dieta
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Foto do prato, texto livre ou código de barras. Dr. Lon usa esses
          dados pra refinar seu diagnóstico.
        </p>
      </header>

      {/* Diagnóstico Dr. Lon */}
      {insights.length > 0 && (
        <section className="mb-6 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            Análise da semana — Dr. Lon
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {insights.map((ins) => (
              <li
                key={ins.id}
                className={cn(
                  "flex gap-3 rounded-xl border px-3 py-2.5",
                  INSIGHT_STYLE[ins.severity],
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    INSIGHT_DOT[ins.severity],
                  )}
                />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold leading-snug">
                    {ins.title}
                  </div>
                  <div className="mt-0.5 text-[12px] leading-relaxed opacity-85">
                    {ins.detail}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Calorias do dia */}
      <section className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Hoje
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-[42px] font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">
            {fmt(todayTotals.calories)}
          </span>
          <span className="text-[15px] font-medium text-zinc-400">
            / {targets.calories} kcal
          </span>
        </div>
        <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-400 to-brand-700 transition-[width] duration-1000"
            style={{ width: `${calPct}%` }}
          />
        </div>

        {/* Macros */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <MacroCard
            label="Proteína"
            value={todayTotals.protein}
            target={targets.protein}
            pct={proteinPct}
            color="emerald"
          />
          <MacroCard
            label="Carbs"
            value={todayTotals.carbs}
            target={targets.carbs}
            pct={carbsPct}
            color="amber"
          />
          <MacroCard
            label="Gordura"
            value={todayTotals.fat}
            target={targets.fat}
            pct={fatPct}
            color="rose"
          />
        </div>
      </section>

      {/* CTA + lista de refeições */}
      <section className="mb-8">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 px-5 py-4 text-[15px] font-semibold text-white shadow-[0_8px_24px_-10px_rgba(31,93,63,0.4)] transition hover:shadow-[0_12px_32px_-10px_rgba(31,93,63,0.5)] active:scale-[0.99]"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          Adicionar refeição
        </button>

        <h2 className="mt-7 mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
          Refeições de hoje
        </h2>
        {todayMeals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-5 py-8 text-center text-[13px] text-zinc-500">
            Nenhuma refeição registrada hoje. Use o botão acima pra começar.
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {todayMeals.map((m) => (
              <li key={m.id}>
                <MealCard meal={m} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Histórico semanal */}
      <section>
        <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
          Últimos 7 dias
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {weeklyTrend.map((day, i) => {
            const isToday = i === weeklyTrend.length - 1;
            const dayPct = Math.min(
              (day.nutrients.calories / targets.calories) * 100,
              100,
            );
            return (
              <div
                key={day.date}
                className={cn(
                  "flex min-w-[78px] flex-col items-center gap-1.5 rounded-2xl border px-3 py-3",
                  isToday
                    ? "border-brand-300 bg-brand-50/50"
                    : "border-zinc-200 bg-white",
                )}
              >
                <span className="text-[11px] font-semibold uppercase text-zinc-500">
                  {fmtWeekday(day.date)}
                </span>
                <span className="text-[15px] font-semibold tabular-nums text-zinc-900">
                  {fmt(day.nutrients.calories)}
                </span>
                <span className="text-[9.5px] text-zinc-400">kcal</span>
                <div className="relative mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
                    style={{ width: `${dayPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <AddMealModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

// ─── MacroCard ─────────────────────────────────────────────────────────────

function MacroCard({
  label,
  value,
  target,
  pct,
  color,
}: {
  label: string;
  value: number;
  target: number;
  pct: number;
  color: "emerald" | "amber" | "rose";
}) {
  const colorClass = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  }[color];
  return (
    <div className="rounded-xl bg-zinc-50/70 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[18px] font-semibold tabular-nums text-zinc-900">
          {fmt(value)}
        </span>
        <span className="text-[10px] text-zinc-400">/ {target}g</span>
      </div>
      <div className="relative mt-1.5 h-1 w-full overflow-hidden rounded-full bg-zinc-200/60">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── MealCard ──────────────────────────────────────────────────────────────

function MealCard({ meal }: { meal: MealEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white transition",
        expanded && "ring-1 ring-brand-200",
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-[22px]">{MEAL_TYPE_ICON[meal.mealType]}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-zinc-900">
              {MEAL_TYPE_LABEL[meal.mealType]}
            </h3>
            <span className="text-[11px] text-zinc-400">
              · {fmtTime(meal.takenAt)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[12px] text-zinc-500">
            {meal.items.map((i) => i.name).join(", ")}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[15px] font-semibold tabular-nums text-zinc-900">
            {fmt(meal.totalNutrients.calories)}
          </div>
          <div className="text-[10px] text-zinc-400">kcal</div>
        </div>
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-zinc-400 transition-transform",
            expanded && "rotate-90",
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 bg-zinc-50/40 px-4 py-3">
          <ul className="flex flex-col gap-1.5">
            {meal.items.map((item) => (
              <li
                key={item.id}
                className="flex items-baseline justify-between gap-2 text-[12px]"
              >
                <span className="text-zinc-700">
                  {item.name}{" "}
                  <span className="text-zinc-400">
                    · {fmt(item.quantity)}
                    {item.unit}
                  </span>
                </span>
                <span className="tabular-nums text-zinc-500">
                  {fmt(item.nutrients.calories)} kcal
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[10.5px] text-zinc-500">
            <span>
              P:{" "}
              <span className="font-semibold text-emerald-600">
                {fmt(meal.totalNutrients.protein, 1)}g
              </span>
            </span>
            <span>
              C:{" "}
              <span className="font-semibold text-amber-600">
                {fmt(meal.totalNutrients.carbs, 1)}g
              </span>
            </span>
            <span>
              G:{" "}
              <span className="font-semibold text-rose-600">
                {fmt(meal.totalNutrients.fat, 1)}g
              </span>
            </span>
          </div>
        </div>
      )}
    </article>
  );
}
