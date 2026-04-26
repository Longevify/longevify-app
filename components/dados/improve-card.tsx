"use client";

import { useState } from "react";
import { Activity, Moon, Pill, Salad, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImproveActions } from "@/lib/biomarker-knowledge";

type TabKey = keyof ImproveActions;

const TABS: { key: TabKey; label: string; icon: typeof Sun }[] = [
  { key: "rotina", label: "Rotina", icon: Sun },
  { key: "alimentacao", label: "Alimentação", icon: Salad },
  { key: "suplementacao", label: "Suplementação", icon: Pill },
  { key: "exercicio", label: "Exercício", icon: Activity },
  { key: "sono", label: "Sono", icon: Moon },
];

export function ImproveCard({ improve }: { improve: ImproveActions }) {
  const [active, setActive] = useState<TabKey>("rotina");
  const items = improve[active];

  return (
    <div className="rounded-[20px] border border-border bg-surface shadow-[0_1px_2px_rgba(13,40,24,.04)]">
      <div className="px-5 pt-5 pb-2">
        <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
          Como melhorar
        </div>
        <h3 className="mt-1 text-[18px] font-semibold tracking-tight">
          Ações práticas
        </h3>
      </div>

      <div className="px-5 pt-4">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map(({ key, label, icon: Icon }) => {
            const isActive = key === active;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActive(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full h-9 px-3.5 text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-brand-900 text-white"
                    : "bg-brand-50 text-ink hover:bg-brand-100",
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 pt-5 pb-6">
        <ul className="space-y-2.5">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex gap-3 text-[14px] leading-relaxed text-ink/90"
            >
              <span className="mt-[9px] inline-block h-1.5 w-1.5 flex-none rounded-full bg-brand-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
