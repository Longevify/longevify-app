/**
 * Score 0-100 derivado de cada métrica de wearable.
 *
 * Lucas (2026-05-21): "tipo 'seu sono está com uma pontuação de 82'.
 * Esses scores e dados todos tem que ser advindos do wearable integrado."
 *
 * Cada métrica vira um número 0-100 baseado em curva clínica:
 * - Sleep: 7.5-9h = 100; degradação fora dessa janela (curta E longa)
 * - Exercise (min/dia): 30+ = 100; sub-30 cai linear, >60 já em diminishing returns
 * - HRV: relativo ao baseline do user (>120% baseline = 100)
 * - Resting HR: <55 = 100 (cardio aeróbico forte), >85 = 30
 * - VO2max: ≥45 (excelente) = 100; <30 = 30
 *
 * Sem ML — heurística clínica derivada das faixas longevity-style. Pra
 * v2: ajustar por idade/sexo (e.g. VO2max alvo varia muito por idade).
 */

export type MetricKind = "sleep" | "exercise" | "hrv" | "restingHR" | "vo2max" | "steps";

/**
 * Score linear interpolado entre pontos âncora (x, score).
 * Pontos devem estar em ordem crescente de x.
 */
function piecewiseScore(value: number, anchors: Array<[number, number]>): number {
  if (anchors.length === 0) return 0;
  // Clamp abaixo do primeiro
  if (value <= anchors[0][0]) return anchors[0][1];
  // Clamp acima do último
  if (value >= anchors[anchors.length - 1][0]) return anchors[anchors.length - 1][1];
  // Interpola linear
  for (let i = 0; i < anchors.length - 1; i++) {
    const [x1, s1] = anchors[i];
    const [x2, s2] = anchors[i + 1];
    if (value >= x1 && value <= x2) {
      const t = (value - x1) / (x2 - x1);
      return Math.round(s1 + t * (s2 - s1));
    }
  }
  return 0;
}

/** Sono em minutos → score 0-100. Janela ótima: 450-540 min (7h30-9h). */
export function sleepScore(sleepMinutes: number): number {
  if (!sleepMinutes || sleepMinutes <= 0) return 0;
  return piecewiseScore(sleepMinutes, [
    [0, 0],
    [180, 15], // 3h = catastrófico
    [300, 40], // 5h = ruim
    [360, 60], // 6h = aceitável
    [420, 80], // 7h = bom
    [450, 95], // 7h30 = ótimo
    [510, 100], // 8h30 = pico
    [540, 95], // 9h = ainda ótimo
    [600, 75], // 10h = excesso (qualidade cai)
    [720, 50], // 12h = preocupante
  ]);
}

/** Exercício em minutos/dia → score 0-100. */
export function exerciseScore(exerciseMinutes: number): number {
  if (!exerciseMinutes || exerciseMinutes <= 0) return 0;
  return piecewiseScore(exerciseMinutes, [
    [0, 0],
    [10, 30],
    [20, 55],
    [30, 85], // meta WHO/AHA
    [45, 95],
    [60, 100], // ótimo
    [120, 100], // não bonifica > 2h
  ]);
}

/** HRV em ms → score 0-100. Heurística pra adulto saudável. */
export function hrvScore(hrvMs: number): number {
  if (!hrvMs || hrvMs <= 0) return 0;
  return piecewiseScore(hrvMs, [
    [0, 0],
    [20, 30],
    [35, 55],
    [50, 75],
    [65, 90],
    [80, 100],
  ]);
}

/** Resting HR (bpm) → score. Mais baixo = melhor (até floor fisiológico). */
export function restingHrScore(rhrBpm: number): number {
  if (!rhrBpm || rhrBpm <= 0) return 0;
  return piecewiseScore(rhrBpm, [
    [40, 100], // atleta
    [50, 95],
    [55, 90],
    [60, 80],
    [65, 70],
    [70, 60],
    [80, 40],
    [90, 25],
    [100, 10],
  ]);
}

/** Passos por dia → score 0-100. */
export function stepsScore(steps: number): number {
  if (!steps || steps <= 0) return 0;
  return piecewiseScore(steps, [
    [0, 0],
    [2000, 25],
    [4000, 45],
    [6000, 65],
    [8000, 85], // meta comum
    [10000, 95],
    [12000, 100],
    [20000, 100],
  ]);
}

/** VO2max → score 0-100. Adulto generic (não por idade ainda). */
export function vo2maxScore(vo2max: number): number {
  if (!vo2max || vo2max <= 0) return 0;
  return piecewiseScore(vo2max, [
    [20, 20],
    [30, 50],
    [35, 65],
    [40, 80],
    [45, 95], // top decil longevity
    [55, 100],
  ]);
}

// ─── Labels e contextos pros popups ────────────────────────────────────────

/** Label legível pro score. "82" → "Bom" etc. */
export function scoreLabel(score: number): string {
  if (score >= 90) return "Excelente";
  if (score >= 75) return "Bom";
  if (score >= 60) return "OK";
  if (score >= 40) return "Atenção";
  return "Em risco";
}

/** Cor (tailwind class) pro score. */
export function scoreColor(score: number): string {
  if (score >= 90) return "text-emerald-600";
  if (score >= 75) return "text-brand-700";
  if (score >= 60) return "text-amber-600";
  if (score >= 40) return "text-orange-600";
  return "text-rose-600";
}

/** Tailwind bg class pro score (background da pill). */
export function scoreBg(score: number): string {
  if (score >= 90) return "bg-emerald-100 text-emerald-800";
  if (score >= 75) return "bg-brand-100 text-brand-800";
  if (score >= 60) return "bg-amber-100 text-amber-800";
  if (score >= 40) return "bg-orange-100 text-orange-800";
  return "bg-rose-100 text-rose-800";
}
