"use client";

import { useEffect, useRef } from "react";
import { MessageBubble, type ChatMessage } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { SuggestionPills } from "./suggestion-pills";

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isStreaming: boolean;
  streamingId: string | null;
  suggestions: string[];
}

export function ChatWindow({
  messages,
  onSend,
  isStreaming,
  streamingId,
  suggestions,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const showSuggestions = messages.length <= 1;

  return (
    <div className="flex h-full flex-col">
      {/*
        Empty state (só a saudação): messages div ocupa todo o espaço
        disponível com flex-1 e centraliza vertical (justify-center) — a
        saudação fica no MEIO do card em vez de colada no topo com vazio
        abaixo. Pills + input ficam ancorados no fundo do card.

        Conversa em andamento: flex-1 + overflow-y-auto pra scroll normal.
        Pills somem (showSuggestions=false), só o input fica no fundo.
      */}
      <div
        ref={scrollRef}
        className={
          showSuggestions
            ? "flex flex-1 flex-col justify-center space-y-5 px-6 py-6"
            : "flex-1 space-y-5 overflow-y-auto px-6 py-6"
        }
      >
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            streaming={isStreaming && m.id === streamingId}
          />
        ))}
      </div>

      {/* H7: pb-safe-area garante que o input fique acima da home indicator no iPhone */}
      <div className="space-y-3 border-t border-border/70 bg-white/70 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {showSuggestions ? (
          <SuggestionPills
            suggestions={suggestions}
            onPick={onSend}
            disabled={isStreaming}
          />
        ) : null}
        <ChatInput onSend={onSend} disabled={isStreaming} />
      </div>
    </div>
  );
}
