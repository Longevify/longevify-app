import "server-only";
import { cookies } from "next/headers";

export interface ExtractedJwtSession {
  userId: string | null;
  email: string | null;
  expiresAt: number | null;
  accessToken: string | null;
  /** Nome direto do user_metadata do JWT (vem do signup). Fallback bom
   *  pra UI quando o profile do DB não tá acessível (ex: JWT expirado). */
  firstName: string | null;
  lastName: string | null;
}

/**
 * Helper que lê o user_id do access_token cookie do Supabase SEM chamar
 * supabase.auth.* — evita disparar refresh/race que clear cookies.
 *
 * Estratégia:
 *  1. Lê o cookie sb-{ref}-auth-token (ou variantes) do Next cookieStore
 *  2. Faz parse do valor JSON (supabase ssr armazena array com session)
 *  3. Decodifica o JWT do access_token (só base64 decode, sem verify)
 *  4. CHECA EXPIRY — se JWT expirou, retorna como deslogado (null)
 *  5. Retorna o `sub` claim = user_id, email, accessToken, e
 *     user_metadata.first_name/last_name pra fallback de UI
 *
 * Por que sem verify: o JWT é validado pelo PostgreSQL via RLS quando
 * fazemos queries — Supabase Postgres tem o JWT secret e checa a
 * assinatura em cada query. Forge falha no DB level. Aqui só
 * precisamos do user_id pra montar a query, sem risco de segurança.
 *
 * Por que checar expiry: se a gente não checa, JWT expirado retorna
 * userId/accessToken válidos pro código, mas todas as queries falham
 * com "JWT expired" (RLS reject). Resultado é um estado zumbi
 * (logado-mas-não-funciona) que parece broken pro user. Melhor
 * tratar como deslogado e forçar re-login.
 */
export async function getUserIdFromCookie(): Promise<ExtractedJwtSession> {
  const empty: ExtractedJwtSession = {
    userId: null,
    email: null,
    expiresAt: null,
    accessToken: null,
    firstName: null,
    lastName: null,
  };
  try {
    const cookieStore = await cookies();
    const all = cookieStore.getAll();

    // Procura cookies de auth do Supabase ssr.
    // Formato típico: `sb-{projectRef}-auth-token` ou
    // `sb-{projectRef}-auth-token.0` / `.1` (chunked quando grande).
    const authChunks: { name: string; value: string }[] = [];
    for (const c of all) {
      if (c.name.startsWith("sb-") && c.name.includes("-auth-token")) {
        authChunks.push(c);
      }
    }
    if (authChunks.length === 0) return empty;

    // Reconstrói o valor (chunks vêm sufixados .0, .1, .2 — sort + concat)
    authChunks.sort((a, b) => a.name.localeCompare(b.name));
    const raw = authChunks.map((c) => c.value).join("");

    // O valor pode ser:
    //  - "base64-{base64-encoded-json}" (formato novo do supabase ssr)
    //  - JSON direto: ["access_token","refresh_token",...,user_object,...]
    let payload: unknown;
    if (raw.startsWith("base64-")) {
      const b64 = raw.slice("base64-".length);
      const decoded =
        typeof atob === "function"
          ? atob(b64)
          : Buffer.from(b64, "base64").toString("utf-8");
      payload = JSON.parse(decoded);
    } else {
      payload = JSON.parse(raw);
    }

    let accessToken: string | null = null;
    let userId: string | null = null;
    let email: string | null = null;
    let expiresAt: number | null = null;
    let firstName: string | null = null;
    let lastName: string | null = null;

    // Formato "session"-like: { access_token, refresh_token, user: {...} }
    if (
      payload &&
      typeof payload === "object" &&
      "access_token" in payload &&
      typeof (payload as { access_token: unknown }).access_token === "string"
    ) {
      const session = payload as {
        access_token: string;
        user?: {
          id?: string;
          email?: string;
          user_metadata?: { first_name?: string; last_name?: string };
        };
        expires_at?: number;
      };
      accessToken = session.access_token;
      const decoded = decodeJwt(accessToken);
      userId =
        session.user?.id ?? (decoded?.sub as string | undefined) ?? null;
      email =
        session.user?.email ?? (decoded?.email as string | undefined) ?? null;
      expiresAt =
        session.expires_at ?? (decoded?.exp as number | undefined) ?? null;
      firstName =
        session.user?.user_metadata?.first_name ??
        ((decoded?.user_metadata as { first_name?: string } | undefined)
          ?.first_name ??
          null);
      lastName =
        session.user?.user_metadata?.last_name ??
        ((decoded?.user_metadata as { last_name?: string } | undefined)
          ?.last_name ??
          null);
    } else if (Array.isArray(payload)) {
      // Formato legado: array tipo [access_token, refresh_token, ...]
      accessToken = typeof payload[0] === "string" ? payload[0] : null;
      if (!accessToken) return empty;
      const decoded = decodeJwt(accessToken);
      userId = (decoded?.sub as string | undefined) ?? null;
      email = (decoded?.email as string | undefined) ?? null;
      expiresAt = (decoded?.exp as number | undefined) ?? null;
      const meta = decoded?.user_metadata as
        | { first_name?: string; last_name?: string }
        | undefined;
      firstName = meta?.first_name ?? null;
      lastName = meta?.last_name ?? null;
    } else {
      return empty;
    }

    // CHECA EXPIRY — se JWT expirou, trata como deslogado.
    // Margem de 30s pra evitar borderline (clock skew).
    if (expiresAt && expiresAt * 1000 < Date.now() - 30_000) {
      return empty;
    }

    return { userId, email, expiresAt, accessToken, firstName, lastName };
  } catch {
    return empty;
  }
}

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // base64url → base64
    const padded =
      payload.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}
