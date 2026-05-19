/**
 * Storage abstraction pro tracking de ciclo menstrual.
 *
 * Lucas (2026-05-19): "quando eu termino de preencher a aba de ciclo,
 * aparece um erro chamado no-session-cookie".
 *
 * Diagnóstico: as API routes `/api/menstrual/*` exigem JWT real do
 * Supabase (via `getUserIdFromCookie`). User demo (sem login real)
 * tem só o cookie demo, então o JWT extract falha e API retorna 401.
 *
 * Como Lucas pediu a feature acessível pra demo masculina ("Na conta
 * demo, pode deixar isso disponível, mesmo que seja um homem a
 * principio"), esse módulo abstrai o storage:
 *   - User REAL (Supabase JWT) → API routes (persistem no DB)
 *   - User DEMO → localStorage (persistem no browser do Lucas)
 *
 * UX igual nos dois casos: wizard/dashboard/sheet chamam essas funções
 * sem saber qual backend está sendo usado.
 */

import type {
  MenstrualEntry,
  MenstrualProfile,
} from "./types";

// ─── localStorage keys ─────────────────────────────────────────────────────

const PROFILE_KEY = "longevify_menstrual_profile_demo";
const ENTRIES_KEY = "longevify_menstrual_entries_demo";

// ─── Demo storage (localStorage) ───────────────────────────────────────────

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // QuotaExceeded ou disabled — silent fail, demo só perde dados nesse caso
  }
}

// ─── Profile API ───────────────────────────────────────────────────────────

export interface ProfileSavePayload {
  tracking_enabled?: boolean;
  last_period_start?: string | null;
  avg_cycle_days?: number;
  avg_period_days?: number;
  cycle_regularity?: string;
  contraceptive_kind?: string | null;
  reproductive_status?: string;
  notes?: string | null;
  mark_onboarded?: boolean;
}

export async function loadProfile(
  isDemo: boolean,
): Promise<MenstrualProfile | null> {
  if (isDemo) {
    return readLocal<MenstrualProfile | null>(PROFILE_KEY, null);
  }
  try {
    const res = await fetch("/api/menstrual/profile");
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.ok || !data.profile) return null;
    return rowToProfile(data.profile);
  } catch {
    return null;
  }
}

export async function saveProfile(
  payload: ProfileSavePayload,
  isDemo: boolean,
): Promise<{ ok: boolean; profile?: MenstrualProfile; error?: string }> {
  if (isDemo) {
    const current = readLocal<MenstrualProfile | null>(PROFILE_KEY, null);
    const merged: MenstrualProfile = {
      patientId: "demo",
      trackingEnabled:
        payload.tracking_enabled ?? current?.trackingEnabled ?? true,
      lastPeriodStart:
        payload.last_period_start !== undefined
          ? payload.last_period_start
          : (current?.lastPeriodStart ?? null),
      avgCycleDays: payload.avg_cycle_days ?? current?.avgCycleDays ?? 28,
      avgPeriodDays: payload.avg_period_days ?? current?.avgPeriodDays ?? 5,
      cycleRegularity: (payload.cycle_regularity ??
        current?.cycleRegularity ??
        "regular") as MenstrualProfile["cycleRegularity"],
      contraceptiveKind:
        payload.contraceptive_kind !== undefined
          ? (payload.contraceptive_kind as MenstrualProfile["contraceptiveKind"])
          : (current?.contraceptiveKind ?? null),
      reproductiveStatus: (payload.reproductive_status ??
        current?.reproductiveStatus ??
        "regular") as MenstrualProfile["reproductiveStatus"],
      onboardedAt: payload.mark_onboarded
        ? new Date().toISOString()
        : (current?.onboardedAt ?? null),
      notes:
        payload.notes !== undefined ? payload.notes : (current?.notes ?? null),
    };
    writeLocal(PROFILE_KEY, merged);
    return { ok: true, profile: merged };
  }

  try {
    const res = await fetch("/api/menstrual/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      return { ok: false, error: data?.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, profile: rowToProfile(data.profile) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "fetch-failed",
    };
  }
}

// ─── Entries API ───────────────────────────────────────────────────────────

export interface EntrySavePayload {
  entry_date: string;
  flow?: MenstrualEntry["flow"];
  symptoms?: MenstrualEntry["symptoms"];
  mood?: number | null;
  energy?: number | null;
  libido?: number | null;
  sleep_quality?: number | null;
  notes?: string | null;
}

export async function loadEntries(
  isDemo: boolean,
): Promise<MenstrualEntry[]> {
  if (isDemo) {
    return readLocal<MenstrualEntry[]>(ENTRIES_KEY, []);
  }
  try {
    const res = await fetch("/api/menstrual/entries");
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.entries)) return [];
    return data.entries.map(rowToEntry);
  } catch {
    return [];
  }
}

export async function saveEntry(
  payload: EntrySavePayload,
  isDemo: boolean,
): Promise<{ ok: boolean; entry?: MenstrualEntry; error?: string }> {
  if (isDemo) {
    const entries = readLocal<MenstrualEntry[]>(ENTRIES_KEY, []);
    const newEntry: MenstrualEntry = {
      id: `demo-${payload.entry_date}`,
      entryDate: payload.entry_date,
      flow: payload.flow ?? null,
      symptoms: payload.symptoms ?? [],
      mood: payload.mood ?? null,
      energy: payload.energy ?? null,
      libido: payload.libido ?? null,
      sleepQuality: payload.sleep_quality ?? null,
      notes: payload.notes ?? null,
    };
    const next = [
      newEntry,
      ...entries.filter((e) => e.entryDate !== payload.entry_date),
    ].sort((a, b) => b.entryDate.localeCompare(a.entryDate));
    writeLocal(ENTRIES_KEY, next);
    return { ok: true, entry: newEntry };
  }

  try {
    const res = await fetch("/api/menstrual/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      return { ok: false, error: data?.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, entry: rowToEntry(data.entry) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "fetch-failed",
    };
  }
}

// ─── Row mappers (API → domain) ────────────────────────────────────────────

function rowToProfile(row: Record<string, unknown>): MenstrualProfile {
  return {
    patientId: String(row.patient_id ?? ""),
    trackingEnabled: Boolean(row.tracking_enabled),
    lastPeriodStart: (row.last_period_start as string | null) ?? null,
    avgCycleDays: Number(row.avg_cycle_days ?? 28),
    avgPeriodDays: Number(row.avg_period_days ?? 5),
    cycleRegularity: (row.cycle_regularity as MenstrualProfile["cycleRegularity"]) ?? "regular",
    contraceptiveKind:
      (row.contraceptive_kind as MenstrualProfile["contraceptiveKind"]) ?? null,
    reproductiveStatus:
      (row.reproductive_status as MenstrualProfile["reproductiveStatus"]) ??
      "regular",
    onboardedAt: (row.onboarded_at as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
  };
}

function rowToEntry(row: Record<string, unknown>): MenstrualEntry {
  return {
    id: String(row.id ?? ""),
    entryDate: String(row.entry_date ?? ""),
    flow: (row.flow as MenstrualEntry["flow"]) ?? null,
    symptoms: Array.isArray(row.symptoms)
      ? (row.symptoms as MenstrualEntry["symptoms"])
      : [],
    mood: (row.mood as number | null) ?? null,
    energy: (row.energy as number | null) ?? null,
    libido: (row.libido as number | null) ?? null,
    sleepQuality: (row.sleep_quality as number | null) ?? null,
    notes: (row.notes as string | null) ?? null,
  };
}
