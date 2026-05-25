import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";

/**
 * Lucas (2026-05-24): "crie a opção de conversar com as pessoas e tente
 * imitar também o feature de criar grupos que nem no gym rats."
 *
 * DMs (chats 1-on-1) + grupos. Schema em supabase/migrations/0022.
 */

export interface ChatSummary {
  id: string;
  kind: "dm" | "group";
  /** Nome do chat. Pra DM = nome do outro participante. Pra grupo = nome custom. */
  displayName: string;
  /** Avatar inicial (primeira letra do displayName). */
  initial: string;
  /** Última mensagem (ou null se vazio). */
  lastMessage: string | null;
  lastMessageAt: string;
  /** Quantos members. Pra DM sempre 2. */
  memberCount: number;
  /** Se há mensagens novas desde a última leitura. */
  hasUnread: boolean;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderFirstName: string;
  body: string;
  createdAt: string;
}

export interface ChatDetail {
  id: string;
  kind: "dm" | "group";
  name: string | null;
  avatarUrl: string | null;
  createdBy: string;
  members: Array<{
    patientId: string;
    firstName: string;
    role: "owner" | "admin" | "member";
  }>;
  messages: ChatMessage[];
}

/** Lista chats onde eu sou member, ordenados por última atividade. */
export async function getMyChats(): Promise<ChatSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);

  // Pega chats onde sou member
  const { data: memberships } = await supabase
    .from("social_chat_members")
    .select("chat_id, last_read_at")
    .eq("patient_id", userId);

  const chatIds = (memberships ?? []).map((r) => r.chat_id as string);
  if (chatIds.length === 0) return [];

  const lastReadByChat = new Map<string, string>();
  for (const m of memberships ?? []) {
    lastReadByChat.set(
      m.chat_id as string,
      (m.last_read_at as string) ?? new Date(0).toISOString(),
    );
  }

  const { data: chats } = await supabase
    .from("social_chats")
    .select("id, kind, name, last_message_at")
    .in("id", chatIds)
    .order("last_message_at", { ascending: false });

  if (!chats) return [];

  // Pra cada chat carregar: members (pra resolver display name de DM) +
  // última mensagem.
  const enriched: ChatSummary[] = [];
  for (const c of chats) {
    const { data: members } = await supabase
      .from("social_chat_members")
      .select(
        `patient_id, profiles!social_chat_members_patient_id_fkey(first_name)`,
      )
      .eq("chat_id", c.id);

    const memberList = (members ?? []).map((m) => {
      const prof = (m as { profiles?: { first_name?: string } }).profiles;
      return {
        patientId: m.patient_id as string,
        firstName: prof?.first_name ?? "Anônimo",
      };
    });

    let displayName: string;
    if (c.kind === "dm") {
      const other = memberList.find((m) => m.patientId !== userId);
      displayName = other?.firstName ?? "DM";
    } else {
      displayName = (c.name as string) ?? "Grupo";
    }

    // Última mensagem
    const { data: lastMsg } = await supabase
      .from("social_chat_messages")
      .select("body, created_at")
      .eq("chat_id", c.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastMsgAt = (c.last_message_at as string) ?? new Date(0).toISOString();
    const lastReadAt = lastReadByChat.get(c.id as string) ?? new Date(0).toISOString();

    enriched.push({
      id: c.id as string,
      kind: c.kind as "dm" | "group",
      displayName,
      initial: displayName[0]?.toUpperCase() ?? "?",
      lastMessage: (lastMsg?.body as string | null) ?? null,
      lastMessageAt: lastMsgAt,
      memberCount: memberList.length,
      hasUnread: new Date(lastMsgAt) > new Date(lastReadAt),
    });
  }

  return enriched;
}

/** Detalhes de um chat + últimas N mensagens. */
export async function getChatDetail(
  chatId: string,
  messageLimit = 100,
): Promise<ChatDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return null;
  const supabase = await createSupabaseWithJwt(accessToken);

  const { data: chat } = await supabase
    .from("social_chats")
    .select("id, kind, name, avatar_url, created_by")
    .eq("id", chatId)
    .maybeSingle();
  if (!chat) return null;

  const { data: members } = await supabase
    .from("social_chat_members")
    .select(
      `patient_id, role, profiles!social_chat_members_patient_id_fkey(first_name)`,
    )
    .eq("chat_id", chatId);

  const memberList = (members ?? []).map((m) => {
    const prof = (m as { profiles?: { first_name?: string } }).profiles;
    return {
      patientId: m.patient_id as string,
      firstName: prof?.first_name ?? "Anônimo",
      role: (m.role as "owner" | "admin" | "member") ?? "member",
    };
  });

  const { data: messages } = await supabase
    .from("social_chat_messages")
    .select(
      `id, chat_id, sender_id, body, created_at,
       profiles!social_chat_messages_sender_id_fkey(first_name)`,
    )
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .limit(messageLimit);

  const messageList: ChatMessage[] = (messages ?? []).map((m) => {
    const prof = (m as { profiles?: { first_name?: string } }).profiles;
    return {
      id: m.id as string,
      chatId: m.chat_id as string,
      senderId: m.sender_id as string,
      senderFirstName: prof?.first_name ?? "Anônimo",
      body: m.body as string,
      createdAt: m.created_at as string,
    };
  });

  return {
    id: chat.id as string,
    kind: chat.kind as "dm" | "group",
    name: (chat.name as string | null) ?? null,
    avatarUrl: (chat.avatar_url as string | null) ?? null,
    createdBy: chat.created_by as string,
    members: memberList,
    messages: messageList,
  };
}
