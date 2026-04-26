export type CollectionLocation = "home" | "lab";

export interface AvailabilitySlot {
  /** Date no horário local */
  slot: Date;
  available: boolean;
}

const HOURS_OF_DAY = [8, 10, 14, 16];

/**
 * Hash determinístico simples para alternar disponibilidade de slots.
 * Permite mock estável (mesmo input → mesmo output) sem precisar de seed.
 */
function pseudoBusy(date: Date, hour: number, location: CollectionLocation): boolean {
  const key =
    date.getUTCFullYear() * 10000 +
    (date.getUTCMonth() + 1) * 100 +
    date.getUTCDate() +
    hour * 13 +
    (location === "home" ? 7 : 3);
  // ~30% dos slots ocupados — sensação de calendário "real"
  return key % 10 < 3;
}

/**
 * Retorna 14 dias × 4 horários a partir de `weekStart`. Slots ocupados
 * vêm com `available: false` (mock determinístico).
 */
export function getAvailableSlots(
  weekStart: Date,
  location: CollectionLocation,
): AvailabilitySlot[] {
  const out: AvailabilitySlot[] = [];
  const base = new Date(weekStart);
  base.setHours(0, 0, 0, 0);
  for (let day = 0; day < 14; day++) {
    for (const hour of HOURS_OF_DAY) {
      const slot = new Date(base);
      slot.setDate(base.getDate() + day);
      slot.setHours(hour, 0, 0, 0);
      // Domingo (0) marca todos os slots como indisponíveis no laboratório.
      const isLabClosed = location === "lab" && slot.getDay() === 0;
      const past = slot.getTime() < Date.now();
      const busy = pseudoBusy(slot, hour, location);
      out.push({ slot, available: !past && !isLabClosed && !busy });
    }
  }
  return out;
}

export interface BookingResult {
  id: string;
  confirmedAt: string;
}

/** Stub de booking — resolve em ~800ms simulando ida ao backend. */
export function bookSlot(
  slot: Date,
  location: CollectionLocation,
  address?: string,
): Promise<BookingResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const id = `bk_${slot.getTime().toString(36)}_${location}`;
      // address é opcional, mas ajuda no log para conferir payload.
      if (address && process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.info("[scheduling] booked", { id, slot, location, address });
      }
      resolve({ id, confirmedAt: new Date().toISOString() });
    }, 800);
  });
}

export const COLLECTION_HOURS = HOURS_OF_DAY;
