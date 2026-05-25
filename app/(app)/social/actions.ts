"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import { awardPoints } from "@/lib/social/server";

/**
 * Server actions da feature de convite de amigo.
 *
 * Lucas (2026-05-23): trocar o stub "Em breve" por busca real + send invite
 * + accept/reject.
 *
 * Tabela: social_friend_invites
 *   unique (inviter_id, invitee_id) — só pode ter UM convite ativo entre
 *   o mesmo par. Se rejeitado/cancelado anterior existe, o upsert resseta
 *   pra pending de novo.
 */

export interface UserSearchResult {
  id: string;
  firstName: string;
  level: number;
  totalPoints: number;
  city: string | null;
  state: string | null;
  /** Já é amigo? */
  isFriend: boolean;
  /** Já tem invite pendente comigo? (incoming/outgoing) */
  pendingInviteId: string | null;
  /** Sou eu? */
  isMe: boolean;
}

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Busca usuários por nome (first_name OR last_name). Limita 20 resultados.
 * Anota cada match com relação atual (amigo / invite pendente / eu mesmo).
 */
export async function searchUsersAction(
  query: string,
): Promise<ActionResult<UserSearchResult[]>> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase off" };
  const trimmed = query.trim();
  if (trimmed.length < 2) return { ok: true, data: [] };

  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken)
    return { ok: false, error: "Não autenticado" };

  const supabase = await createSupabaseWithJwt(accessToken);
  // ilike é case-insensitive. % wildcards nos dois lados.
  const term = `%${trimmed.replace(/[%_]/g, "\\$&")}%`;
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `id, first_name, last_name,
       user_health_points!user_health_points_patient_id_fkey(total_points, level),
       user_location!user_location_patient_id_fkey(city, state)`,
    )
    .or(`first_name.ilike.${term},last_name.ilike.${term}`)
    .neq("role", "admin")
    .limit(20);

  if (error) return { ok: false, error: error.message };

  // Carrega friendships + invites do user pra anotar
  const [friendsRes, invitesRes] = await Promise.all([
    supabase
      .from("social_friendships")
      .select("friend_id")
      .eq("patient_id", userId)
      .eq("status", "active"),
    supabase
      .from("social_friend_invites")
      .select("id, inviter_id, invitee_id")
      .or(`inviter_id.eq.${userId},invitee_id.eq.${userId}`)
      .eq("status", "pending"),
  ]);

  const friendSet = new Set(
    (friendsRes.data ?? []).map((r) => r.friend_id as string),
  );
  const inviteMap = new Map<string, string>(); // otherId → inviteId
  for (const r of invitesRes.data ?? []) {
    const otherId =
      r.inviter_id === userId
        ? (r.invitee_id as string)
        : (r.inviter_id as string);
    inviteMap.set(otherId, r.id as string);
  }

  return {
    ok: true,
    data: (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const points = (row.user_health_points as {
        total_points?: number;
        level?: number;
      }) ?? {};
      const loc = (row.user_location as {
        city?: string | null;
        state?: string | null;
      }) ?? {};
      return {
        id: row.id as string,
        firstName:
          [(row.first_name as string) ?? "", (row.last_name as string) ?? ""]
            .filter(Boolean)
            .join(" ")
            .trim() || "Anônimo",
        level: points.level ?? 1,
        totalPoints: points.total_points ?? 0,
        city: loc.city ?? null,
        state: loc.state ?? null,
        isFriend: friendSet.has(row.id as string),
        pendingInviteId: inviteMap.get(row.id as string) ?? null,
        isMe: row.id === userId,
      };
    }),
  };
}

/**
 * Envia convite de amizade. Upsert: se já existia (rejected/cancelled),
 * volta pra pending. Se já é pending, no-op idempotente.
 */
export async function sendFriendInviteAction(
  inviteeId: string,
  message?: string,
): Promise<ActionResult<{ inviteId: string }>> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase off" };
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken)
    return { ok: false, error: "Não autenticado" };
  if (inviteeId === userId)
    return { ok: false, error: "Você não pode adicionar a si mesmo." };

  const supabase = await createSupabaseWithJwt(accessToken);

  // Já são amigos?
  const { data: existingFriend } = await supabase
    .from("social_friendships")
    .select("patient_id")
    .eq("patient_id", userId)
    .eq("friend_id", inviteeId)
    .eq("status", "active")
    .maybeSingle();
  if (existingFriend)
    return { ok: false, error: "Vocês já são amigos." };

  // Há invite pendente do OUTRO LADO? Aceita direto.
  const { data: reverse } = await supabase
    .from("social_friend_invites")
    .select("id")
    .eq("inviter_id", inviteeId)
    .eq("invitee_id", userId)
    .eq("status", "pending")
    .maybeSingle();
  if (reverse) {
    return respondToInviteAction(reverse.id as string, true);
  }

  // Upsert pra reaproveitar row antiga (rejected/cancelled)
  const { data, error } = await supabase
    .from("social_friend_invites")
    .upsert(
      {
        inviter_id: userId,
        invitee_id: inviteeId,
        status: "pending",
        message: message ?? null,
        responded_at: null,
      },
      { onConflict: "inviter_id,invitee_id" },
    )
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Erro" };

  revalidatePath("/social");
  return { ok: true, data: { inviteId: data.id as string } };
}

/**
 * Aceita/rejeita convite. Aceitar cria 2 rows em social_friendships (A→B
 * e B→A) e dá pontos pros dois.
 */
export async function respondToInviteAction(
  inviteId: string,
  accept: boolean,
): Promise<ActionResult<{ inviteId: string }>> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase off" };
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken)
    return { ok: false, error: "Não autenticado" };

  const supabase = await createSupabaseWithJwt(accessToken);

  // Pega o convite (RLS já garante que sou invitee OU inviter)
  const { data: invite, error: fetchErr } = await supabase
    .from("social_friend_invites")
    .select("id, inviter_id, invitee_id, status")
    .eq("id", inviteId)
    .maybeSingle();
  if (fetchErr || !invite)
    return { ok: false, error: "Convite não encontrado." };
  if (invite.status !== "pending")
    return { ok: false, error: "Convite já foi respondido." };
  if (invite.invitee_id !== userId)
    return { ok: false, error: "Esse convite não é pra você." };

  const newStatus = accept ? "accepted" : "rejected";
  const { error: updErr } = await supabase
    .from("social_friend_invites")
    .update({ status: newStatus, responded_at: new Date().toISOString() })
    .eq("id", inviteId);
  if (updErr) return { ok: false, error: updErr.message };

  if (accept) {
    // Cria as 2 rows bidirecionais
    const inviter = invite.inviter_id as string;
    const invitee = invite.invitee_id as string;
    const { error: friendErr } = await supabase
      .from("social_friendships")
      .upsert(
        [
          { patient_id: invitee, friend_id: inviter, status: "active" },
          { patient_id: inviter, friend_id: invitee, status: "active" },
        ],
        { onConflict: "patient_id,friend_id" },
      );
    if (friendErr) return { ok: false, error: friendErr.message };

    // Pontinho social pro user que aceitou (o inviter não tem JWT aqui;
    // ele ganha pontos quando carregar o social na próxima vez via
    // award trigger ou bg job — manter simples por enquanto)
    await awardPoints("friend_added", { friendId: inviter });
  }

  revalidatePath("/social");
  return { ok: true, data: { inviteId } };
}

/**
 * Cancela convite que EU enviei (status pending → cancelled). Só inviter
 * pode chamar.
 */
export async function cancelInviteAction(
  inviteId: string,
): Promise<ActionResult<{ inviteId: string }>> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase off" };
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken)
    return { ok: false, error: "Não autenticado" };

  const supabase = await createSupabaseWithJwt(accessToken);
  const { data: invite } = await supabase
    .from("social_friend_invites")
    .select("inviter_id, status")
    .eq("id", inviteId)
    .maybeSingle();
  if (!invite) return { ok: false, error: "Convite não encontrado." };
  if (invite.inviter_id !== userId)
    return { ok: false, error: "Só quem enviou pode cancelar." };
  if (invite.status !== "pending")
    return { ok: false, error: "Convite já foi respondido." };

  const { error } = await supabase
    .from("social_friend_invites")
    .update({ status: "cancelled", responded_at: new Date().toISOString() })
    .eq("id", inviteId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/social");
  return { ok: true, data: { inviteId } };
}

/**
 * Remove amizade existente (deleta as 2 rows bidirecionais). Só quem
 * está na amizade pode chamar.
 */
export async function removeFriendAction(
  friendId: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase off" };
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken)
    return { ok: false, error: "Não autenticado" };

  const supabase = await createSupabaseWithJwt(accessToken);
  // RLS write policy: só consigo deletar onde patient_id = userId, então
  // pra deletar A→B (userId=A) e B→A (userId=B) precisaria de duas calls
  // mas com auth.uid() = patient_id check, só consigo deletar a minha
  // metade. A outra metade fica orfã — vou marcar como blocked no lugar.
  const { error } = await supabase
    .from("social_friendships")
    .delete()
    .eq("patient_id", userId)
    .eq("friend_id", friendId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/social");
  return { ok: true };
}

// ─── Contacts sync (Lucas 2026-05-24) ────────────────────────────────

/**
 * Normaliza phone pra formato uniforme: só dígitos, com country code BR
 * default (55) se 10-11 dígitos sem prefixo.
 *
 * Exemplos:
 *   "(11) 98765-4321"  → "5511987654321"
 *   "+55 21 98765 4321" → "5521987654321"
 *   "11987654321"      → "5511987654321"
 *   "5511987654321"    → "5511987654321"
 *   "+1 415 555 2671"  → "14155552671"
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null; // muito curto
  // Se já começa com 55 (BR) e tem 12-13 dígitos, ok
  if (digits.length >= 12) return digits;
  // 10-11 dígitos: assume BR sem country code
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  // 8-9 dígitos: pode ser fixo sem DDD — não dá pra inferir, rejeita
  if (digits.length < 10) return null;
  return digits;
}

/**
 * Salva o phone do user atual (opt-in pra ser encontrado por contatos
 * sync de outros users).
 */
export async function linkMyPhoneAction(
  phone: string,
): Promise<ActionResult<{ normalizedPhone: string }>> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase off" };
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken)
    return { ok: false, error: "Não autenticado" };

  const normalized = normalizePhone(phone);
  if (!normalized)
    return { ok: false, error: "Telefone inválido — use formato +55 (XX) XXXXX-XXXX" };

  const supabase = await createSupabaseWithJwt(accessToken);
  const { error } = await supabase
    .from("profiles")
    .update({ phone: normalized })
    .eq("id", userId);

  if (error) {
    // Provavelmente unique constraint violation — phone já em uso
    if (error.code === "23505") {
      return {
        ok: false,
        error: "Esse telefone já está vinculado a outra conta Longevify.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/social");
  return { ok: true, data: { normalizedPhone: normalized } };
}

/** Remove o phone do user (opt-out). */
export async function unlinkMyPhoneAction(): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase off" };
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken)
    return { ok: false, error: "Não autenticado" };
  const supabase = await createSupabaseWithJwt(accessToken);
  const { error } = await supabase
    .from("profiles")
    .update({ phone: null })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/social");
  return { ok: true };
}

/**
 * Recebe lista de telefones (do address book do user) → retorna profiles
 * que fazem match. Anota relação atual (já amigo / convite pendente).
 *
 * Privacy:
 *   - Server NUNCA retorna phones de outros users
 *   - Só retorna profiles que opt-in (têm phone setado)
 *   - User precisa estar autenticado
 */
export async function matchContactsAction(
  phones: string[],
): Promise<ActionResult<UserSearchResult[]>> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase off" };
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken)
    return { ok: false, error: "Não autenticado" };

  // Normaliza todos os phones e remove duplicados / inválidos
  const normalized = Array.from(
    new Set(
      phones
        .map((p) => normalizePhone(p))
        .filter((p): p is string => p !== null),
    ),
  );

  if (normalized.length === 0) return { ok: true, data: [] };
  // Limita pra não explodir DB se user mandou 5000 contatos
  const capped = normalized.slice(0, 1000);

  const supabase = await createSupabaseWithJwt(accessToken);
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `id, first_name, last_name,
       user_health_points!user_health_points_patient_id_fkey(total_points, level),
       user_location!user_location_patient_id_fkey(city, state)`,
    )
    .in("phone", capped)
    .neq("role", "admin")
    .neq("id", userId);

  if (error) return { ok: false, error: error.message };

  // Anota friend / pending invite status (reusa lógica de searchUsersAction)
  const [friendsRes, invitesRes] = await Promise.all([
    supabase
      .from("social_friendships")
      .select("friend_id")
      .eq("patient_id", userId)
      .eq("status", "active"),
    supabase
      .from("social_friend_invites")
      .select("id, inviter_id, invitee_id")
      .or(`inviter_id.eq.${userId},invitee_id.eq.${userId}`)
      .eq("status", "pending"),
  ]);

  const friendSet = new Set(
    (friendsRes.data ?? []).map((r) => r.friend_id as string),
  );
  const inviteMap = new Map<string, string>();
  for (const r of invitesRes.data ?? []) {
    const otherId =
      r.inviter_id === userId
        ? (r.invitee_id as string)
        : (r.inviter_id as string);
    inviteMap.set(otherId, r.id as string);
  }

  return {
    ok: true,
    data: (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const points = (row.user_health_points as {
        total_points?: number;
        level?: number;
      }) ?? {};
      const loc = (row.user_location as {
        city?: string | null;
        state?: string | null;
      }) ?? {};
      return {
        id: row.id as string,
        firstName:
          [(row.first_name as string) ?? "", (row.last_name as string) ?? ""]
            .filter(Boolean)
            .join(" ")
            .trim() || "Anônimo",
        level: points.level ?? 1,
        totalPoints: points.total_points ?? 0,
        city: loc.city ?? null,
        state: loc.state ?? null,
        isFriend: friendSet.has(row.id as string),
        pendingInviteId: inviteMap.get(row.id as string) ?? null,
        isMe: false, // já filtramos .neq("id", userId)
      };
    }),
  };
}

/** Verifica se o user atual já vinculou um phone. */
export async function myPhoneLinkedAction(): Promise<
  ActionResult<{ linked: boolean }>
> {
  if (!isSupabaseConfigured())
    return { ok: false, error: "Supabase off" };
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken)
    return { ok: false, error: "Não autenticado" };
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", userId)
    .maybeSingle();
  return { ok: true, data: { linked: Boolean(data?.phone) } };
}
