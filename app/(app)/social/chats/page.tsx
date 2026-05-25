import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, ArrowLeft, Plus } from "lucide-react";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { getMyChats } from "@/lib/social/chat";
import { getMyFriends } from "@/lib/social/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Lista de chats do user. Cada item leva pra /social/chat/[chatId]
 * com a thread completa.
 */
export default async function ChatsPage() {
  const { userId } = await getUserIdFromCookie();
  if (!userId) redirect("/login");

  const [chats, friends] = await Promise.all([
    getMyChats(),
    getMyFriends(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/social"
        className="inline-flex items-center gap-1 text-[12px] text-zinc-500 hover:text-brand-700"
      >
        <ArrowLeft className="h-3 w-3" />
        Voltar pra Social
      </Link>
      <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight">
        Conversas
      </h1>
      <p className="mt-1 text-[13px] text-zinc-500">
        DMs com amigos e grupos.
      </p>

      <div className="mt-6 flex gap-2">
        <Link
          href="/social/chats/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Nova conversa
        </Link>
        <Link
          href="/social/chats/new-group"
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo grupo
        </Link>
      </div>

      <section className="mt-6">
        {chats.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-10 text-center">
            <MessageCircle className="mx-auto h-8 w-8 text-zinc-300" />
            <h3 className="mt-2 text-[14px] font-semibold text-zinc-700">
              Nenhuma conversa ainda
            </h3>
            <p className="mt-1 text-[12px] text-zinc-500">
              {friends.length === 0
                ? "Adicione amigos primeiro pra começar a conversar."
                : "Inicie um DM com um amigo ou crie um grupo."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {chats.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/social/chat/${c.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-brand-300 hover:bg-brand-50/30"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-100 text-[16px] font-semibold text-brand-700">
                    {c.initial}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-semibold text-zinc-900">
                        {c.displayName}
                      </span>
                      {c.kind === "group" && (
                        <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-zinc-600">
                          Grupo · {c.memberCount}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-zinc-500">
                      {c.lastMessage ?? "Sem mensagens ainda"}
                    </p>
                  </div>
                  {c.hasUnread && (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
