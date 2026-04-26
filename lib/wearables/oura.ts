// Helpers servidor-side da integração Oura. Detecta config OAuth via env e
// expõe utilities pra construir auth URL, trocar code por token e fetch metrics.

import { normalizeOura } from "./normalize";
import type { DailyHealthMetrics } from "@/lib/wearables-mock";

const AUTHORIZE_URL = "https://cloud.ouraring.com/oauth/authorize";
const TOKEN_URL = "https://api.ouraring.com/oauth/token";
const API_BASE = "https://api.ouraring.com/v2/usercollection";
const SCOPE = "email personal daily heartrate workout session";

export function ouraConfig() {
  const clientId = process.env.OURA_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.OURA_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = process.env.OURA_REDIRECT_URI?.trim() ?? "";
  return {
    clientId,
    clientSecret,
    redirectUri,
    configured: Boolean(clientId && clientSecret),
  };
}

export function buildOuraAuthorizeUrl(state: string, redirectUri: string) {
  const { clientId } = ouraConfig();
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("state", state);
  return url.toString();
}

export interface OuraTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

export async function exchangeOuraCode(
  code: string,
  redirectUri: string,
): Promise<OuraTokenResponse> {
  const { clientId, clientSecret } = ouraConfig();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Oura token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as OuraTokenResponse;
}

async function ouraFetch(path: string, token: string, params: URLSearchParams) {
  const url = `${API_BASE}/${path}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Oura ${path} ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function fetchOuraLast7Days(
  token: string,
): Promise<DailyHealthMetrics[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  const params = new URLSearchParams({
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  });
  const [daily_sleep, daily_activity] = await Promise.all([
    ouraFetch("daily_sleep", token, params),
    ouraFetch("daily_activity", token, params),
  ]);
  return normalizeOura({ daily_sleep, daily_activity });
}
