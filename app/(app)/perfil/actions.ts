"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import { formToRecord, type ProfileFormShape } from "@/lib/profile/server";

export type SaveProfileResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Server action chamada pelo botão "Salvar alterações" em /perfil.
 * Atualiza a row em `profiles` do user logado.
 *
 * RLS na tabela permite update apenas onde id = auth.uid(), então
 * não precisamos checar autorização aqui — o Postgres bloqueia.
 *
 * Usa JWT helper (extrai userId do cookie sem chamar
 * supabase.auth.*) — evita race com refresh proativo que podia
 * clearing cookies em paralelo.
 */
export async function saveProfile(
  form: ProfileFormShape,
): Promise<SaveProfileResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase indisponível (modo demo)." };
  }

  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId) {
    return { ok: false, error: "Você precisa estar logado." };
  }

  const supabase = await createSupabaseWithJwt(accessToken);
  const record = formToRecord(form);

  // Garante row em profiles (deveria existir do trigger handle_new_user,
  // mas users criados antes do trigger podem não ter).
  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, role: "patient", ...record },
      { onConflict: "id" },
    );
  if (upsertError) {
    return { ok: false, error: upsertError.message };
  }

  revalidatePath("/perfil");
  revalidatePath("/home");
  return { ok: true };
}
