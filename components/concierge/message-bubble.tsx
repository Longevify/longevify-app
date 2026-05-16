"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  message: ChatMessage;
  streaming?: boolean;
}

/**
 * Bubble do chat Concierge. Mensagens do user à direita (verde escuro);
 * Dr. Lon à esquerda com ícone Sparkles (Lucas 2026-05: tirou a foto Pixar
 * do Dr. Lon e pediu pra voltar pro estado anterior).
 */
export function MessageBubble({ message, streaming }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] rounded-2xl bg-brand-900 px-4 py-2.5 text-[14px] leading-relaxed text-white whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          "bg-brand-500 text-white shadow-[0_1px_2px_rgba(13,40,24,.12)]",
        )}
        aria-hidden
      >
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[11px] font-medium text-muted">Dr. Lon</span>
        <div
          className={cn(
            "max-w-[92%] rounded-2xl bg-brand-50 px-4 py-2.5 text-[14px] leading-relaxed text-ink",
            "whitespace-pre-wrap break-words",
          )}
        >
          {message.content}
          {streaming && message.content.length === 0 ? (
            <TypingDots />
          ) : streaming ? (
            <span className="ml-0.5 inline-block h-[14px] w-[2px] translate-y-[2px] animate-pulse bg-brand-700" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span
      aria-label="Dr. Lon está digitando"
      className="inline-flex items-center gap-1"
    >
      <Dot delay="0ms" />
      <Dot delay="180ms" />
      <Dot delay="360ms" />
    </span>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-brand-600 animate-bounce"
      style={{ animationDelay: delay }}
    />
  );
}
