"use client";

// Persistência cross-providers (token, last_sync, raw_data).
// Em modo demo: localStorage namespaced. Quando Supabase estiver configurado,
// poderemos plugar aqui via lib/data/repositories sem mudar o consumidor.

import type {
  DailyHealthMetrics,
  SyncRun,
  WearableConnection,
  WearableProvider,
} from "./types";

const NS = "longevify.wearables";

function key(provider: WearableProvider, slot: string): string {
  return `${NS}.${provider}.${slot}`;
}

function safeGet(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveConnection(
  provider: WearableProvider,
  conn: Omit<WearableConnection, "provider" | "connectedAt"> & {
    connectedAt?: number;
  },
): void {
  const ls = safeGet();
  if (!ls) return;
  const payload: WearableConnection = {
    provider,
    accessToken: conn.accessToken,
    refreshToken: conn.refreshToken,
    expiresAt: conn.expiresAt,
    connectedAt: conn.connectedAt ?? Date.now(),
  };
  ls.setItem(key(provider, "connection"), JSON.stringify(payload));
}

export function getConnection(
  provider: WearableProvider,
): WearableConnection | null {
  const ls = safeGet();
  if (!ls) return null;
  const raw = ls.getItem(key(provider, "connection"));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WearableConnection;
  } catch {
    return null;
  }
}

export function removeConnection(provider: WearableProvider): void {
  const ls = safeGet();
  if (!ls) return;
  ls.removeItem(key(provider, "connection"));
  ls.removeItem(key(provider, "metrics"));
  ls.removeItem(key(provider, "history"));
}

export function upsertSyncedMetrics(
  provider: WearableProvider,
  metrics: DailyHealthMetrics[],
): void {
  const ls = safeGet();
  if (!ls) return;
  const existingRaw = ls.getItem(key(provider, "metrics"));
  const map = new Map<string, DailyHealthMetrics>();
  if (existingRaw) {
    try {
      const arr = JSON.parse(existingRaw) as DailyHealthMetrics[];
      for (const m of arr) map.set(m.date, m);
    } catch {
      // ignore corrupt cache
    }
  }
  for (const m of metrics) {
    const prev = map.get(m.date);
    map.set(m.date, prev ? { ...prev, ...m } : m);
  }
  const merged = Array.from(map.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  ls.setItem(key(provider, "metrics"), JSON.stringify(merged));
}

export function getSyncedMetrics(
  provider: WearableProvider,
): DailyHealthMetrics[] {
  const ls = safeGet();
  if (!ls) return [];
  const raw = ls.getItem(key(provider, "metrics"));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DailyHealthMetrics[];
  } catch {
    return [];
  }
}

export function recordSyncRun(run: SyncRun): void {
  const ls = safeGet();
  if (!ls) return;
  const existingRaw = ls.getItem(key(run.provider, "history"));
  let arr: SyncRun[] = [];
  if (existingRaw) {
    try {
      arr = JSON.parse(existingRaw) as SyncRun[];
    } catch {
      arr = [];
    }
  }
  arr.unshift(run);
  ls.setItem(key(run.provider, "history"), JSON.stringify(arr.slice(0, 5)));
}

export function getSyncHistory(provider: WearableProvider): SyncRun[] {
  const ls = safeGet();
  if (!ls) return [];
  const raw = ls.getItem(key(provider, "history"));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SyncRun[];
  } catch {
    return [];
  }
}

export function getAllSyncedMetrics(): DailyHealthMetrics[] {
  const providers: WearableProvider[] = ["oura", "whoop", "apple", "garmin"];
  const map = new Map<string, DailyHealthMetrics>();
  for (const p of providers) {
    for (const m of getSyncedMetrics(p)) {
      const prev = map.get(m.date);
      map.set(m.date, prev ? { ...prev, ...m } : m);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}
