import { cn } from "@/lib/utils";

interface BioAgeCardProps {
  biologicalAge: number;
  chronologicalAge: number;
  className?: string;
}

export function BioAgeCard({
  biologicalAge,
  chronologicalAge,
  className,
}: BioAgeCardProps) {
  const diff = +(chronologicalAge - biologicalAge).toFixed(1);
  const younger = diff > 0;
  const relative =
    diff === 0
      ? "igual à sua idade cronológica"
      : younger
        ? `${Math.abs(diff)} anos mais jovem`
        : `${Math.abs(diff)} anos mais velho`;

  // Position thumb on a 20..60 scale
  const min = 20;
  const max = 60;
  const pct = ((biologicalAge - min) / (max - min)) * 100;

  return (
    <article
      className={cn(
        "rounded-[20px] border border-border bg-surface p-6",
        "shadow-[0_1px_2px_rgba(13,40,24,.04)]",
        className,
      )}
    >
      <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
        Idade Biológica
      </div>
      <div className="mt-3 flex items-end gap-3">
        <span className="text-muted text-[13px] font-medium">Age</span>
        <span className="text-[56px] leading-none font-semibold tracking-tight">
          {biologicalAge}
        </span>
      </div>
      <div className="mt-2 text-[13px] text-muted">{relative}</div>
      <div className="mt-5">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: "100%",
              background:
                "linear-gradient(90deg, #10B981 0%, #79C98E 40%, #E6B845 70%, #E85D5D 100%)",
            }}
          />
          <div
            className="absolute -top-1 h-3.5 w-[2px] bg-ink"
            style={{ left: `calc(${pct}% - 1px)` }}
          />
        </div>
      </div>
    </article>
  );
}
