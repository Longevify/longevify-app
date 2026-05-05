import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import { PATIENT } from "@/lib/mock-data";
import { ConciergeView } from "./concierge-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEMO_COOKIE = "longevify_demo_session";

/**
 * Server wrapper que busca o nome real do user pra passar pra view do
 * Concierge. Sem isso, a saudação inicial usava "João" hardcoded.
 *
 * Prioridade do nome:
 *   1. preferredName (intake — se user escolheu)
 *   2. profile.first_name (signup)
 *   3. PATIENT.firstName ("João") em modo demo (cookie demo OU sem Supabase)
 */
export default async function ConciergePage() {
  let firstName: string | null = null;
  let preferredName: string | null = null;

  // Cookie demo opt-in: user clicou em "Entrar como demo" — usa João
  // mesmo com Supabase configurado.
  const store = await cookies();
  const isDemoCookie = store.get(DEMO_COOKIE)?.value === "1";

  if (isDemoCookie || !isSupabaseConfigured()) {
    firstName = PATIENT.firstName;
  } else {
    // ZERO-AUTH-SUPABASE: extrai user_id + access_token do JWT do cookie
    const { userId, accessToken } = await getUserIdFromCookie();
    if (userId) {
      // JWT explícito no header — sem isso RLS bloqueia silenciosamente
      // e voltamos pro fallback "Oi!" sem nome.
      const supabase = await createSupabaseWithJwt(accessToken);
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
  }

  const addressName = preferredName ?? firstName;

  return <ConciergeView addressName={addressName} />;
}
