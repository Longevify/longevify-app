"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Cria (ou reusa) um DM 1-on-1 com outro user. Idempotente: se já existe
 * DM entre us dois, retorna esse.
 */
export async function getOrCreateDmAction(
  otherUserId: string,
): Promise<ActionResult<{ chatId: string }>> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase off" };
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken)
    return { ok: false, error: "Não autenticado" };
  if (otherUserId === userId)
    return { ok: false, error: "Você não pode conversar consigo mesmo." };

  const supabase = await createSupabaseWithJwt(accessToken);

  // Tem que ser amigo (regra de negócio: DM só entre amigos pra evitar spam)
  const { data: friendship } = await supabase
    .from("social_friendships")
    .select("patient_id")
    .eq("patient_id", userId)
    .eq("friend_id", otherUserId)
    .eq("status", "active")
    .maybeSingle();
  if (!friendship)
    return { ok: false, error: "Vocês precisam ser amigos pra conversar." };

  // Já existe DM entre nós?
  // Estratégia: busca chats kind='dm' onde sou member, depois filtra pelos
  // que TAMBÉM têm o other user como member.
  const { data: myDms } = await supabase
    .from("social_chat_members")
    .select("chat_id, social_chats!inner(id, kind)")
    .eq("patient_id", userId);

  const dmChatIds = (myDms ?? [])
    .filter((r) => {
      const chat = (r as { social_chats?: { kind?: string } }).social_chats;
      return chat?.kind === "dm";
    })
    .map((r) => r.chat_id as string);

  if (dmChatIds.length > 0) {
    const { data: otherInDms } = await supabase
      .from("social_chat_members")
      .select("chat_id")
      .eq("patient_id", otherUserId)
      .in("chat_id", dmChatIds);

    const existingDmId = otherInDms?.[0]?.chat_id as string | undefined;
    if (existingDmId) {
      return { ok: true, data: { chatId: existingDmId } };
    }
  }

  // Cria novo DM
  const { data: newChat, error: createErr } = await supabase
    .from("social_chats")
    .insert({
      kind: "dm",
      created_by: userId,
    })
    .select("id")
    .single();

  if (createErr || !newChat)
    return { ok: false, error: createErr?.message ?? "Erro criando chat" };

  // Adiciona os 2 members (eu como owner, outro como member)
  const { error: memberErr } = await supabase
    .from("social_chat_members")
    .insert([
      { chat_id: newChat.id, patient_id: userId, role: "owner" },
      { chat_id: newChat.id, patient_id: otherUserId, role: "member" },
    ]);

  if (memberErr) {
    return { ok: false, error: memberErr.message };
  }

  revalidatePath("/social");
  return { ok: true, data: { chatId: newChat.id as string } };
}

/**
 * Cria grupo de chat (estilo Gym Rats). Lucas adiciona-se como owner, +
 * lista inicial de members (precisa ser amigos).
 */
export async function createGroupChatAction(
  name: string,
  memberIds: string[],
): Promise<ActionResult<{ chatId: string }>> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase off" };
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken)
    return { ok: false, error: "Não autenticado" };
  if (!name.trim() || name.trim().length < 3)
    return { ok: false, error: "Nome do grupo precisa ter ao menos 3 letras." };
  if (memberIds.length === 0)
    return { ok: false, error: "Adicione ao menos 1 amigo." };

  const supabase = await createSupabaseWithJwt(accessToken);

  // Verifica que todos os memberIds são amigos
  const { data: myFriends } = await supabase
    .from("social_friendships")
    .select("friend_id")
    .eq("patient_id", userId)
    .eq("status", "active");
  const friendSet = new Set((myFriends ?? []).map((r) => r.friend_id as string));
  for (const mid of memberIds) {
    if (!friendSet.has(mid)) {
      return { ok: false, error: "Você só pode adicionar amigos ao grupo." };
    }
  }

  // Cria chat
  const { data: chat, error: chatErr } = await supabase
    .from("social_chats")
    .insert({
      kind: "group",
      name: name.trim(),
      created_by: userId,
    })
    .select("id")
    .single();
  if (chatErr || !chat)
    return { ok: false, error: chatErr?.message ?? "Erro criando grupo" };

  // Adiciona todos os members
  const rows = [
    { chat_id: chat.id, patient_id: userId, role: "owner" as const },
    ...memberIds.map((m) => ({
      chat_id: chat.id,
      patient_id: m,
      role: "member" as const,
    })),
  ];
  const { error: memberErr } = await supabase
    .from("social_chat_members")
    .insert(rows);
  if (memberErr) {
    return { ok: false, error: memberErr.message };
  }

  revalidatePath("/social");
  return { ok: true, data: { chatId: chat.id as string } };
}

/** Envia mensagem. Trigger no DB atualiza last_message_at do chat. */
export async function sendMessageAction(
  chatId: string,
  body: string,
): Promise<ActionResult<{ messageId: string }>> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase off" };
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken)
    return { ok: false, error: "Não autenticado" };

  const text = body.trim();
  if (!text) return { ok: false, error: "Mensagem vazia." };
  if (text.length > 4000) return { ok: false, error: "Mensagem muito longa." };

  const supabase = await createSupabaseWithJwt(accessToken);
  const { data, error } = await supabase
    .from("social_chat_messages")
    .insert({
      chat_id: chatId,
      sender_id: userId,
      body: text,
    })
    .select("id")
    .single();

  if (error || !data)
    return { ok: false, error: error?.message ?? "Erro enviando" };

  revalidatePath(`/social/chat/${chatId}`);
  return { ok: true, data: { messageId: data.id as string } };
}

/** Marca chat como lido. */
export async function markChatReadAction(
  chatId: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase off" };
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken)
    return { ok: false, error: "Não autenticado" };
  const supabase = await createSupabaseWithJwt(accessToken);
  const { error } = await supabase
    .from("social_chat_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("chat_id", chatId)
    .eq("patient_id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Sai de um chat (deleta o member row). */
export async function leaveChatAction(
  chatId: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase off" };
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken)
    return { ok: false, error: "Não autenticado" };
  const supabase = await createSupabaseWithJwt(accessToken);
  const { error } = await supabase
    .from("social_chat_members")
    .delete()
    .eq("chat_id", chatId)
    .eq("patient_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/social");
  return { ok: true };
}
