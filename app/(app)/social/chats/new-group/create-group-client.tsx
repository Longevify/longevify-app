"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createGroupChatAction } from "../../chat-actions";
import type { FriendSummary } from "@/lib/social/server";

export function CreateGroupClient({ friends }: { friends: FriendSummary[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = () => {
    setCreating(true);
    setError(null);
    startTransition(async () => {
      const res = await createGroupChatAction(name, [...selected]);
      if (res.ok && res.data) {
        router.push(`/social/chat/${res.data.chatId}`);
      } else {
        setError(res.ok ? "Erro" : res.error);
        setCreating(false);
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Nome do grupo
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Squad da hipertrofia"
          maxLength={60}
          className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Adicionar amigos · {selected.size} selecionado{selected.size === 1 ? "" : "s"}
        </label>
        {friends.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-6 text-center text-[12px] text-zinc-500">
            Você ainda não tem amigos. Adicione antes de criar um grupo.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {friends.map((f) => {
              const isSelected = selected.has(f.patientId);
              return (
                <li key={f.patientId}>
                  <button
                    type="button"
                    onClick={() => toggle(f.patientId)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                      isSelected
                        ? "border-brand-300 bg-brand-50/60"
                        : "border-zinc-200 bg-white hover:bg-zinc-50",
                    )}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-[13px] font-semibold text-brand-700">
                      {f.firstName[0]?.toUpperCase() ?? "?"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-zinc-900">
                        {f.firstName}
                      </div>
                      <div className="text-[10.5px] text-zinc-500">
                        Level {f.level}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-700 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={creating || !name.trim() || selected.size === 0}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 px-5 py-3 text-[14px] font-semibold text-white shadow-md transition disabled:opacity-50"
      >
        {creating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Criando…
          </>
        ) : (
          <>
            Criar grupo · {selected.size} amigo
            {selected.size === 1 ? "" : "s"}
          </>
        )}
      </button>
    </div>
  );
}
