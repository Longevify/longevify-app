"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import { awardPoints } from "@/lib/social/server";
import type { SocialPostKind, SocialPost } from "@/lib/social/types";

/**
 * Lucas (2026-05-23): "na aba fitness, tem que ter a opção de postar os
 * achievements do treino, depois de uma sessão de musculação, uma sessão
 * de corrida".
 *
 * Cria um social_posts row com o payload renderizável (igual ao que o
 * canvas do share image desenha). Default visibility = friends — Lucas
 * pode escolher "public" no modal.
 */

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function createSocialPostAction(input: {
  kind: SocialPostKind;
  payload: SocialPost["payload"];
  visibility?: "friends" | "public";
}): Promise<ActionResult<{ postId: string }>> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase off" };
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken)
    return { ok: false, error: "Não autenticado" };

  if (!input.payload?.title || input.payload.title.trim().length === 0) {
    return { ok: false, error: "Post precisa de título." };
  }

  const supabase = await createSupabaseWithJwt(accessToken);
  const { data, error } = await supabase
    .from("social_posts")
    .insert({
      patient_id: userId,
      kind: input.kind,
      payload: input.payload,
      visibility: input.visibility ?? "friends",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Erro ao postar" };
  }

  // Award pontos sociais — incentiva compartilhamento
  await awardPoints("social_post", {
    postId: data.id as string,
    kind: input.kind,
  });

  revalidatePath("/social");
  return { ok: true, data: { postId: data.id as string } };
}
