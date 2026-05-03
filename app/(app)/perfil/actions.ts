"use server";

import { revalidatePath } from "next/cache";
import { getServerClient } from "@/lib/supabase/server";
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
 */
export async function saveProfile(
  form: ProfileFormShape,
): Promise<SaveProfileResult> {
  const supabase = await getServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase indisponível (modo demo)." };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const auth = { user: sessionData?.session?.user ?? null };
  if (!auth.user) {
    return { ok: false, error: "Você precisa estar logado." };
  }

  const record = formToRecord(form);

  // Garante row em profiles (deveria existir do trigger handle_new_user,
  // mas users criados antes do trigger podem não ter).
  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      { id: auth.user.id, role: "patient", ...record },
      { onConflict: "id" },
    );
  if (upsertError) {
    return { ok: false, error: upsertError.message };
  }

  revalidatePath("/perfil");
  revalidatePath("/home");
  return { ok: true };
}
