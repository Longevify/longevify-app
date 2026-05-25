import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { getMyFriends } from "@/lib/social/server";
import { StartDmClient } from "./start-dm-client";

export const dynamic = "force-dynamic";

/**
 * Picker pra iniciar DM com um amigo. Selecionar → cria (ou reusa) DM →
 * redireciona pra thread.
 */
export default async function NewChatPage() {
  const { userId } = await getUserIdFromCookie();
  if (!userId) redirect("/login");

  const friends = await getMyFriends();

  return (
    <div className="mx-auto w-full max-w-[520px] px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/social/chats"
        className="inline-flex items-center gap-1 text-[12px] text-zinc-500 hover:text-brand-700"
      >
        <ArrowLeft className="h-3 w-3" />
        Conversas
      </Link>
      <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight">
        Nova conversa
      </h1>
      <p className="mt-1 text-[12.5px] text-zinc-500">
        Escolha um amigo pra começar a conversar.
      </p>

      <div className="mt-6">
        <StartDmClient friends={friends} />
      </div>
    </div>
  );
}
