import type { SymptomEntry } from "./types";

const KEY = "longevify.symptoms";

export function loadEntries(): SymptomEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SymptomEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries: SymptomEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(entries));
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function upsertEntry(date: string, entry: SymptomEntry): SymptomEntry[] {
  const all = loadEntries();
  const next = [entry, ...all.filter((e) => e.date !== date)];
  saveEntries(next);
  return next;
}
