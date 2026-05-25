import { notFound, redirect } from "next/navigation";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { getChatDetail } from "@/lib/social/chat";
import { ChatThreadClient } from "./chat-thread-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Thread de chat. Server-side puxa últimas mensagens, client renderiza
 * + faz polling pra novas (5s interval — sem realtime no MVP).
 */
export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  const { userId } = await getUserIdFromCookie();
  if (!userId) redirect("/login");

  const detail = await getChatDetail(chatId);
  if (!detail) notFound();

  // RLS já verifica que sou member, mas double-check pro client
  const isMember = detail.members.some((m) => m.patientId === userId);
  if (!isMember) notFound();

  return <ChatThreadClient detail={detail} myUserId={userId} />;
}
