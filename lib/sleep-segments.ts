import type { SleepSegment, SleepStage, SleepStages } from "./wearables-mock";

/**
 * Gera uma timeline plausível de fases do sono distribuídas ao longo
 * da noite, a partir das totais de cada fase.
 *
 * Padrão típico noite humana:
 *   - Início: ~10-15min "awake" (entrando na cama)
 *   - 1º ciclo (~90min): core → deep (mais deep no início da noite)
 *   - 2º ciclo: core → deep → rem (REM começa a aparecer)
 *   - 3º-4º ciclos: core → rem (cada vez menos deep, mais REM)
 *   - Acordadas curtas espalhadas
 *
 * Output: lista de segmentos consecutivos cobrindo bedtime → wake.
 * bedtime padrão: 23:00 (=> -60 min antes da meia-noite).
 *
 * Determinístico via `seed` pra evitar flicker entre re-renders.
 */
export function generateSleepSegments(
  stages: Pick<SleepStages, "deepMinutes" | "coreMinutes" | "remMinutes" | "awakeMinutes">,
  options: {
    /** Hora deitou em minutos desde meia-noite. Default -60 (23h) */
    bedtimeMin?: number;
    /** Seed pra deterministic (default 42) */
    seed?: number;
  } = {},
): SleepSegment[] {
  const { deepMinutes, coreMinutes, remMinutes, awakeMinutes } = stages;
  const totalMin = deepMinutes + coreMinutes + remMinutes + awakeMinutes;
  if (totalMin <= 0) return [];

  const bedtime = options.bedtimeMin ?? -60;
  let cursor = bedtime;

  // RNG seeded
  let s = options.seed ?? 42;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const segments: SleepSegment[] = [];
  const push = (stage: SleepStage, mins: number) => {
    if (mins <= 0) return;
    segments.push({
      stage,
      startMin: cursor,
      endMin: cursor + mins,
    });
    cursor += mins;
  };

  // Pools restantes — vamos consumindo até zerar
  const pool: Record<SleepStage, number> = {
    awake: awakeMinutes,
    deep: deepMinutes,
    core: coreMinutes,
    rem: remMinutes,
  };

  const consume = (stage: SleepStage, mins: number): number => {
    const take = Math.min(pool[stage], mins);
    pool[stage] -= take;
    return take;
  };

  // 1) Awake inicial (10-20% do total awake, ~5-15min)
  const initialAwake = Math.min(pool.awake, Math.round(8 + rand() * 8));
  push("awake", consume("awake", initialAwake));

  // 2) Ciclos de sono — alternam core/deep/rem com awake esporádico
  // 4-6 ciclos típicos por noite. Cada um ~70-110min.
  let cycleIdx = 0;
  const maxCycles = 6;
  while (
    cycleIdx < maxCycles &&
    pool.core + pool.deep + pool.rem > 0
  ) {
    cycleIdx++;
    // Core sempre começa cada ciclo
    const coreInCycle = Math.round((pool.core / (maxCycles - cycleIdx + 1)) * (0.7 + rand() * 0.6));
    push("core", consume("core", Math.max(15, coreInCycle)));

    // Deep — mais nos primeiros 2 ciclos, decai depois
    if (cycleIdx <= 3 && pool.deep > 0) {
      const deepRatio = cycleIdx === 1 ? 0.5 : cycleIdx === 2 ? 0.3 : 0.15;
      const deepInCycle = Math.round(pool.deep * deepRatio * (0.8 + rand() * 0.4));
      push("deep", consume("deep", Math.max(10, deepInCycle)));
    }

    // REM — aparece a partir do 1º ciclo, mais nos últimos
    if (pool.rem > 0) {
      const remRatio = cycleIdx === 1 ? 0.1 : cycleIdx === 2 ? 0.2 : 0.3;
      const remInCycle = Math.round(pool.rem * remRatio * (0.7 + rand() * 0.6));
      if (remInCycle >= 5) push("rem", consume("rem", remInCycle));
    }

    // Awake curta no fim de cada ciclo (20% chance, exceto último ciclo)
    if (cycleIdx < 5 && pool.awake > 0 && rand() < 0.45) {
      const awakeBlip = Math.min(pool.awake, Math.round(2 + rand() * 5));
      push("awake", consume("awake", awakeBlip));
    }
  }

  // 3) Drena resíduos remanescentes em ordem (core > rem > deep > awake)
  push("core", consume("core", pool.core));
  push("rem", consume("rem", pool.rem));
  push("deep", consume("deep", pool.deep));
  push("awake", consume("awake", pool.awake));

  return segments.filter((s) => s.endMin > s.startMin);
}

/**
 * Pega o range em minutos (start, end) abrangendo TODOS os segments.
 * Útil pra setar viewBox do gráfico Apple-style.
 */
export function getSegmentsRange(segments: SleepSegment[]): {
  startMin: number;
  endMin: number;
} {
  if (segments.length === 0) return { startMin: 0, endMin: 480 };
  return {
    startMin: Math.min(...segments.map((s) => s.startMin)),
    endMin: Math.max(...segments.map((s) => s.endMin)),
  };
}

/**
 * Formata `minutesFromMidnight` em label de hora 24h (HH).
 * Negativo → hora do dia anterior.
 */
export function formatHourLabel(min: number): string {
  const totalHours = min / 60;
  let hh = Math.floor(totalHours);
  if (hh < 0) hh = 24 + hh;
  hh = ((hh % 24) + 24) % 24;
  return `${hh}h`;
}
