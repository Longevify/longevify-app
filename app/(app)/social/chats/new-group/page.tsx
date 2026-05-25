import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { getMyFriends } from "@/lib/social/server";
import { CreateGroupClient } from "./create-group-client";

export const dynamic = "force-dynamic";

/**
 * Lucas (2026-05-24): "tente imitar também o feature de criar grupos
 * que nem no gym rats."
 *
 * Form pra criar grupo: nome + seleciona amigos a adicionar.
 */
export default async function NewGroupPage() {
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
      <h1 className="mt-2 inline-flex items-center gap-2 text-[24px] font-semibold leading-tight tracking-tight">
        <Users className="h-5 w-5 text-brand-700" />
        Novo grupo
      </h1>
      <p className="mt-1 text-[12.5px] text-zinc-500">
        Crie um grupo com seus amigos pra desafios coletivos, treinos em
        conjunto, etc.
      </p>

      <div className="mt-6">
        <CreateGroupClient friends={friends} />
      </div>
    </div>
  );
}
