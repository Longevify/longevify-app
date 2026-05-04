import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import { createMockRepositories } from "./adapters/mock";
import { createSupabaseRepositories } from "./adapters/supabase";
import type { Repositories } from "./repositories";

export type { Repositories } from "./repositories";
export * from "./types";

/**
 * Synchronous, unauthenticated repositories — safe for public fragments
 * (marketing, demo mode). Always backed by mock data.
 */
export function getRepositories(): Repositories {
  return createMockRepositories();
}

/**
 * Server-side repositories resolved for the current authenticated user. Falls
 * back to mock data when Supabase is not configured (demo mode) or when the
 * current request has no session.
 *
 * Usa JWT helper — supabase.auth.getSession() dispara refresh que
 * clear cookies em race condition.
 */
export async function getServerRepositories(): Promise<Repositories> {
  if (!isSupabaseConfigured()) return createMockRepositories();
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId) return createMockRepositories();
  const supabase = await createSupabaseWithJwt(accessToken);
  return createSupabaseRepositories(supabase, userId);
}
