"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Copy, Check, MessageCircle, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Modal de convite — disparado pelo botão "Convidar" no top-nav. Lucas
 * 2026-05: "o botão convidar não está funcionando, faça funcionar".
 *
 * Comportamento:
 *   - Mensagem de convite editável (com texto padrão útil)
 *   - Link de referral (mock: app URL + ?ref=USER — futuramente vira código real
 *     de programa de indicação)
 *   - 3 botões de share: WhatsApp, Email, Copiar
 *   - Promessa: "Quando seu indicado fizer a primeira coleta, você ganha
 *     1 mês de Concierge grátis"
 *
 * Programa de indicação real: tabela `referrals` no Supabase + atribuição
 * via cookie no signup — V2.
 */

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  /** Nome do user logado, usado no texto padrão do convite */
  inviterName?: string | null;
  /** Code único do user pra tracking. Default: derivado do nome */
  inviteCode?: string;
}

const APP_URL = "https://app.longevify.com.br";
const DEFAULT_MESSAGE = (firstName: string | null | undefined, link: string) =>
  `Oi! ${firstName ? firstName : ""} aqui — comecei a usar a Longevify pra acompanhar saúde e longevidade de verdade (biomarcadores, idade biológica, protocolo personalizado, médico IA 24/7). Tô gostando muito. Se quiser testar, usa meu link:\n\n${link}\n\nQuando você fizer a primeira coleta, a gente dois ganha 1 mês grátis de Concierge.`;

export function InviteModal({
  open,
  onClose,
  inviterName,
  inviteCode,
}: InviteModalProps) {
  const code = inviteCode ?? slugifyName(inviterName) ?? "amigo";
  const link = `${APP_URL}?ref=${code}`;
  const [message, setMessage] = useState(() =>
    DEFAULT_MESSAGE(inviterName, link),
  );
  const [copied, setCopied] = useState(false);

  // Reset texto quando modal reabre
  useEffect(() => {
    if (open) {
      setMessage(DEFAULT_MESSAGE(inviterName, link));
      setCopied(false);
    }
  }, [open, inviterName, link]);

  // ESC fecha
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select textarea
      const ta = document.getElementById(
        "invite-textarea",
      ) as HTMLTextAreaElement | null;
      if (ta) {
        ta.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }, [message]);

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const emailSubject = encodeURIComponent(
    `Acho que você vai gostar disso aqui — Longevify`,
  );
  const emailBody = encodeURIComponent(message);
  const emailUrl = `mailto:?subject=${emailSubject}&body=${emailBody}`;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      aria-modal="true"
      role="dialog"
      aria-label="Convidar amigo"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-white shadow-2xl",
          "sm:max-w-[520px] sm:rounded-[20px]",
          "rounded-t-[20px]",
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 px-6 pb-4 pt-5">
          <div>
            <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900">
              Convide quem você ama
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
              Compartilha o Longevify. Quando seu indicado fizer a primeira
              coleta,{" "}
              <span className="font-semibold text-emerald-700">
                vocês dois ganham 1 mês de Concierge grátis
              </span>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mensagem editável */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <label
            htmlFor="invite-textarea"
            className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
          >
            Sua mensagem
          </label>
          <textarea
            id="invite-textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="mt-2 w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-[13.5px] leading-relaxed text-zinc-800 placeholder:text-zinc-400 focus:border-brand-400 focus:bg-white focus:outline-none"
          />

          <div className="mt-3 rounded-xl bg-brand-50/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-brand-700">
            <strong>Seu link:</strong>{" "}
            <span className="font-mono">{link}</span>
          </div>
        </div>

        {/* Footer com 3 botões */}
        <div className="grid grid-cols-3 gap-2 border-t border-zinc-100 px-4 py-4">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-[#25D366] px-3 py-3 text-[12.5px] font-semibold text-white transition hover:bg-[#1ebe5b]"
          >
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </a>
          <a
            href={emailUrl}
            className="inline-flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-zinc-900 px-3 py-3 text-[12.5px] font-semibold text-white transition hover:bg-zinc-800"
          >
            <Mail className="h-5 w-5" />
            Email
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "inline-flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-3 text-[12.5px] font-semibold transition",
              copied
                ? "bg-emerald-100 text-emerald-700"
                : "bg-brand-50 text-brand-700 hover:bg-brand-100",
            )}
          >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function slugifyName(name?: string | null): string | null {
  if (!name) return null;
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 16);
}
