"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { GradeBadge } from "@/components/ui/badge";
import type { BiomarkerCategory, CategoryGrade } from "@/lib/mock-data";

interface CategoryListProps {
  categories: BiomarkerCategory[];
  activeId: string;
  onChange: (id: string) => void;
  /** Quando true, usa `shortLabel` (fallback `label`). Default: false. */
  compact?: boolean;
  /**
   * Status real por órgão (heart/liver/etc.) — usado pra sobrescrever
   * o `grade` estático do mock pelas cores REAIS computadas a partir
   * dos biomarcadores do paciente. Lucas (2026-05-20): "as cores das
   * categorias tem que mudar, conforme as cores no corpo mudam."
   */
  organStatuses?: Record<string, "optimal" | "normal" | "out">;
}

// Mapeia status clínico → letra de grade (mantém UI igual, só muda fonte).
const STATUS_TO_GRADE: Record<"optimal" | "normal" | "out", CategoryGrade> = {
  optimal: "A",
  normal: "B",
  out: "D",
};

export function CategoryList({
  categories,
  activeId,
  onChange,
  compact = false,
  organStatuses,
}: CategoryListProps) {
  return (
    <nav className="flex flex-col gap-0.5">
      {categories.map((cat) => {
        const active = cat.id === activeId;
        const isAll = cat.id === "all";
        const label = compact ? (cat.shortLabel ?? cat.label) : cat.label;

        // Grade dinâmica: prefere status real do órgão (organStatuses)
        // sobre o grade estático do mock. Pra categoria sem status mapeado
        // (ex: dados parciais ainda carregando), cai no grade mock.
        const dynamicStatus = organStatuses?.[cat.id];
        const effectiveGrade = dynamicStatus
          ? STATUS_TO_GRADE[dynamicStatus]
          : cat.grade;

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-full px-3 h-11 text-left transition-colors",
              active
                ? "bg-green-50 text-brand-700 font-semibold"
                : "text-muted hover:bg-brand-50 hover:text-ink",
            )}
          >
            <span className="flex items-center gap-3">
              {isAll ? (
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full",
                    active
                      ? "bg-brand-500 text-white"
                      : "bg-brand-100 text-brand-700",
                  )}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
              ) : (
                <GradeBadge grade={effectiveGrade} />
              )}
              <span className="text-[14px] font-medium leading-tight">
                {label}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
