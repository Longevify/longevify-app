import { cn } from "@/lib/utils";
import type { Biomarker } from "@/lib/mock-data";

interface RangePositionProps {
  biomarker: Biomarker;
}

/**
 * Renderiza uma barra horizontal mostrando onde o valor atual cai numa
 * escala definida por `optimalRange` e `normalRange`. A faixa ótima é
 * verde, a normal é amarela, e tudo fora é vermelho. O thumb marca o
 * valor do paciente.
 *
 * Layout: legenda (Ótimo · Normal · Fora) ACIMA da barra — sempre os 3
 * dots fixos pra padronizar visual entre todos os biomarcadores, mesmo
 * quando algum não tem normalRange definido.
 */
export function RangePosition({ biomarker }: RangePositionProps) {
  const { value, optimalRange, normalRange, unit } = biomarker;

  // Escala X cobrindo todos os thresholds + valor atual com padding lateral.
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

  return (
    <div>
      {/* Legenda — SEMPRE acima da barra, com 3 dots fixos. */}
      <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#10b981]" />
          Ótimo
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#e6b845]" />
          Normal
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#e85d5d]" />
          Fora
        </span>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#FBE1E1]">
        {normStart !== null && normEnd !== null ? (
          <div
            className="absolute inset-y-0 bg-[#FBF0D4]"
            style={{ left: `${normStart}%`, width: `${normEnd - normStart}%` }}
          />
        ) : null}
        {optStart !== null && optEnd !== null ? (
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
    </div>
  );
}
