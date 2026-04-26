import "server-only";
import { getServerClient } from "@/lib/supabase/server";
import { PATIENT } from "@/lib/mock-data";

export interface CurrentUser {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  role: "patient" | "admin" | "doctor";
  chronologicalAge: number | null;
  /** `true` quando vem do mock (usuário não autenticado em modo demo) */
  isDemo: boolean;
}

const DEMO_USER: CurrentUser = {
  id: "demo",
  email: null,
  firstName: PATIENT.firstName,
  lastName: PATIENT.lastName,
  fullName: `${PATIENT.firstName} ${PATIENT.lastName}`,
  role: "patient",
  chronologicalAge: PATIENT.chronologicalAge,
  isDemo: true,
};

/**
 * Retorna o usuário autenticado (Supabase) com o profile da tabela `profiles`.
 * Em modo demo (sem Supabase configurado, ou sem sessão), devolve o paciente
 * mock pra UI continuar renderizando.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await getServerClient();
  if (!supabase) return DEMO_USER;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return DEMO_USER;

  // Busca dados extras do profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, role, chronological_age")
    .eq("id", auth.user.id)
    .maybeSingle();

  const firstName =
    profile?.first_name ||
    (auth.user.user_metadata?.first_name as string | undefined) ||
    auth.user.email?.split("@")[0] ||
    "Usuário";
  const lastName =
    profile?.last_name ||
    (auth.user.user_metadata?.last_name as string | undefined) ||
    "";

  return {
    id: auth.user.id,
    email: auth.user.email ?? null,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    role: (profile?.role as CurrentUser["role"]) ?? "patient",
    chronologicalAge:
      (profile?.chronological_age as number | undefined) ??
      (auth.user.user_metadata?.chronological_age as number | undefined) ??
      null,
    isDemo: false,
  };
}
