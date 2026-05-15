"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { MealEntry, MealType } from "@/lib/dieta/types";

const MEAL_CONFIG: Record<
  MealType,
  { label: string; emoji: string; color: string }
> = {
  breakfast: {
    label: "Café da manhã",
    emoji: "☕",
    color: "bg-amber-50 text-amber-700",
  },
  lunch: {
    label: "Almoço",
    emoji: "🍽️",
    color: "bg-emerald-50 text-emerald-700",
  },
  dinner: {
    label: "Jantar",
    emoji: "🌙",
    color: "bg-indigo-50 text-indigo-700",
  },
  snack: {
    label: "Lanche",
    emoji: "🥪",
    color: "bg-orange-50 text-orange-700",
  },
};

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  meal: MealEntry;
}

export function MealCard({ meal }: Props) {
  const [expanded, setExpanded] = useState(false);
  const cfg = MEAL_CONFIG[meal.mealType];
  const n = meal.totalNutrients;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left"
        aria-expanded={expanded}
        aria-label={`${cfg.label} — ${n.calories} kcal`}
      >
        <div className="flex items-center gap-3 p-4 sm:p-5">
          {/* Meal type icon */}
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl",
              cfg.color,
            )}
          >
            {cfg.emoji}
          </span>

          <div className="flex-1 min-w-0">
            {/* Top row: label + time */}
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-semibold text-ink">
                {cfg.label}
              </span>
              <span className="text-[12px] tabular-nums text-muted shrink-0">
                {formatTime(meal.takenAt)}
              </span>
            </div>

            {/* Items preview */}
            <p className="mt-0.5 text-[13px] text-muted truncate">
              {meal.items.map((item) => item.name).join(", ")}
            </p>
          </div>

          {/* Calories + chevron */}
          <div className="flex flex-col items-end shrink-0 gap-1 ml-2">
            <span className="text-[15px] font-semibold tabular-nums text-ink">
              {Math.round(n.calories)} kcal
            </span>
            <span className="text-[11px] tabular-nums text-muted">
              P {Math.round(n.protein)}g · C {Math.round(n.carbs)}g · G{" "}
              {Math.round(n.fat)}g
            </span>
          </div>

          <span className="text-muted ml-1">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 pb-4 pt-3 sm:px-5">
          {/* Food items list */}
          <ul className="space-y-2 mb-4">
            {meal.items.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between gap-2 text-[13px]"
              >
                <span className="text-ink font-medium">
                  {item.name}
                  <span className="font-normal text-muted ml-1.5">
                    {item.quantity}
                    {item.unit === "unit" ? "" : item.unit}
                  </span>
                </span>
                <span className="tabular-nums text-muted shrink-0">
                  {Math.round(item.nutrients.calories)} kcal
                </span>
              </li>
            ))}
          </ul>

          {/* Nutrient detail grid */}
          <div className="grid grid-cols-3 gap-2 border-t border-zinc-200 pt-3">
            <NutrientCell label="Proteína" value={n.protein} unit="g" />
            <NutrientCell label="Carboidratos" value={n.carbs} unit="g" />
            <NutrientCell label="Gordura" value={n.fat} unit="g" />
            {n.fiber !== undefined && (
              <NutrientCell label="Fibra" value={n.fiber} unit="g" />
            )}
            {n.sodium !== undefined && (
              <NutrientCell label="Sódio" value={n.sodium} unit="mg" />
            )}
            {n.sugar !== undefined && (
              <NutrientCell label="Açúcar" value={n.sugar} unit="g" />
            )}
            {n.vitaminD !== undefined && (
              <NutrientCell label="Vit. D" value={n.vitaminD} unit="µg" />
            )}
            {n.vitaminB12 !== undefined && (
              <NutrientCell label="Vit. B12" value={n.vitaminB12} unit="µg" />
            )}
            {n.omega3 !== undefined && (
              <NutrientCell label="Ômega-3" value={n.omega3} unit="g" />
            )}
            {n.calcium !== undefined && (
              <NutrientCell label="Cálcio" value={n.calcium} unit="mg" />
            )}
            {n.magnesium !== undefined && (
              <NutrientCell label="Magnésio" value={n.magnesium} unit="mg" />
            )}
            {n.iron !== undefined && (
              <NutrientCell label="Ferro" value={n.iron} unit="mg" />
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function NutrientCell({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums text-ink">
        {Number.isInteger(value) ? value : value.toFixed(1)}
        <span className="text-[11px] font-normal text-muted ml-0.5">{unit}</span>
      </span>
    </div>
  );
}
