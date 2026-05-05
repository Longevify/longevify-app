"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { GradeBadge } from "@/components/ui/badge";
import type { BiomarkerCategory } from "@/lib/mock-data";

interface CategoryListProps {
  categories: BiomarkerCategory[];
  activeId: string;
  onChange: (id: string) => void;
}

export function CategoryList({
  categories,
  activeId,
  onChange,
}: CategoryListProps) {
  return (
    <nav className="flex flex-col gap-0.5">
      {categories.map((cat) => {
        const active = cat.id === activeId;
        const isAll = cat.id === "all";
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className={cn(
              // H3: estado ativo inequívoco — fundo verde suave + texto brand + semibold
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
                <GradeBadge grade={cat.grade} />
              )}
              <span className="text-[14px] font-medium leading-tight">
                {cat.label}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
