import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getServerClient } from "@/lib/supabase/server";
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
 */
export async function getServerRepositories(): Promise<Repositories> {
  if (!isSupabaseConfigured()) return createMockRepositories();
  const supabase = await getServerClient();
  if (!supabase) return createMockRepositories();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return createSupabaseRepositories(supabase, user?.id ?? null);
}
