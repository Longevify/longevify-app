"use client";

import { cn } from "@/lib/utils";

/**
 * Lucas (2026-05-24): foguinho compartilhado entre você e amigo
 * (Snapchat snap-streak style). Mostra dias e fica em risco quando um
 * dos dois ainda não fez task hoje.
 */
export function FriendStreakBadge({
  days,
  atRisk,
  size = "sm",
}: {
  days: number;
  atRisk?: boolean;
  size?: "sm" | "md";
}) {
  if (days === 0) return null;

  const isSm = size === "sm";
  return (
    <span
      title={
        atRisk
          ? `Streak compartilhado de ${days} dia${days === 1 ? "" : "s"} — em risco! Um de vocês ainda não fez hoje.`
          : `Streak compartilhado de ${days} dia${days === 1 ? "" : "s"} 🔥`
      }
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full font-bold tabular-nums",
        isSm
          ? "px-1.5 py-0.5 text-[10px]"
          : "px-2.5 py-1 text-[12px]",
        atRisk
          ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
          : days >= 30
            ? "bg-gradient-to-r from-amber-200 to-rose-200 text-rose-900 ring-1 ring-amber-300"
            : days >= 7
              ? "bg-orange-100 text-orange-800"
              : "bg-amber-50 text-amber-700",
      )}
    >
      <span aria-hidden>{atRisk ? "⏳" : "🔥"}</span>
      {days}
    </span>
  );
}
