import { createClient } from "@supabase/supabase-js";
import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "./env";

/**
 * Service-role Supabase client. Bypasses RLS — ONLY call from trusted server
 * code (server actions, route handlers) and never expose to the browser.
 * Returns `null` in demo mode or when the service key is absent.
 */
export function getAdminClient() {
  if (!isSupabaseConfigured() || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
