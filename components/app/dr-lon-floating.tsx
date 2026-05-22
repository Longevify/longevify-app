"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Send, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Storage key compartilhado com Concierge view — Dr. Lon floating grava
 * o histórico de chat aqui ao clicar "Continuar no Concierge", e o
 * /concierge consome no mount, limpando depois. Mantém continuidade
 * conversacional sem precisar de backend.
 */
export const DR_LON_HANDOFF_STORAGE_KEY = "longevify.drlon.handoff";

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
    "Oi! Sou o Dr. Lon — assistente de IA da Longevify. Não sou médico humano, sou uma inteligência artificial para te ajudar a entender seus dados de longevidade (não substituo consulta médica). Pergunta o que quiser sobre seus biomarcadores ou hábitos.",
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
    return "Sua Vit D em 42 ng/mL está suficiente (Endocrine Society ≥30) mas abaixo da faixa longevity-style (40–60). Suplementação de 2.000 UI/dia + exposição solar moderada costuma elevar 5–10 ng/mL em ~8 semanas. Reavalia o nível antes de subir dose. (Lembrando: sou IA — confirma com seu médico.)";
  }
  if (q.includes("próximo") || q.includes("protocolo")) {
    return "Te recomendo focar nessas 3 ações primeiro: 1) Ômega 3 com almoço (LDL), 2) Vit D no café (D), 3) 30 min de Zona 2 (HDL). Quer detalhar alguma?";
  }
  return "Boa pergunta. Pra dar uma resposta completa, abre o Concierge — lá consigo trazer mais contexto dos seus dados. (Lembrando: sou IA — pra decisão clínica concreta, fale com seu médico.)";
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  // Lucas (2026-05-20): "o widget flutuante do Dr Lon deve desaparecer,
  // enquanto aba 'mais' do footer do app estiver aberta." Escuta o
  // custom event que BottomNav emite quando MoreSheet abre/fecha.
  const [hiddenByBottomSheet, setHiddenByBottomSheet] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * Lucas (2026-05-21): "ao clicar no botão pequeno Dr Lon (Widget no
   * canto inferior da tela), quero que apareça um botão para continuar
   * a conversa na aba do concierge."
   *
   * Grava o histórico (convertido pra shape do Concierge: text → content)
   * em sessionStorage e navega pra /concierge — onde a view consome
   * e limpa. Mantém continuidade conversacional sem backend.
   */
  const handoffToConcierge = useCallback(() => {
    try {
      const handoff = messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.text,
      }));
      window.sessionStorage.setItem(
        DR_LON_HANDOFF_STORAGE_KEY,
        JSON.stringify(handoff),
      );
    } catch {
      // Silent — vai abrir Concierge com saudação default, não é fatal.
    }
    setOpen(false);
    router.push("/concierge");
  }, [messages, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { open?: boolean };
      setHiddenByBottomSheet(Boolean(detail?.open));
    };
    window.addEventListener("longevify:bottom-sheet-toggle", handler);
    return () =>
      window.removeEventListener("longevify:bottom-sheet-toggle", handler);
  }, []);

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

  // Esconde completamente quando o sheet "Mais" do bottom-nav está aberto
  // — evita sobreposição visual em mobile.
  if (hiddenByBottomSheet) return null;

  // Fechado: pill flutuante
  if (!open) {
    return (
      <button
        type="button"
        data-tour="dr-lon-button"
        onClick={() => setOpen(true)}
        // Em mobile, fica acima do bottom-nav (h-14 + safe-area).
        // Em desktop (sm+), bottom-6 normal.
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 72px)",
        }}
        className="fixed right-4 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-brand-700 to-brand-800 px-4 py-3 text-[13px] font-semibold text-white shadow-xl shadow-brand-900/30 transition hover:scale-105 hover:shadow-2xl sm:!bottom-6 sm:right-6"
        aria-label="Abrir chat com Dr. Lon"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15 ring-2 ring-white/30">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span>Dr. Lon</span>
      </button>
    );
  }

  // Aberto: painel chat (320x450 desktop, full-width bottom mobile).
  // Em mobile, sobe pra cima do bottom-nav (h-14 + safe-area).
  return (
    <div
      className="fixed inset-x-0 z-40 w-full p-4 sm:inset-x-auto sm:right-6 sm:w-[360px] sm:p-0"
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 64px)",
      }}
    >
      <div
        className={cn(
          "flex h-[480px] flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl",
          "max-h-[80vh]",
        )}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-100 bg-gradient-to-br from-brand-700 to-brand-800 px-4 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 ring-2 ring-white/30">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <div className="text-[13px] font-semibold leading-tight">
                Dr. Lon
              </div>
              <div className="text-[10.5px] text-white/70">Assistente de IA · não substitui consulta médica</div>
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
          {/* Lucas (2026-05-21): botão (não mais link tímido) que leva
              pro Concierge LEVANDO o histórico do chat junto. */}
          <button
            type="button"
            onClick={handoffToConcierge}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-brand-700 to-brand-800 px-4 py-2 text-[12.5px] font-semibold text-white shadow-sm transition hover:from-brand-800 hover:to-brand-900 active:scale-[0.99]"
          >
            Continuar no Concierge
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
