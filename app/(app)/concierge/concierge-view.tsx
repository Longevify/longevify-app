"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
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

interface ConciergeViewProps {
  addressName: string | null;
}

function buildInitialGreeting(addressName: string | null): ChatMessage {
  // Saudação curta e neutra, usando o nome real do user. NUNCA usa
  // dados mocados de score/biomarcadores que podem não corresponder
  // à conta logada — esses só aparecem se o user perguntar e o LLM
  // tiver os dados reais do contexto.
  const greeting = addressName
    ? `Oi ${addressName}, eu sou o Dr. Lon — seu copiloto de longevidade. Pode me perguntar sobre seus exames, protocolo, hábitos, sono — o que for útil pra ti.`
    : "Oi! Eu sou o Dr. Lon — seu copiloto de longevidade. Pode me perguntar sobre seus exames, protocolo, hábitos, sono — o que for útil pra ti.";
  return {
    id: "assistant-initial",
    role: "assistant",
    content: greeting,
  };
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ConciergeView({ addressName }: ConciergeViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    buildInitialGreeting(addressName),
  ]);
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

  // H7: dvh garante que o cálculo ignore a barra do browser em iOS
  return (
    <div className="mx-auto flex h-[calc(100dvh-64px)] w-full max-w-[900px] flex-col px-6 py-8">
      <header className="flex items-center gap-4 pb-6">
        {/* Avatar Dr. Lon — sua identidade visual do Concierge */}
        <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full ring-2 ring-brand-100 shadow-sm">
          <Image
            src="/dr-lon-avatar.webp"
            alt="Dr. Lon"
            width={56}
            height={56}
            className="h-14 w-14 object-cover"
            priority
          />
          <span className="absolute right-0.5 bottom-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
        </span>
        <div>
          <span className="text-[13px] text-muted">
            Seu copiloto de longevidade — pergunte sobre seus resultados
          </span>
          <h1 className="text-[32px] font-semibold tracking-tight">
            Concierge
          </h1>
        </div>
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
