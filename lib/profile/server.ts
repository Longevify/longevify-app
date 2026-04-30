import "server-only";
import { getServerClient } from "@/lib/supabase/server";

/**
 * Forma canônica do perfil que vai pro DB.
 * Mantemos snake_case nos field-names pra bater com a coluna SQL.
 */
export interface ProfileRecord {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  cpf: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  blood_type: string | null;
  city: string | null;
  uf: string | null;
  occupation: string | null;
  language: string | null;
  goals: string | null;
  conditions: string | null;
  medications: string | null;
  allergies: string | null;
  birth_date: string | null;
  chronological_age: number | null;
}

/**
 * Forma usada pelo form em /perfil (camelCase, valores nunca null pra UI
 * controlled inputs ficarem felizes).
 */
export interface ProfileFormShape {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  chronologicalAge: number;
  cpf: string;
  height: number;
  weight: number;
  bloodType: string;
  city: string;
  uf: string;
  occupation: string;
  goals: string;
  conditions: string;
  medications: string;
  allergies: string;
  language: string;
}

const EMPTY_FORM: ProfileFormShape = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  chronologicalAge: 0,
  cpf: "",
  height: 0,
  weight: 0,
  bloodType: "",
  city: "",
  uf: "",
  occupation: "",
  goals: "",
  conditions: "",
  medications: "",
  allergies: "",
  language: "Português (BR)",
};

export function recordToForm(
  rec: Partial<ProfileRecord> | null,
  email: string,
): ProfileFormShape {
  if (!rec) return { ...EMPTY_FORM, email };
  return {
    firstName: rec.first_name ?? "",
    lastName: rec.last_name ?? "",
    email,
    phone: rec.phone ?? "",
    chronologicalAge: rec.chronological_age ?? 0,
    cpf: rec.cpf ?? "",
    height: rec.height_cm ? Number(rec.height_cm) : 0,
    weight: rec.weight_kg ? Number(rec.weight_kg) : 0,
    bloodType: rec.blood_type ?? "",
    city: rec.city ?? "",
    uf: rec.uf ?? "",
    occupation: rec.occupation ?? "",
    goals: rec.goals ?? "",
    conditions: rec.conditions ?? "",
    medications: rec.medications ?? "",
    allergies: rec.allergies ?? "",
    language: rec.language ?? "Português (BR)",
  };
}

export function formToRecord(form: ProfileFormShape): Omit<ProfileRecord, "birth_date"> {
  return {
    first_name: form.firstName.trim() || null,
    last_name: form.lastName.trim() || null,
    phone: form.phone.trim() || null,
    cpf: form.cpf.trim() || null,
    height_cm: form.height > 0 ? form.height : null,
    weight_kg: form.weight > 0 ? form.weight : null,
    blood_type: form.bloodType.trim() || null,
    city: form.city.trim() || null,
    uf: form.uf.trim() || null,
    occupation: form.occupation.trim() || null,
    language: form.language.trim() || null,
    goals: form.goals.trim() || null,
    conditions: form.conditions.trim() || null,
    medications: form.medications.trim() || null,
    allergies: form.allergies.trim() || null,
    chronological_age: form.chronologicalAge > 0 ? form.chronologicalAge : null,
  };
}

/**
 * Carrega o perfil completo do user atual. Usado pelo server component
 * em /perfil pra hidratar o form. Retorna null em modo demo.
 */
export async function loadProfileForCurrentUser(): Promise<{
  form: ProfileFormShape;
  isDemo: boolean;
} | null> {
  const supabase = await getServerClient();
  if (!supabase) return null;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;

  const { data: rec } = await supabase
    .from("profiles")
    .select(
      "first_name, last_name, phone, cpf, height_cm, weight_kg, blood_type, city, uf, occupation, language, goals, conditions, medications, allergies, birth_date, chronological_age",
    )
    .eq("id", auth.user.id)
    .maybeSingle();

  return {
    form: recordToForm(rec as Partial<ProfileRecord> | null, auth.user.email ?? ""),
    isDemo: false,
  };
}
