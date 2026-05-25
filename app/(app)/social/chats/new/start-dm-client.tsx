"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle } from "lucide-react";
import { getOrCreateDmAction } from "../../chat-actions";
import type { FriendSummary } from "@/lib/social/server";

export function StartDmClient({ friends }: { friends: FriendSummary[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const startDm = (friendId: string) => {
    setPendingId(friendId);
    setError(null);
    startTransition(async () => {
      const res = await getOrCreateDmAction(friendId);
      if (res.ok && res.data) {
        router.push(`/social/chat/${res.data.chatId}`);
      } else {
        setError(res.ok ? "Erro" : res.error);
        setPendingId(null);
      }
    });
  };

  if (friends.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-10 text-center">
        <MessageCircle className="mx-auto h-8 w-8 text-zinc-300" />
        <h3 className="mt-2 text-[14px] font-semibold text-zinc-700">
          Você ainda não tem amigos
        </h3>
        <p className="mt-1 text-[12px] text-zinc-500">
          Adicione amigos primeiro pra começar a conversar.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {friends.map((f) => (
        <li key={f.patientId}>
          <button
            type="button"
            onClick={() => startDm(f.patientId)}
            disabled={pendingId !== null}
            className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50/30 disabled:opacity-50"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-[14px] font-semibold text-brand-700">
              {f.firstName[0]?.toUpperCase() ?? "?"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold text-zinc-900">
                {f.firstName}
              </div>
              <div className="text-[11px] text-zinc-500">
                Level {f.level}
              </div>
            </div>
            {pendingId === f.patientId && (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-400" />
            )}
          </button>
        </li>
      ))}
      {error && (
        <li className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
          {error}
        </li>
      )}
    </ul>
  );
}
