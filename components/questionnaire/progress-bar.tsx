import { cn } from "@/lib/utils";

interface QuestionnaireProgressProps {
  current: number; // 0-indexed
  total: number;
  className?: string;
}

export function QuestionnaireProgress({
  current,
  total,
  className,
}: QuestionnaireProgressProps) {
  const pct = Math.min(100, Math.round((current / total) * 100));
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between text-[12px] text-muted">
        <span>
          Pergunta {Math.min(current + 1, total)} de {total}
        </span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
        <div
          className="h-full bg-brand-500 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
