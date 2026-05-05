import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge, StatusDot } from "@/components/ui/badge";
import { Sparkline } from "@/components/dados/sparkline";
import type { Biomarker } from "@/lib/mock-data";

export function BiomarkerRow({
  biomarker,
  className,
}: {
  biomarker: Biomarker;
  className?: string;
}) {
  return (
    <Link
      href={`/dados/${biomarker.id}`}
      className={cn(
        /* M2: gap-3 em vez de gap-6 evita estouro dos 390px em mobile */
        "group flex items-center gap-3 px-5 py-4",
        "border-b border-border/70 last:border-none",
        "cursor-pointer transition-colors hover:bg-brand-50/70",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <StatusDot status={biomarker.status} />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-medium leading-tight">
            {biomarker.name}
          </div>
          <div className="truncate text-[12px] text-muted">
            {biomarker.category}
          </div>
        </div>
      </div>
      <div className="hidden w-40 sm:block">
        <Sparkline data={biomarker.history} status={biomarker.status} />
      </div>
      {/* M2: w-auto em vez de w-44 fixo — evita sobreposição de valor+badge em 390px */}
      <div className="flex w-auto flex-col items-end gap-1">
        <div className="text-[15px] font-semibold tabular-nums">
          {biomarker.value}
          <span className="ml-1 text-[12px] font-normal text-muted">
            {biomarker.unit}
          </span>
        </div>
        <StatusBadge status={biomarker.status} />
      </div>
      <ChevronRight
        className="h-4 w-4 flex-none text-muted/60 transition-colors group-hover:text-ink"
        strokeWidth={2}
      />
    </Link>
  );
}
