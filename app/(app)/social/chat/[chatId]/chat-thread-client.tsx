"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  sendMessageAction,
  markChatReadAction,
} from "../../chat-actions";
import type { ChatDetail, ChatMessage } from "@/lib/social/chat";

/**
 * UI da thread de chat. Polling 5s pra mensagens novas (sem realtime no
 * MVP). Auto-scroll pro fim ao montar e ao receber novas msgs.
 */
export function ChatThreadClient({
  detail,
  myUserId,
}: {
  detail: ChatDetail;
  myUserId: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(detail.messages);
  const [draft, setDraft] = useState("");
  const [, startSending] = useTransition();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Display name: pra DM, pega o outro member; pra grupo, usa name
  const displayName = (() => {
    if (detail.kind === "group") return detail.name ?? "Grupo";
    const other = detail.members.find((m) => m.patientId !== myUserId);
    return other?.firstName ?? "Conversa";
  })();

  // Auto-scroll bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Mark as read on mount
  useEffect(() => {
    markChatReadAction(detail.id).catch(() => {});
  }, [detail.id]);

  // Polling pra mensagens novas (5s) — só GET via fetch pra um endpoint
  // que devolve as últimas N mensagens. Vou fazer via Supabase no server
  // action future. Por ora, MVP sem polling — user precisa recarregar.
  // TODO: implementar quando tiver realtime configurado.

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    startSending(async () => {
      const res = await sendMessageAction(detail.id, text);
      setSending(false);
      if (res.ok && res.data) {
        // Optimistic: adiciona msg local antes de reload
        setMessages((prev) => [
          ...prev,
          {
            id: res.data!.messageId,
            chatId: detail.id,
            senderId: myUserId,
            senderFirstName: "Você",
            body: text,
            createdAt: new Date().toISOString(),
          },
        ]);
        setDraft("");
      } else if (!res.ok) {
        setError(res.error);
      }
    });
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-white">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
        <Link
          href="/social/chats"
          aria-label="Voltar"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-zinc-900">
            {displayName}
          </div>
          <div className="text-[10.5px] text-zinc-500">
            {detail.kind === "group" ? (
              <span className="inline-flex items-center gap-1">
                <Users className="h-2.5 w-2.5" />
                {detail.members.length} membros
              </span>
            ) : (
              "DM"
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center">
            <div className="text-center">
              <div className="text-[40px]" aria-hidden>
                💬
              </div>
              <p className="mt-2 text-[12.5px] text-zinc-500">
                Mande a primeira mensagem
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((m) => {
              const mine = m.senderId === myUserId;
              return (
                <li
                  key={m.id}
                  className={cn(
                    "flex flex-col gap-0.5",
                    mine ? "items-end" : "items-start",
                  )}
                >
                  {!mine && detail.kind === "group" && (
                    <span className="px-1 text-[10.5px] font-medium text-zinc-500">
                      {m.senderFirstName}
                    </span>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-snug",
                      mine
                        ? "bg-brand-700 text-white"
                        : "bg-zinc-100 text-zinc-900",
                    )}
                  >
                    {m.body}
                  </div>
                  <span className="px-1 text-[10px] text-zinc-400">
                    {relativeTime(m.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && (
        <div className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-[12px] text-rose-700">
          {error}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-2 border-t border-zinc-100 bg-white px-4 py-3"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Mensagem…"
          rows={1}
          maxLength={4000}
          className="min-h-[40px] max-h-[120px] min-w-0 flex-1 resize-y rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label="Enviar"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-700 text-white transition hover:bg-brand-800 disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diffSec = Math.floor((now - t) / 1000);
  if (diffSec < 60) return "agora";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
