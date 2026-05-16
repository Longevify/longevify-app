"use client";

import { useCallback, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
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
        {/* Ícone Sparkles do Dr. Lon — Lucas 2026-05 pediu pra tirar
            a foto Pixar e voltar pro ícone anterior. */}
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
          <Sparkles className="h-6 w-6" />
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
