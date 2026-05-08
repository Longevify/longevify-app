import { cn } from "@/lib/utils";
import type { Biomarker } from "@/lib/mock-data";

interface RangePositionProps {
  biomarker: Biomarker;
}

/**
 * Renders a horizontal bar showing where the current value falls on a
 * scale defined by the optimal/normal ranges. The bar is composed in
 * three layers: the rose background covers the entire scale and represents
 * "Fora" (out of range), the amber band covers the normal range, and the
 * emerald band sits on top covering the optimal range. The thumb marks
 * the user's current value.
 *
 * When `normalRange` is not defined for a biomarker, the layout
 * collapses to two zones (Ótimo + Fora) — there's no synthetic intermediate
 * normal band. The legend hides the "Normal" entry to match.
 */
export function RangePosition({ biomarker }: RangePositionProps) {
  const { value, optimalRange, normalRange, unit } = biomarker;

  // Build an X-axis scale that covers a generous window around all known
  // thresholds and the current value so we can show where the user sits.
  const anchors = [
    value,
    optimalRange?.[0],
    optimalRange?.[1],
    normalRange?.[0],
    normalRange?.[1],
  ].filter((v): v is number => typeof v === "number");

  if (anchors.length === 0) return null;

  const rawMin = Math.min(...anchors);
  const rawMax = Math.max(...anchors);
  const span = rawMax - rawMin || rawMax * 0.5 || 1;
  const pad = span * 0.25;
  const scaleMin = Math.max(0, rawMin - pad);
  const scaleMax = rawMax + pad;
  const scaleSpan = scaleMax - scaleMin;

  const pct = (v: number) =>
    Math.max(0, Math.min(100, ((v - scaleMin) / scaleSpan) * 100));

  const optStart = optimalRange ? pct(optimalRange[0]) : null;
  const optEnd = optimalRange ? pct(optimalRange[1]) : null;
  const normStart = normalRange ? pct(normalRange[0]) : null;
  const normEnd = normalRange ? pct(normalRange[1]) : null;
  const valuePct = pct(value);
  const hasNormal = normStart !== null && normEnd !== null;
  const hasOptimal = optStart !== null && optEnd !== null;

  return (
    <div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#FBE1E1]">
        {hasNormal ? (
          <div
            className="absolute inset-y-0 bg-[#FBF0D4]"
            style={{ left: `${normStart}%`, width: `${normEnd - normStart}%` }}
          />
        ) : null}
        {hasOptimal ? (
          <div
            className="absolute inset-y-0 bg-[#DFF5E9]"
            style={{ left: `${optStart}%`, width: `${optEnd - optStart}%` }}
          />
        ) : null}
        <div
          className={cn(
            "absolute -top-1 h-5 w-[3px] rounded-full bg-ink shadow-[0_0_0_2px_rgba(255,255,255,0.9)]",
          )}
          style={{ left: `calc(${valuePct}% - 1.5px)` }}
        />
      </div>

      <div className="mt-3 flex items-baseline justify-between text-[11px] text-muted tabular-nums">
        <span>{+scaleMin.toFixed(1)}</span>
        <span className="text-[13px] font-semibold text-ink">
          {value}
          <span className="ml-1 text-[11px] font-normal text-muted">{unit}</span>
        </span>
        <span>{+scaleMax.toFixed(1)}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
        {hasOptimal ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#10b981]" />
            Ótimo
          </span>
        ) : null}
        {hasNormal ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#e6b845]" />
            Normal
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#e85d5d]" />
          Fora
        </span>
      </div>
    </div>
  );
}
