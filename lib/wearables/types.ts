// Tipos compartilhados pelas integrações de wearables (Oura/Whoop/Apple/Garmin).
import type { DailyHealthMetrics } from "@/lib/wearables-mock";

export type WearableProvider = "oura" | "whoop" | "apple" | "garmin";

export interface WearableConnection {
  provider: WearableProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // epoch ms
  connectedAt: number;
}

export interface SyncRun {
  id: string;
  provider: WearableProvider;
  startedAt: number;
  finishedAt: number;
  metricsCount: number;
  status: "ok" | "error";
  error?: string;
}

export type { DailyHealthMetrics };
