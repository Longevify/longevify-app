"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { sendFriendInviteAction } from "../../actions";

/**
 * Client component que dispara o invite quando o user clica "Aceitar".
 *
 * Estratégia: o visitante envia um convite PRO dono do link. Quando ele
 * abrir o app, vê o invite na aba Amigos e aceita — aí a amizade fica
 * firme. Mais seguro do que criar amizade direto (evita link "envenenado"
 * adicionando alguém sem o consentimento do dono).
 */
export function InviteAcceptClient({
  inviterUserId,
  inviterFirstName,
}: {
  inviterUserId: string;
  inviterFirstName: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const accept = () => {
    setStatus("sending");
    setError(null);
    startTransition(async () => {
      const res = await sendFriendInviteAction(
        inviterUserId,
        `Convite via link compartilhado`,
      );
      if (res.ok) {
        setStatus("sent");
        // Redireciona pra aba Amigos depois de 1.2s pra mostrar feedback
        setTimeout(() => router.push("/social"), 1200);
      } else {
        setStatus("error");
        setError(res.error);
      }
    });
  };

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-center">
        <div className="grid h-10 w-10 mx-auto place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-5 w-5" />
        </div>
        <p className="mt-3 text-[14px] font-semibold text-emerald-900">
          Convite enviado!
        </p>
        <p className="mt-1 text-[12px] text-emerald-800/80">
          Avisamos {inviterFirstName}. A amizade fica firme assim que aceitar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={accept}
        disabled={status === "sending"}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 px-5 py-3.5 text-[14px] font-semibold text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
      >
        {status === "sending" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando…
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            Aceitar convite
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => router.push("/social")}
        disabled={status === "sending"}
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-5 py-2.5 text-[12.5px] font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" />
        Agora não
      </button>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
}
