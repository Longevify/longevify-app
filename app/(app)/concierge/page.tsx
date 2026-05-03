import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { PATIENT } from "@/lib/mock-data";
import { ConciergeView } from "./concierge-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Server wrapper que busca o nome real do user pra passar pra view do
 * Concierge. Sem isso, a saudação inicial usava "João" hardcoded.
 *
 * Prioridade do nome:
 *   1. preferredName (intake — se user escolheu)
 *   2. profile.first_name (signup)
 *   3. PATIENT.firstName ("João") só em modo demo legítimo
 */
export default async function ConciergePage() {
  let firstName: string | null = null;
  let preferredName: string | null = null;

  if (isSupabaseConfigured()) {
    // ZERO-AUTH-SUPABASE: extrai user_id do JWT do cookie
    const { userId } = await getUserIdFromCookie();
    if (userId) {
      const cookieStore = await cookies();
      const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            /* no-op */
          },
        },
      });
      const [profileRes, intakeRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("first_name")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("intake_responses")
          .select("responses")
          .eq("patient_id", userId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const fn = (profileRes.data?.first_name as string | undefined)?.trim();
      if (fn) firstName = fn;

      const responses = intakeRes.data?.responses as
        | { data?: { identity?: { preferredName?: string } } }
        | undefined
        | null;
      const pn = responses?.data?.identity?.preferredName?.trim();
      if (pn) preferredName = pn;
    }
  } else {
    // Modo demo legítimo — sem Supabase configurado
    firstName = PATIENT.firstName;
  }

  const addressName = preferredName ?? firstName;

  return <ConciergeView addressName={addressName} />;
}
