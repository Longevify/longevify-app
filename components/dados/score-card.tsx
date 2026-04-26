import { cn } from "@/lib/utils";

interface ScoreCardProps {
  score: number;
  status: "on-track" | "attention" | "at-risk";
  className?: string;
}

export function ScoreCard({ score, status, className }: ScoreCardProps) {
  const statusLabel =
    status === "on-track"
      ? "On Track"
      : status === "attention"
        ? "Atenção"
        : "Em Risco";

  // position the progress thumb along the 0-100 bar
  const thumbPct = Math.min(Math.max(score, 0), 100);

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[20px] p-6",
        "bg-gradient-to-br from-[#143D28] via-[#0F3020] to-[#0C2418] text-white",
        "shadow-[0_1px_2px_rgba(13,40,24,.08)]",
        className,
      )}
    >
      <div className="text-[11px] font-semibold tracking-[0.14em] text-white/70 uppercase">
        Longevify Score
      </div>
      <div className="mt-3 flex items-end gap-3">
        <span className="text-[56px] leading-none font-semibold tracking-tight">
          {score}
        </span>
        <span className="mb-2 inline-flex items-center rounded-full bg-white/10 px-3 h-7 text-[12px] font-medium text-white/90 backdrop-blur">
          {statusLabel}
        </span>
      </div>
      <div className="mt-6">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: "100%",
              background:
                "linear-gradient(90deg, #E85D5D 0%, #F39A50 25%, #E6B845 50%, #79C98E 75%, #10B981 100%)",
            }}
          />
          <div
            className="absolute -top-1 h-3.5 w-[2px] bg-white"
            style={{ left: `calc(${thumbPct}% - 1px)` }}
          />
        </div>
      </div>
    </article>
  );
}
