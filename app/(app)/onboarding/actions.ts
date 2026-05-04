"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import type { IntakeRecord } from "@/lib/intake/schema";

export type SyncIntakeResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Persiste o intake (questionário inicial) em `intake_responses` + marca
 * `profiles.intake_completed_at` quando o user concluiu.
 *
 * Idempotente: usa upsert por patient_id + variant.
 *
 * Chamado tanto durante o intake (snapshots periódicos) quanto no final
 * (com `completedAt` setado). Best-effort — se falhar, o localStorage do
 * cliente continua funcionando como fallback.
 */
export async function syncIntake(
  record: IntakeRecord,
): Promise<SyncIntakeResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase indisponível (modo demo)." };
  }

  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId) return { ok: false, error: "Não autenticado." };

  const supabase = await createSupabaseWithJwt(accessToken);

  // 1) Upsert intake_responses
  // A tabela tem (patient_id, variant) como chave lógica, mas não há
  // unique constraint — fazemos delete + insert pra garantir 1 row por
  // (patient_id, variant). Idempotente.
  const { error: deleteError } = await supabase
    .from("intake_responses")
    .delete()
    .eq("patient_id", userId)
    .eq("variant", record.variant);

  if (deleteError && deleteError.code !== "PGRST116") {
    return { ok: false, error: deleteError.message };
  }

  const { error: insertError } = await supabase
    .from("intake_responses")
    .insert({
      patient_id: userId,
      variant: record.variant,
      responses: {
        step: record.step,
        startedAt: record.startedAt,
        completedAt: record.completedAt,
        data: record.data,
      },
    });

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  // 2) Quando completou, marca profiles.intake_completed_at
  if (record.completedAt) {
    // Também propaga campos do intake.identity pro profiles,
    // assim /perfil já vem hidratado quando o user abrir.
    const id = record.data.identity;
    const profileUpdate: Record<string, unknown> = {
      intake_completed_at: record.completedAt,
    };
    if (id.fullName) {
      const [firstName, ...rest] = id.fullName.trim().split(/\s+/);
      if (firstName) profileUpdate.first_name = firstName;
      if (rest.length) profileUpdate.last_name = rest.join(" ");
    }
    if (id.birthDate) profileUpdate.birth_date = id.birthDate;
    if (id.heightCm) profileUpdate.height_cm = id.heightCm;
    if (id.weightKg) profileUpdate.weight_kg = id.weightKg;
    if (id.city) profileUpdate.city = id.city;
    if (id.state) profileUpdate.uf = id.state;

    const { error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", userId);

    // Não falha o sync inteiro se profiles falhar — o intake já foi salvo.
    if (profileError) {
      // eslint-disable-next-line no-console
      console.warn("syncIntake: profiles update falhou", profileError.message);
    }

    revalidatePath("/home");
    revalidatePath("/perfil");
  }

  return { ok: true };
}
