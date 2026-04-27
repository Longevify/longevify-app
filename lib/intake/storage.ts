"use client";

import {
  EMPTY_INTAKE_DATA,
  type IntakeRecord,
  type IntakeVariant,
  type IntakeData,
} from "./schema";

const STORAGE_KEY = "longevify.intake.v2";
const COMPLETED_FLAG_KEY = "longevify.intake.completed";

export function loadIntake(): IntakeRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IntakeRecord;
    return mergeRecord(parsed);
  } catch {
    return null;
  }
}

export function saveIntake(record: IntakeRecord): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...record, updatedAt: new Date().toISOString() }),
    );
    if (record.completedAt) {
      window.localStorage.setItem(COMPLETED_FLAG_KEY, "1");
    }
  } catch {
    /* quota cheia — não trava o fluxo */
  }
}

export function clearIntake(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(COMPLETED_FLAG_KEY);
  } catch {
    /* ignore */
  }
}

export function isIntakeCompleted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(COMPLETED_FLAG_KEY) === "1";
}

export function createEmptyRecord(variant: IntakeVariant): IntakeRecord {
  const now = new Date().toISOString();
  return {
    variant,
    step: variant === "quick" ? "quick-1" : "comp-1",
    data: structuredCloneCompat(EMPTY_INTAKE_DATA),
    startedAt: now,
    updatedAt: now,
  };
}

// Faz merge tolerante caso o shape em storage esteja desatualizado.
function mergeRecord(parsed: Partial<IntakeRecord>): IntakeRecord {
  const data: IntakeData = {
    identity: { ...EMPTY_INTAKE_DATA.identity, ...(parsed.data?.identity ?? {}) },
    medical: {
      ...EMPTY_INTAKE_DATA.medical,
      ...(parsed.data?.medical ?? {}),
      diagnosedConditions:
        parsed.data?.medical?.diagnosedConditions ?? [],
    },
    family: {
      earlyEvents: parsed.data?.family?.earlyEvents ?? [],
    },
    lifestyle: {
      ...EMPTY_INTAKE_DATA.lifestyle,
      ...(parsed.data?.lifestyle ?? {}),
      exerciseTypes: parsed.data?.lifestyle?.exerciseTypes ?? [],
    },
    mental: { ...EMPTY_INTAKE_DATA.mental, ...(parsed.data?.mental ?? {}) },
    female: { ...EMPTY_INTAKE_DATA.female, ...(parsed.data?.female ?? {}) },
    male: { ...EMPTY_INTAKE_DATA.male, ...(parsed.data?.male ?? {}) },
    goals: {
      ...EMPTY_INTAKE_DATA.goals,
      ...(parsed.data?.goals ?? {}),
      importantValues: parsed.data?.goals?.importantValues ?? [],
    },
    scheduling: {
      ...EMPTY_INTAKE_DATA.scheduling,
      ...(parsed.data?.scheduling ?? {}),
    },
  };

  return {
    variant: parsed.variant ?? "comprehensive",
    step: parsed.step ?? (parsed.variant === "quick" ? "quick-1" : "comp-1"),
    data,
    startedAt: parsed.startedAt ?? new Date().toISOString(),
    updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    completedAt: parsed.completedAt,
  };
}

function structuredCloneCompat<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}
