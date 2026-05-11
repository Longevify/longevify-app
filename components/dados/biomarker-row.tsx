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
        /* Grid com colunas fixas garante que os sparklines fiquem
           sempre alinhados no mesmo eixo X, independente da largura
           do chip de status (Ótimo vs. Fora da Faixa). */
        "group grid items-center gap-3 px-5 py-4",
        "grid-cols-[minmax(0,1fr)_120px_16px] sm:grid-cols-[minmax(0,1fr)_160px_120px_16px]",
        "border-b border-border/70 last:border-none",
        "cursor-pointer transition-colors hover:bg-brand-50/70",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
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
      <div className="hidden sm:block">
        <Sparkline data={biomarker.history} status={biomarker.status} />
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="text-[15px] font-semibold tabular-nums">
          {biomarker.value}
          <span className="ml-1 text-[12px] font-normal text-muted">
            {biomarker.unit}
          </span>
        </div>
        <StatusBadge status={biomarker.status} />
      </div>
      <ChevronRight
        className="h-4 w-4 text-muted/60 transition-colors group-hover:text-ink"
        strokeWidth={2}
      />
    </Link>
  );
}
