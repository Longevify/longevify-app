import "server-only";
import { cookies } from "next/headers";

/**
 * Helper que lê o user_id do access_token cookie do Supabase SEM chamar
 * supabase.auth.* — evita disparar refresh/race que clear cookies.
 *
 * Estratégia:
 *  1. Lê o cookie sb-{ref}-auth-token (ou variantes) do Next cookieStore
 *  2. Faz parse do valor JSON (supabase ssr armazena array com session)
 *  3. Decodifica o JWT do access_token (só base64 decode, sem verify)
 *  4. Retorna o `sub` claim = user_id
 *
 * Por que sem verify: o JWT é validado pelo PostgreSQL via RLS quando
 * fazemos queries — Supabase Postgres tem o JWT secret e checa a
 * assinatura em cada query. Forge falha no DB level. Aqui só
 * precisamos do user_id pra montar a query, sem risco de segurança.
 */
export async function getUserIdFromCookie(): Promise<{
  userId: string | null;
  email: string | null;
  expiresAt: number | null;
}> {
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
    if (authChunks.length === 0) {
      return { userId: null, email: null, expiresAt: null };
    }

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

    // Formato "session"-like: { access_token, refresh_token, user: {...} }
    if (
      payload &&
      typeof payload === "object" &&
      "access_token" in payload &&
      typeof (payload as { access_token: unknown }).access_token === "string"
    ) {
      const session = payload as {
        access_token: string;
        user?: { id?: string; email?: string };
        expires_at?: number;
      };
      const decoded = decodeJwt(session.access_token);
      const userId =
        session.user?.id ?? (decoded?.sub as string | undefined) ?? null;
      const email =
        session.user?.email ?? (decoded?.email as string | undefined) ?? null;
      const expiresAt =
        session.expires_at ?? (decoded?.exp as number | undefined) ?? null;
      return { userId, email, expiresAt };
    }

    // Formato legado: array tipo [access_token, refresh_token, ...]
    if (Array.isArray(payload)) {
      const accessToken = typeof payload[0] === "string" ? payload[0] : null;
      if (!accessToken) return { userId: null, email: null, expiresAt: null };
      const decoded = decodeJwt(accessToken);
      return {
        userId: (decoded?.sub as string | undefined) ?? null,
        email: (decoded?.email as string | undefined) ?? null,
        expiresAt: (decoded?.exp as number | undefined) ?? null,
      };
    }

    return { userId: null, email: null, expiresAt: null };
  } catch {
    return { userId: null, email: null, expiresAt: null };
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
