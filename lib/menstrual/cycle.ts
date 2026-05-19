/**
 * Cálculos de fase de ciclo menstrual.
 *
 * Funções puras, isomórficas (server + client), sem side-effects.
 * Modelo educacional baseado em ACOG/NIH — não é diagnóstico médico.
 *
 * Algoritmo simplificado de 4 fases:
 *
 *   Dia 1 .. avgPeriodDays           → menstrual
 *   avgPeriodDays+1 .. ovulationStart → follicular
 *   ovulationStart .. ovulationEnd    → ovulation (~3 dias centrais)
 *   ovulationEnd+1 .. cycleLength     → luteal
 *
 * onde:
 *   ovulationDay   = cycleLength - 14    (fase lútea ≈ 14 dias, NIH)
 *   ovulationStart = ovulationDay - 1
 *   ovulationEnd   = ovulationDay + 1
 */

import type { CyclePhase, CyclePhaseInfo, MenstrualProfile } from "./types";

// ─── Date helpers (UTC-safe, evita drift de timezone) ──────────────────────

/** Dias entre duas datas (positivo se b > a), ignorando horas. */
export function diffDays(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

/** Adiciona N dias a uma data (retorna nova instância). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Início do dia (00:00 local) sem mutar o original. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Formata YYYY-MM-DD em fuso local. */
export function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD em fuso local (não UTC). Evita o bug clássico de
 * `new Date('2026-05-18')` virar dia 17 em fusos negativos. */
export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

// ─── Phase calculation ─────────────────────────────────────────────────────

/**
 * Calcula info de ciclo pra uma data específica.
 *
 * Pressupõe que o último período registrado é o ÚLTIMO início real (não
 * uma previsão). Se a data atual já está depois do que o ciclo médio
 * sugere, projeta o próximo início.
 */
export function getCyclePhaseInfo(
  profile: Pick<MenstrualProfile, "lastPeriodStart" | "avgCycleDays" | "avgPeriodDays">,
  today: Date = new Date(),
): CyclePhaseInfo {
  if (!profile.lastPeriodStart) {
    return {
      phase: "unknown",
      cycleDay: 0,
      cycleLength: profile.avgCycleDays,
      daysUntilNextPeriod: 0,
      nextPeriodDate: today,
    };
  }

  const lastStart = parseYmd(profile.lastPeriodStart);
  const todayStart = startOfDay(today);
  let cycleStart = lastStart;
  let cycleDay = diffDays(lastStart, todayStart) + 1;

  // Se já passou do ciclo médio, projeta os ciclos seguintes até pegar
  // o que contém o "today" (acomoda user que esqueceu de atualizar DUM).
  while (cycleDay > profile.avgCycleDays) {
    cycleStart = addDays(cycleStart, profile.avgCycleDays);
    cycleDay = diffDays(cycleStart, todayStart) + 1;
  }

  // Lucas (2026-05-19): "os dados dos dias anteriores ta tudo marcado
  // como menstrual". Pra datas ANTES de lastPeriodStart, diffDays
  // retorna 0 ou negativo → satisfaz `cycleDay <= periodLength` →
  // virava menstrual erradamente. Recua ciclos completos até a data
  // cair em um ciclo passado real (assumindo avgCycleDays constante).
  while (cycleDay <= 0) {
    cycleStart = addDays(cycleStart, -profile.avgCycleDays);
    cycleDay = diffDays(cycleStart, todayStart) + 1;
  }

  const cycleLength = profile.avgCycleDays;
  const periodLength = profile.avgPeriodDays;
  // Fase lútea é a mais previsível (~14 dias antes do próximo período).
  // Ovulação fica 13-15 dias antes do próximo ciclo.
  const ovulationDay = cycleLength - 14;
  const ovulationStart = Math.max(periodLength + 1, ovulationDay - 1);
  const ovulationEnd = ovulationDay + 1;

  let phase: CyclePhase;
  if (cycleDay <= periodLength) phase = "menstrual";
  else if (cycleDay < ovulationStart) phase = "follicular";
  else if (cycleDay <= ovulationEnd) phase = "ovulation";
  else phase = "luteal";

  const nextPeriodDate = addDays(cycleStart, cycleLength);
  const daysUntilNextPeriod = Math.max(0, diffDays(todayStart, nextPeriodDate));

  return {
    phase,
    cycleDay,
    cycleLength,
    daysUntilNextPeriod,
    nextPeriodDate,
  };
}

/**
 * Predição dos próximos N inícios de período (datas).
 * Útil pra desenhar calendário com marcadores futuros.
 */
export function predictUpcomingPeriods(
  profile: Pick<MenstrualProfile, "lastPeriodStart" | "avgCycleDays">,
  count = 6,
  from: Date = new Date(),
): Date[] {
  if (!profile.lastPeriodStart) return [];
  let cursor = parseYmd(profile.lastPeriodStart);
  const fromStart = startOfDay(from);
  // Avança até o primeiro ciclo previsto >= today
  while (cursor < fromStart) {
    cursor = addDays(cursor, profile.avgCycleDays);
  }
  const out: Date[] = [];
  for (let i = 0; i < count; i++) {
    out.push(cursor);
    cursor = addDays(cursor, profile.avgCycleDays);
  }
  return out;
}

/**
 * Pra uma data específica, retorna a fase prevista (sem precisar fazer
 * fetch). Usado no calendário pra colorir cada célula.
 */
export function predictPhaseForDate(
  profile: Pick<MenstrualProfile, "lastPeriodStart" | "avgCycleDays" | "avgPeriodDays">,
  date: Date,
): CyclePhase {
  if (!profile.lastPeriodStart) return "unknown";
  const info = getCyclePhaseInfo(profile, date);
  return info.phase;
}

// ─── Descrições humanizadas (PT-BR) ───────────────────────────────────────

/**
 * Texto curto pra mostrar no header do dashboard. Tom: clínico-próximo,
 * sem rebuscamento, sem clichê "para mulheres".
 */
export function describePhase(phase: CyclePhase): string {
  switch (phase) {
    case "menstrual":
      return "Período menstrual em curso. Energia e disposição tendem a estar mais baixas — respeite o ritmo do corpo.";
    case "follicular":
      return "Fase folicular. Estrogênio em alta — energia, foco e disposição costumam estar no melhor momento.";
    case "ovulation":
      return "Janela ovulatória. Pico fértil. Pode haver leve aumento de libido e sensação de bem-estar.";
    case "luteal":
      return "Fase lútea. Progesterona em alta. Próximo ao período: possível TPM — atenção a humor, sono e cravings.";
    case "unknown":
      return "Sem dados suficientes pra calcular a fase. Registre a data da última menstruação no onboarding.";
  }
}

/**
 * Resumo curto usado no Concierge (system prompt enhancement). Adapta
 * tom pra fonte de IA — direto, factual, útil pra raciocínio.
 */
export function describePhaseForLLM(info: CyclePhaseInfo): string {
  if (info.phase === "unknown") return "";
  return [
    `Fase do ciclo menstrual: ${info.phase} (dia ${info.cycleDay} de ${info.cycleLength}).`,
    `Próxima menstruação prevista em ~${info.daysUntilNextPeriod} dias.`,
    "Considere esse contexto ao interpretar humor, energia, sono e libido recentes — todos oscilam pelo ciclo.",
  ].join(" ");
}
