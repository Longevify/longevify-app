"use client";

import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ChatWindow } from "@/components/concierge/chat-window";
import type { ChatMessage } from "@/components/concierge/message-bubble";

const SUGGESTIONS = [
  "Por que meu LDL está alto?",
  "Como melhorar meu sono?",
  "Minha tireoide está ok?",
  "O que a idade biológica 25 significa?",
  "Quais suplementos me ajudam mais?",
  "Meu score pode chegar a 90?",
];

const INITIAL_GREETING: ChatMessage = {
  id: "assistant-initial",
  role: "assistant",
  content:
    "Oi João! Seus últimos exames mostraram um Longevify Score 70 (On Track) e idade biológica 25 — 2 anos mais jovem que a cronológica. O principal marcador fora da faixa ideal é o LDL (103 mg/dL). O que você quer olhar primeiro?",
};

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ConciergePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: ChatMessage = {
        id: nextId("u"),
        role: "user",
        content: text.trim(),
      };
      const assistantId = nextId("a");
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      const historyForApi = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      setStreamingId(assistantId);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: historyForApi }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`api error ${res.status}`);
        }

        const contentType = res.headers.get("content-type") ?? "";

        if (contentType.includes("application/json")) {
          const data = (await res.json()) as { content?: string };
          const full = data.content ?? "";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: full } : m,
            ),
          );
        } else {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let acc = "";
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            acc += decoder.decode(value, { stream: true });
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: acc } : m,
              ),
            );
          }
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    "Tive um problema momentâneo pra responder. Tenta reformular a pergunta ou reenviar em alguns segundos.",
                }
              : m,
          ),
        );
      } finally {
        setIsStreaming(false);
        setStreamingId(null);
      }
    },
    [isStreaming, messages],
  );

  const suggestions = useMemo(() => SUGGESTIONS, []);

  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] w-full max-w-[900px] flex-col px-6 py-8">
      <header className="pb-6">
        <span className="text-[13px] text-muted">
          Seu copiloto de longevidade — pergunte sobre seus resultados
        </span>
        <h1 className="text-[32px] font-semibold tracking-tight">Concierge</h1>
      </header>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <ChatWindow
          messages={messages}
          onSend={send}
          isStreaming={isStreaming}
          streamingId={streamingId}
          suggestions={suggestions}
        />
      </Card>
    </div>
  );
}
