// Central guard for Supabase configuration. If URL + anon key are missing,
// the app runs in "demo mode" backed by local mock data.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
