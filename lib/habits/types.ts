// Tracker de hábitos — persistência localStorage `longevify.habits`.

export type HabitStatus = "done" | "skip" | "missed";

export interface HabitDef {
  id: string;
  label: string;
  custom?: boolean;
}

export const DEFAULT_HABITS: HabitDef[] = [
  { id: "sol-matinal", label: "Exposição solar matinal" },
  { id: "zona-2", label: "Zona 2 (30 min)" },
  { id: "leitura", label: "Leitura (30 min)" },
  { id: "sem-alcool", label: "Sem álcool" },
  { id: "jejum-14h", label: "Jejum 14h+" },
  { id: "sem-tela", label: "Sem tela 1h antes do sono" },
  { id: "meditacao", label: "Meditação" },
];

export interface HabitState {
  habits: HabitDef[];
  // log[habitId][date] = status
  log: Record<string, Record<string, HabitStatus>>;
}
