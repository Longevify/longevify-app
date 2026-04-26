// Helpers servidor-side da integração Whoop — API v2.
// Spec: https://developer.whoop.com (OpenAPI 3.0.1, base /developer/v2)

import { normalizeWhoop } from "./normalize";
import type { DailyHealthMetrics } from "@/lib/wearables-mock";

const AUTHORIZE_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const API_BASE = "https://api.prod.whoop.com/developer/v2";
const SCOPE =
  "read:profile read:recovery read:cycles read:sleep read:workout read:body_measurement";

export function whoopConfig() {
  const clientId = process.env.WHOOP_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.WHOOP_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = process.env.WHOOP_REDIRECT_URI?.trim() ?? "";
  return {
    clientId,
    clientSecret,
    redirectUri,
    configured: Boolean(clientId && clientSecret),
  };
}

export function buildWhoopAuthorizeUrl(state: string, redirectUri: string) {
  const { clientId } = whoopConfig();
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("state", state);
  return url.toString();
}

export interface WhoopTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export async function exchangeWhoopCode(
  code: string,
  redirectUri: string,
): Promise<WhoopTokenResponse> {
  const { clientId, clientSecret } = whoopConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whoop token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as WhoopTokenResponse;
}

async function whoopFetch(path: string, token: string, params?: URLSearchParams) {
  const qs = params ? `?${params.toString()}` : "";
  const url = `${API_BASE}/${path}${qs}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whoop ${path} ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function fetchWhoopLast7Days(
  token: string,
): Promise<DailyHealthMetrics[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  const params = new URLSearchParams({
    start: start.toISOString(),
    end: end.toISOString(),
    limit: "25",
  });
  // Endpoints v2 (Sleep retorna PaginatedSleepResponse; Cycle/Recovery
  // PaginatedCycleResponse / RecoveryCollection; Workout WorkoutCollection).
  const [recovery, sleep, cycle, workout] = await Promise.all([
    whoopFetch("recovery", token, params),
    whoopFetch("activity/sleep", token, params),
    whoopFetch("cycle", token, params),
    whoopFetch("activity/workout", token, params),
  ]);
  return normalizeWhoop({ recovery, sleep, cycle, workout });
}

/**
 * Body measurement (height, weight, max HR) — uma chamada separada,
 * só precisa rodar 1x na conexão e quando user atualizar dados.
 */
export interface WhoopBodyMeasurement {
  height_meter?: number;
  weight_kilogram?: number;
  max_heart_rate?: number;
}

export async function fetchWhoopBodyMeasurement(
  token: string,
): Promise<WhoopBodyMeasurement | null> {
  // v2: /developer/v2/user/measurement/body
  try {
    const data = await whoopFetch("user/measurement/body", token);
    return data as WhoopBodyMeasurement;
  } catch {
    return null;
  }
}

/**
 * Perfil básico do usuário Whoop (nome, email, user_id).
 */
export interface WhoopBasicProfile {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export async function fetchWhoopProfile(
  token: string,
): Promise<WhoopBasicProfile | null> {
  try {
    const data = await whoopFetch("user/profile/basic", token);
    return data as WhoopBasicProfile;
  } catch {
    return null;
  }
}
