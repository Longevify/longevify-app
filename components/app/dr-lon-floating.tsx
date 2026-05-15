"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Send, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

// ─── Saudação inicial (mock) ────────────────────────────────────────────────

const INITIAL_GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  text:
    "Oi! Sou o Dr. Lon, sua IA médica Longevify. Posso explicar qualquer biomarcador, sugerir intervenções e conectar com sua equipe humana. Como posso ajudar?",
};

// ─── Sugestões rápidas ──────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  "Como melhorar meu LDL?",
  "Por que minha Vit D está baixa?",
  "Próximos passos do protocolo?",
];

// ─── Mock de resposta IA ────────────────────────────────────────────────────
//
// Em produção, esse fetch vai pro endpoint /api/concierge que chama
// Kimi K2.5 → Claude fallback → rule-based. Por enquanto, resposta
// determinística baseada em keyword pra demo.

function generateFakeResponse(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("ldl") || q.includes("colesterol")) {
    return "Seu LDL está em 103 mg/dL (faixa ótima <100). Ômega 3, redução de gordura saturada e 30g de fibra/dia normalizam em 8–12 semanas. Posso te conectar com a nutricionista?";
  }
  if (q.includes("vit") && q.includes("d")) {
    return "Sua Vit D em 42 ng/dL é insuficiente (ideal 50+). Suplementação de 2.000 UI/dia + 10 min de sol matinal resolvem em ~8 semanas.";
  }
  if (q.includes("próximo") || q.includes("protocolo")) {
    return "Te recomendo focar nessas 3 ações primeiro: 1) Ômega 3 com almoço (LDL), 2) Vit D no café (D), 3) 30 min de Zona 2 (HDL). Quer detalhar alguma?";
  }
  return "Boa pergunta. Pra dar uma resposta completa, abre o Concierge — lá consigo trazer mais contexto dos seus dados e da equipe médica.";
}

// ─── Componente flutuante ───────────────────────────────────────────────────

/**
 * Mini chat flutuante "Dr. Lon" — disponível em todas as abas do app
 * (renderizado em app/(app)/layout.tsx). Pode ser expandido pra conversa
 * rápida ou levar pro Concierge full screen.
 *
 * State é em memória só (não persiste entre páginas). Pra chat persistente
 * use o /concierge.
 */
export function DrLonFloating() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll quando nova mensagem chega
  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    // Mock latency
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: generateFakeResponse(trimmed),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setThinking(false);
    }, 700);
  }, []);

  // Fechado: pill flutuante
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-brand-700 to-brand-800 px-4 py-3 text-[13px] font-semibold text-white shadow-xl shadow-brand-900/30 transition hover:scale-105 hover:shadow-2xl"
        aria-label="Abrir chat com Dr. Lon"
      >
        <span className="relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full ring-2 ring-white/30">
          <Image
            src="/dr-lon-avatar.webp"
            alt="Dr. Lon"
            width={28}
            height={28}
            className="h-7 w-7 object-cover"
          />
        </span>
        <span>Dr. Lon</span>
      </button>
    );
  }

  // Aberto: painel chat (320x450 desktop, full-width bottom mobile)
  return (
    <div className="fixed bottom-0 right-0 z-40 w-full p-4 sm:bottom-6 sm:right-6 sm:w-[360px] sm:p-0">
      <div
        className={cn(
          "flex h-[480px] flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl",
          "max-h-[80vh]",
        )}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-100 bg-gradient-to-br from-brand-700 to-brand-800 px-4 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full ring-2 ring-white/30">
              <Image
                src="/dr-lon-avatar.webp"
                alt="Dr. Lon"
                width={40}
                height={40}
                className="h-10 w-10 object-cover"
              />
            </span>
            <div>
              <div className="text-[13px] font-semibold leading-tight">
                Dr. Lon
              </div>
              <div className="text-[10.5px] text-white/70">Online · IA médica</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-7 w-7 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-zinc-50/50 px-3 py-4">
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <li
                key={m.id}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed",
                    m.role === "user"
                      ? "bg-brand-700 text-white"
                      : "bg-white text-zinc-800 shadow-sm",
                  )}
                >
                  {m.text}
                </div>
              </li>
            ))}
            {thinking && (
              <li className="flex justify-start">
                <div className="rounded-2xl bg-white px-3.5 py-2.5 shadow-sm">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
                  </div>
                </div>
              </li>
            )}
            <div ref={messagesEndRef} />
          </ul>

          {/* Sugestões iniciais (só quando ainda não conversou) */}
          {messages.length === 1 && !thinking && (
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => sendMessage(p)}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-700 transition hover:border-brand-300 hover:bg-brand-50"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input + continue-no-concierge */}
        <div className="border-t border-zinc-100 bg-white px-3 py-2.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte algo..."
              className="flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              aria-label="Enviar"
              className="grid h-9 w-9 place-items-center rounded-full bg-brand-700 text-white transition hover:bg-brand-800 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
          <Link
            href="/concierge"
            className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-medium text-brand-700 transition hover:text-brand-800"
          >
            Continuar no Concierge
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
