import type { CollectionBooking } from "./bookings";

/**
 * Plano padrão Longevify: 2 coletas por ciclo anual — uma inicial + uma
 * de followup 6 meses depois (pra acompanhar evolução do protocolo).
 */
export const COLETAS_PER_YEAR = 2;
export const FOLLOWUP_INTERVAL_MONTHS = 6;

export interface ColetaJourney {
  /** Todas as coletas, ordenadas cronologicamente (mais antiga → mais recente). */
  bookings: CollectionBooking[];
  /** Total de coletas (todas as status). */
  totalCount: number;
  /** Coletas agendadas (status='scheduled'). */
  scheduledCount: number;
  /** Coletas concluídas (status='completed'). */
  completedCount: number;
  /** Coletas canceladas/no-show (não contam pro plano). */
  voidCount: number;

  /** True quando user nunca agendou nada (todas listas vazias). */
  isEmpty: boolean;

  /** Próxima coleta agendada. null se não tem. */
  nextBooking: CollectionBooking | null;
  /** Última coleta concluída. null se nenhuma. */
  lastCompleted: CollectionBooking | null;
  /** Coleta inicial (a primeira agendada/concluída cronologicamente, válida). */
  initialBooking: CollectionBooking | null;

  /** Quantas coletas o plano prevê pro ciclo (default 2). */
  expectedTotal: number;
  /** Quantas coletas válidas (scheduled + completed) faltam pro plano. */
  remaining: number;

  /** Data sugerida pra próxima coleta (6 meses depois da última válida).
   *  null quando não há base ou plano já está cheio. */
  suggestedNextDate: Date | null;
}

function isVoid(b: CollectionBooking): boolean {
  return b.status === "cancelled" || b.status === "no_show";
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Deriva o estado da jornada de coletas do user.
 *
 * Aceita os buckets `upcoming` + `past` retornados de `getUserBookings()`.
 */
export function buildColetaJourney(opts: {
  upcoming: CollectionBooking[];
  past: CollectionBooking[];
  expectedTotal?: number;
}): ColetaJourney {
  const expectedTotal = opts.expectedTotal ?? COLETAS_PER_YEAR;

  const all = [...opts.past, ...opts.upcoming].sort(
    (a, b) =>
      new Date(a.scheduledAtISO).getTime() -
      new Date(b.scheduledAtISO).getTime(),
  );

  const valid = all.filter((b) => !isVoid(b));
  const scheduledCount = all.filter((b) => b.status === "scheduled").length;
  const completedCount = all.filter((b) => b.status === "completed").length;
  const voidCount = all.filter(isVoid).length;

  const nextBooking = opts.upcoming[0] ?? null; // já vem ordenada asc do getUserBookings

  // last completed
  const completedDesc = all
    .filter((b) => b.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.scheduledAtISO).getTime() -
        new Date(a.scheduledAtISO).getTime(),
    );
  const lastCompleted = completedDesc[0] ?? null;

  // initial booking = primeira válida
  const initialBooking = valid[0] ?? null;

  const remaining = Math.max(0, expectedTotal - valid.length);

  // sugestão: 6 meses depois da última coleta válida (scheduled ou completed),
  // se ainda há slot disponível no plano e nenhuma upcoming já cobre.
  let suggestedNextDate: Date | null = null;
  if (remaining > 0 && valid.length > 0) {
    const lastValid = valid[valid.length - 1];
    const baseDate = new Date(lastValid.scheduledAtISO);
    const candidate = addMonths(baseDate, FOLLOWUP_INTERVAL_MONTHS);
    // Só sugere se a próxima upcoming não estiver na janela de 30 dias do candidate
    const alreadyCoveredBy = opts.upcoming.find((b) => {
      const diff = Math.abs(
        new Date(b.scheduledAtISO).getTime() - candidate.getTime(),
      );
      return diff < 30 * 24 * 60 * 60 * 1000;
    });
    if (!alreadyCoveredBy) {
      suggestedNextDate = candidate;
    }
  }

  return {
    bookings: all,
    totalCount: all.length,
    scheduledCount,
    completedCount,
    voidCount,
    isEmpty: all.length === 0,
    nextBooking,
    lastCompleted,
    initialBooking,
    expectedTotal,
    remaining,
    suggestedNextDate,
  };
}
