import {
  DEFAULT_HABITS,
  type HabitState,
  type HabitStatus,
} from "./types";

const KEY = "longevify.habits";

export function loadState(): HabitState {
  if (typeof window === "undefined") {
    return { habits: DEFAULT_HABITS, log: {} };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { habits: DEFAULT_HABITS, log: {} };
    const parsed = JSON.parse(raw) as HabitState;
    return {
      habits: Array.isArray(parsed.habits) && parsed.habits.length > 0
        ? parsed.habits
        : DEFAULT_HABITS,
      log: parsed.log && typeof parsed.log === "object" ? parsed.log : {},
    };
  } catch {
    return { habits: DEFAULT_HABITS, log: {} };
  }
}

export function saveState(state: HabitState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function setStatus(
  state: HabitState,
  habitId: string,
  date: string,
  status: HabitStatus | null,
): HabitState {
  const dayMap = { ...(state.log[habitId] ?? {}) };
  if (status === null) {
    delete dayMap[date];
  } else {
    dayMap[date] = status;
  }
  return {
    ...state,
    log: { ...state.log, [habitId]: dayMap },
  };
}

export function streak(state: HabitState, habitId: string): number {
  // Conta dias consecutivos terminando hoje em que status === "done".
  // "skip" não quebra streak, "missed" e ausência quebram.
  const today = new Date();
  let count = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${day}`;
    const s = state.log[habitId]?.[key];
    if (s === "done") {
      count += 1;
    } else if (s === "skip") {
      // não soma, não quebra
      continue;
    } else {
      break;
    }
  }
  return count;
}

export function adherence(
  state: HabitState,
  habitId: string,
  days: number,
): number {
  const today = new Date();
  let done = 0;
  let counted = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${day}`;
    const s = state.log[habitId]?.[key];
    if (s === "skip") continue;
    counted += 1;
    if (s === "done") done += 1;
  }
  if (counted === 0) return 0;
  return Math.round((done / counted) * 100);
}
