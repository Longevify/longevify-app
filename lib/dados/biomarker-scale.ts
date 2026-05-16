import type { Biomarker } from "@/lib/mock-data";

/**
 * Escala unificada pra Y-axis do gráfico histórico (`BiomarkerBigChart`)
 * E pra X-axis da barra de posição (`RangePosition`).
 *
 * Lucas (2026-05): "a faixa 'Histórico — Evolução ao longo do tempo' tem
 * que ser igual a faixa 'Contexto da faixa — Sua posição'". Antes cada
 * componente computava seu próprio min/max com paddings diferentes
 * (chart 20% do span, range 25% do rawMax) — resultava em escalas
 * sutilmente diferentes que ofereciam contexto inconsistente.
 *
 * Algoritmo:
 *   - Coleta TODOS os anchors: valor atual + bounds de optimalRange +
 *     bounds de normalRange + todo o histórico.
 *   - rawMin/rawMax dessa lista.
 *   - Padding = max(span*0.15, rawMax*0.06, 1) — generoso o suficiente
 *     pra não cortar pontos próximos ao limite, conservador o suficiente
 *     pra não deixar a barra "espremida no meio".
 *   - min nunca abaixo de 0 (biomarcadores não negativam).
 */
export function computeBiomarkerScale(biomarker: Biomarker): {
  min: number;
  max: number;
} {
  const historyValues = biomarker.history.map((p) => p.value);

  const anchors = [
    biomarker.value,
    ...historyValues,
    biomarker.optimalRange?.[0],
    biomarker.optimalRange?.[1],
    biomarker.normalRange?.[0],
    biomarker.normalRange?.[1],
  ].filter((v): v is number => typeof v === "number");

  if (anchors.length === 0) return { min: 0, max: 1 };

  const rawMin = Math.min(...anchors);
  const rawMax = Math.max(...anchors);
  const span = rawMax - rawMin || rawMax * 0.5 || 1;
  const pad = Math.max(span * 0.15, rawMax * 0.06, 1);

  return {
    min: Math.max(0, rawMin - pad),
    max: rawMax + pad,
  };
}
