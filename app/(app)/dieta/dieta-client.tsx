"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MealCard } from "@/components/dieta/meal-card";
import { AddMealModal } from "@/components/dieta/add-meal-modal";
import type { MealEntry, MealType } from "@/lib/dieta/types";
import { MOCK_DAILY_TARGET } from "@/lib/dieta/mock";

type MacroKey = "protein" | "carbs" | "fat";

const MACRO_CONFIG: {
  key: MacroKey;
  label: string;
  color: string;
  bgColor: string;
}[] = [
  {
    key: "protein",
    label: "Proteina",
    color: "bg-blue-500",
    bgColor: "bg-blue-100",
  },
  {
    key: "carbs",
    label: "Carbs",
    color: "bg-amber-400",
    bgColor: "bg-amber-100",
  },
  {
    key: "fat",
    label: "Gordura",
    color: "bg-brand-500",
    bgColor: "bg-brand-100",
  },
];

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Cafe da manha",
  lunch: "Almoco",
  dinner: "Jantar",
  snack: "Lanche",
};

function todayLabel(): string {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function ProgressBar({
  value,
  target,
  colorClass,
  bgClass,
}: {
  value: number;
  target: number;
  colorClass: string;
  bgClass: string;
}) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <div className={cn("h-2 w-full rounded-full overflow-hidden", bgClass)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", colorClass)}
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemax={target}
        aria-label={`${pct}%`}
      />
    </div>
  );
}

interface Props {
  initialMeals: MealEntry[];
}

export function DietaClient({ initialMeals }: Props) {
  const [meals, setMeals] = useState<MealEntry[]>(initialMeals);
  const [showModal, setShowModal] = useState(false);

  const totalCalories = meals.reduce(
    (sum, m) => sum + m.totalNutrients.calories,
    0,
  );
  const totalProtein = meals.reduce(
    (sum, m) => sum + m.totalNutrients.protein,
    0,
  );
  const totalCarbs = meals.reduce(
    (sum, m) => sum + m.totalNutrients.carbs,
    0,
  );
  const totalFat = meals.reduce((sum, m) => sum + m.totalNutrients.fat, 0);

  const macroValues: Record<MacroKey, number> = {
    protein: totalProtein,
    carbs: totalCarbs,
    fat: totalFat,
  };
  const macroTargets: Record<MacroKey, number> = {
    protein: MOCK_DAILY_TARGET.protein,
    carbs: MOCK_DAILY_TARGET.carbs,
    fat: MOCK_DAILY_TARGET.fat,
  };

  const handleSave = useCallback(
    (entry: Omit<MealEntry, "id" | "patientId">) => {
      const newMeal: MealEntry = {
        ...entry,
        id: `meal-${Date.now()}`,
        patientId: "demo",
      };
      setMeals((prev) =>
        [...prev, newMeal].sort(
          (a, b) =>
            new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime(),
        ),
      );
    },
    [],
  );

  // Group meals by type for the ordered list
  const mealsByType = MEAL_ORDER.reduce<Record<MealType, MealEntry[]>>(
    (acc, type) => {
      acc[type] = meals.filter((m) => m.mealType === type);
      return acc;
    },
    { breakfast: [], lunch: [], dinner: [], snack: [] },
  );

  const caloriesPct = Math.min(
    100,
    Math.round((totalCalories / MOCK_DAILY_TARGET.calories) * 100),
  );

  return (
    <>
      <div className="mx-auto w-full max-w-[640px] px-4 py-6 sm:px-6 sm:py-10">
        {/* ─── Header ───────────────────────────────────────────────── */}
        <header className="mb-6">
          <p className="text-[13px] capitalize text-muted">{todayLabel()}</p>
          <h1 className="mt-0.5 text-[32px] font-semibold tracking-tight text-ink">
            Dieta
          </h1>

          {/* Calorie big number */}
          <div className="mt-4 flex items-end gap-3">
            <div>
              <span className="text-[48px] font-semibold tabular-nums leading-none text-ink">
                {Math.round(totalCalories)}
              </span>
              <span className="text-[18px] font-medium text-muted ml-1">
                / {MOCK_DAILY_TARGET.calories} kcal
              </span>
            </div>
            <span
              className={cn(
                "mb-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums",
                caloriesPct >= 100
                  ? "bg-red-100 text-red-700"
                  : caloriesPct >= 80
                    ? "bg-amber-100 text-amber-700"
                    : "bg-brand-100 text-brand-700",
              )}
            >
              {caloriesPct}%
            </span>
          </div>

          {/* Calorie progress bar */}
          <div className="mt-2 h-2.5 w-full rounded-full overflow-hidden bg-zinc-100">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                caloriesPct >= 100 ? "bg-red-500" : "bg-brand-500",
              )}
              style={{ width: `${caloriesPct}%` }}
              role="progressbar"
              aria-valuenow={Math.round(totalCalories)}
              aria-valuemax={MOCK_DAILY_TARGET.calories}
              aria-label={`${caloriesPct}% da meta calorica`}
            />
          </div>
        </header>

        {/* ─── Macro cards ──────────────────────────────────────────── */}
        <section
          className="mb-6 grid grid-cols-3 gap-3"
          aria-label="Macronutrientes do dia"
        >
          {MACRO_CONFIG.map(({ key, label, color, bgColor }) => {
            const val = macroValues[key];
            const target = macroTargets[key];
            const pct = Math.min(100, Math.round((val / target) * 100));
            return (
              <div
                key={key}
                className="rounded-2xl border border-zinc-100 bg-white p-3.5 flex flex-col gap-2"
              >
                <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
                  {label}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-[20px] font-semibold tabular-nums text-ink leading-none">
                    {Math.round(val)}
                  </span>
                  <span className="text-[11px] text-muted">
                    / {target}g
                  </span>
                </div>
                <ProgressBar
                  value={val}
                  target={target}
                  colorClass={color}
                  bgClass={bgColor}
                />
                <span className="text-[11px] tabular-nums text-muted">
                  {pct}%
                </span>
              </div>
            );
          })}
        </section>

        {/* ─── CTA ──────────────────────────────────────────────────── */}
        <Button
          variant="primary"
          size="lg"
          className="w-full mb-8 gap-2"
          onClick={() => setShowModal(true)}
        >
          <Plus className="h-5 w-5" />
          Adicionar refeicao
        </Button>

        {/* ─── Meal list ────────────────────────────────────────────── */}
        <section aria-label="Refeicoes de hoje">
          {MEAL_ORDER.map((type) => {
            const group = mealsByType[type];
            if (group.length === 0) return null;
            return (
              <div key={type} className="mb-6">
                <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                  {MEAL_LABELS[type]}
                </h2>
                <div className="space-y-2">
                  {group.map((meal) => (
                    <MealCard key={meal.id} meal={meal} />
                  ))}
                </div>
              </div>
            );
          })}

          {meals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-4xl mb-3">🥗</span>
              <p className="text-[15px] font-medium text-ink">
                Nenhuma refeicao registrada hoje
              </p>
              <p className="text-[13px] text-muted mt-1">
                Adicione sua primeira refeicao usando foto, texto ou codigo de
                barras
              </p>
            </div>
          )}
        </section>
      </div>

      {/* ─── Modal ────────────────────────────────────────────────────── */}
      {showModal && (
        <AddMealModal
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
