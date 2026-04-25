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
      <div
        ref={scrollRef}
        className="flex-1 space-y-5 overflow-y-auto px-6 py-6"
      >
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            streaming={isStreaming && m.id === streamingId}
          />
        ))}
      </div>

      <div className="space-y-3 border-t border-border/70 bg-white/70 px-4 py-4">
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
