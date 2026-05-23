import { redirect } from "next/navigation";
import { Trophy, MapPin } from "lucide-react";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { getProfileById } from "@/lib/social/server";
import { InviteAcceptClient } from "./client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Landing page de convite por link.
 *
 * URL: /social/invite/<inviterUserId>
 *
 * Quem abrir esse link vê o perfil resumido do inviter e um botão grande
 * "Aceitar convite". Ao clicar, dispara um sendFriendInviteAction com o
 * inviterUserId como invitee — ou seja, eu (visitante) estou enviando um
 * convite de volta pra ele. A action detecta que ele não me convidou
 * formalmente ainda e cria o invite. Quando ELE entrar no app e ver
 * incoming invites, vai aceitar e a amizade fica firme.
 *
 * Alternativa mais direta: criar amizade de cara aqui. Mas é melhor passar
 * pelo invite pendente — assim o inviter (dono do link) confirma que quis
 * mesmo virar amigo do visitante.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: inviterUserId } = await params;
  const { userId: myUserId } = await getUserIdFromCookie();

  if (!myUserId) {
    // Não logado — redireciona pra login com return-url
    redirect(`/login?redirect=/social/invite/${inviterUserId}`);
  }

  if (myUserId === inviterUserId) {
    // Tentando aceitar próprio link
    redirect("/social?tab=friends");
  }

  const inviter = await getProfileById(inviterUserId);
  if (!inviter) {
    return (
      <div className="mx-auto w-full max-w-[520px] px-4 py-10 text-center">
        <h1 className="text-[20px] font-semibold text-zinc-900">
          Convite inválido
        </h1>
        <p className="mt-2 text-[13px] text-zinc-600">
          Esse link de convite não existe ou expirou.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[520px] px-4 py-10 sm:py-14">
      <section className="overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 text-white shadow-md">
        <div className="px-6 py-7 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-white/85">
            <Trophy className="h-3 w-3" />
            Convite Longevify
          </span>
          <div className="mt-5 grid h-20 w-20 mx-auto place-items-center rounded-full bg-white/15 ring-2 ring-white/30 text-[32px] font-semibold">
            {inviter.firstName[0]?.toUpperCase() ?? "?"}
          </div>
          <h1 className="mt-4 text-[22px] font-semibold leading-tight tracking-tight">
            {inviter.firstName}
          </h1>
          <p className="mt-1 text-[13px] text-white/80">
            quer ser seu amigo no Longevify
          </p>
          <div className="mt-3 flex justify-center gap-4 text-[11px] text-white/70">
            <span>Level {inviter.level}</span>
            <span>·</span>
            <span className="tabular-nums">
              {inviter.totalPoints.toLocaleString("pt-BR")} pontos
            </span>
          </div>
        </div>
      </section>

      <div className="mt-5">
        <InviteAcceptClient
          inviterUserId={inviterUserId}
          inviterFirstName={inviter.firstName}
        />
      </div>

      <p className="mt-6 px-2 text-center text-[11.5px] leading-relaxed text-zinc-500">
        <MapPin className="-mt-0.5 mr-1 inline h-3 w-3" />
        Ao aceitar, vocês vão aparecer no feed e ranking um do outro. Você
        pode remover a amizade a qualquer momento.
      </p>
    </div>
  );
}
