"use client";

import { Check, Flame, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HabitStatus } from "@/lib/habits/types";

interface HabitRowProps {
  label: string;
  status: HabitStatus | undefined;
  streak: number;
  onSet: (status: HabitStatus | null) => void;
}

const BUTTONS: Array<{
  status: HabitStatus;
  Icon: typeof Check;
  title: string;
  classes: { idle: string; active: string };
}> = [
  {
    status: "done",
    Icon: Check,
    title: "Fiz",
    classes: {
      idle: "border-border bg-white text-muted hover:border-brand-300 hover:text-brand-700",
      active: "border-brand-500 bg-brand-500 text-white",
    },
  },
  {
    status: "missed",
    Icon: X,
    title: "Não fiz",
    classes: {
      idle: "border-border bg-white text-muted hover:border-[#E85D5D]/50 hover:text-[#B6333A]",
      active: "border-[#E85D5D] bg-[#FBE1E1] text-[#B6333A]",
    },
  },
  {
    status: "skip",
    Icon: Minus,
    title: "Pular",
    classes: {
      idle: "border-border bg-white text-muted hover:border-border hover:text-ink",
      active: "border-[#C7CDC8] bg-[#EEF1EE] text-ink",
    },
  },
];

export function HabitRow({ label, status, streak, onSet }: HabitRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium leading-tight">{label}</div>
        {streak > 0 ? (
          <div className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] text-muted">
            <Flame className="h-3 w-3 text-[#D97843]" />
            {streak} {streak === 1 ? "dia seguido" : "dias seguidos"}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5">
        {BUTTONS.map(({ status: s, Icon, title, classes }) => {
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              title={title}
              aria-label={title}
              aria-pressed={active}
              onClick={() => onSet(active ? null : s)}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-full border transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
                active ? classes.active : classes.idle,
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
