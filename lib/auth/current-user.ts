import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "./jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import { PATIENT } from "@/lib/mock-data";

const DEMO_COOKIE = "longevify_demo_session";

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
 *
 * `cache()` do React deduplica chamadas dentro de UMA mesma render tree —
 * crítico pra evitar race condition no refresh de token: se o layout chama
 * getCurrentUser() e a page também, sem cache cada um faz seu próprio
 * supabase.auth.getUser(), que pode rotacionar refresh tokens em paralelo
 * e clear da sessão silenciosamente.
 */
export const getCurrentUser = cache(_getCurrentUser);

async function _getCurrentUser(): Promise<CurrentUser> {
  // Cookie demo opt-in: o user clicou em "Entrar como demo" mesmo com
  // Supabase configurado. Cookie tem prioridade sobre o JWT — assim o
  // user pode explorar o app com dados fakes do João sem precisar
  // desligar o Supabase no .env.
  const store = await cookies();
  if (store.get(DEMO_COOKIE)?.value === "1") return DEMO_USER;

  if (!isSupabaseConfigured()) return DEMO_USER;

  // ZERO-AUTH-SUPABASE: extrai user_id + access_token + nome do JWT
  // sem chamar supabase.auth.* — evita refresh + race que clear cookies.
  const {
    userId,
    email,
    accessToken,
    firstName: jwtFirstName,
    lastName: jwtLastName,
  } = await getUserIdFromCookie();
  if (!userId) return DEMO_USER;

  const userEmail = email;

  // Cliente com JWT explícito no header Authorization. Sem isso a query
  // sai sem auth e RLS bloqueia silenciosamente — o profile real volta
  // null e o user vira "demo" pro layout, com nome do email e
  // intakeCompletedAt=null (loop pra /onboarding).
  const supabase = await createSupabaseWithJwt(accessToken);

  // Busca dados extras do profile. Os campos `birth_date` e `intake_completed_at`
  // existem após a migração 0002 — fazemos defensive read pra não quebrar caso
  // o user ainda não rodou a migration.
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "first_name, last_name, role, birth_date, chronological_age, intake_completed_at",
    )
    .eq("id", userId)
    .maybeSingle();

  // Nome cascata: profile DB > JWT user_metadata > email prefix > "Usuário"
  // JWT metadata tem first_name/last_name que vêm do signup, então é
  // bom fallback antes de cair no email prefix (que dá avatar "E" pra
  // eulucasvalle@... em vez de "LV").
  const firstName =
    (profile?.first_name as string | undefined) ||
    jwtFirstName ||
    userEmail?.split("@")[0] ||
    "Usuário";
  const lastName =
    (profile?.last_name as string | undefined) || jwtLastName || "";

  const birthDate = (profile?.birth_date as string | undefined) || null;

  const chronologicalAge =
    ageFromBirthDate(birthDate) ??
    (typeof profile?.chronological_age === "number"
      ? (profile.chronological_age as number)
      : null);

  return {
    id: userId,
    email: userEmail,
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
