"use client";

import { cn } from "@/lib/utils";

interface ConditionalSectionProps {
  show: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wrapper p/ blocos condicionais (ex: "se sim, descreva..."). Mantém
 * espaçamento consistente e fica recolhido quando `show=false`.
 */
export function ConditionalSection({
  show,
  className,
  children,
}: ConditionalSectionProps) {
  if (!show) return null;
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 p-3.5",
        className,
      )}
    >
      {children}
    </div>
  );
}
