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
  /** ISO date string YYYY-MM-DD ou null */
  birthDate: string | null;
  /** Calculado a partir de birthDate. Mantido pra compat com componentes que ainda dependem. */
  chronologicalAge: number | null;
  /** Quando o intake (questionário de cadastro) foi finalizado. Null = ainda não preencheu. */
  intakeCompletedAt: string | null;
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
  birthDate: null,
  chronologicalAge: PATIENT.chronologicalAge,
  intakeCompletedAt: new Date().toISOString(), // demo finge ter intake pronto pra não redirecionar em loop
  isDemo: true,
};

function ageFromBirthDate(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate + "T00:00:00");
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 && age < 150 ? age : null;
}

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

  // Busca dados extras do profile. Os campos `birth_date` e `intake_completed_at`
  // existem após a migração 0002 — fazemos defensive read pra não quebrar caso
  // o user ainda não rodou a migration.
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "first_name, last_name, role, birth_date, chronological_age, intake_completed_at",
    )
    .eq("id", auth.user.id)
    .maybeSingle();

  const meta = (auth.user.user_metadata ?? {}) as Record<string, unknown>;

  const firstName =
    (profile?.first_name as string | undefined) ||
    (meta.first_name as string | undefined) ||
    auth.user.email?.split("@")[0] ||
    "Usuário";
  const lastName =
    (profile?.last_name as string | undefined) ||
    (meta.last_name as string | undefined) ||
    "";

  const birthDate =
    (profile?.birth_date as string | undefined) ||
    (meta.birth_date as string | undefined) ||
    null;

  const chronologicalAge =
    ageFromBirthDate(birthDate) ??
    (typeof profile?.chronological_age === "number"
      ? (profile.chronological_age as number)
      : null) ??
    (meta.chronological_age
      ? Number(meta.chronological_age) || null
      : null);

  return {
    id: auth.user.id,
    email: auth.user.email ?? null,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    role: ((profile?.role as CurrentUser["role"]) ?? "patient"),
    birthDate,
    chronologicalAge,
    intakeCompletedAt: (profile?.intake_completed_at as string | null) ?? null,
    isDemo: false,
  };
}
