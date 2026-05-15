"use client";

import Image from "next/image";
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
 * Dr. Lon à esquerda com avatar (mesma foto Pixar usada no flutuante e
 * header — Lucas 2026-05: "tem lugares que o Dr Lon ta de um jeito e
 * tem outros lugares que o Dr Lon ta de outro jeito" → padronizado).
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
        className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-brand-100 shadow-[0_1px_2px_rgba(13,40,24,.12)]"
        aria-hidden
      >
        <Image
          src="/dr-lon-avatar.webp"
          alt="Dr. Lon"
          width={32}
          height={32}
          className="h-8 w-8 object-cover"
        />
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
