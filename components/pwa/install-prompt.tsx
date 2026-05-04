"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "longevify.pwa.installDismissedAt";
const DISMISS_COOLDOWN_DAYS = 14;

/**
 * Banner discreto sugerindo instalar o PWA. Aparece em Chrome/Edge Android
 * quando o browser dispara `beforeinstallprompt`. Safari iOS NÃO suporta
 * esse evento — usuários iOS precisam usar "Adicionar à Tela de Início"
 * manualmente. Pra eles, há uma instrução estática separada (não impl
 * nesse PR — adicionar quando viral suficiente).
 *
 * UX:
 *   - Aparece após 30s de uso (não-blocking)
 *   - Esconde se já dismissed nos últimos 14 dias (localStorage)
 *   - Esconde se rodando dentro de Capacitor (já é app nativo)
 *   - Esconde se já instalado como standalone PWA
 */
export function PWAInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Skip se rodando em Capacitor native shell
    const win = window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    };
    if (win.Capacitor?.isNativePlatform?.()) return;

    // Skip se já instalado standalone
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Cooldown de 14 dias após dismiss
    try {
      const dismissed = window.localStorage.getItem(DISMISSED_KEY);
      if (dismissed) {
        const ts = Number(dismissed);
        if (
          !Number.isNaN(ts) &&
          Date.now() - ts < DISMISS_COOLDOWN_DAYS * 86400 * 1000
        ) {
          return;
        }
      }
    } catch {
      // localStorage pode falhar em modo privado — segue
    }

    function handleBefore(e: Event) {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      // Aguarda 30s antes de mostrar pra não interromper onboarding
      setTimeout(() => setVisible(true), 30_000);
    }

    window.addEventListener("beforeinstallprompt", handleBefore);
    return () => window.removeEventListener("beforeinstallprompt", handleBefore);
  }, []);

  if (!visible || !event) return null;

  async function install() {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    setVisible(false);
    setEvent(null);
    if (outcome === "dismissed") {
      try {
        window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
      } catch {
        /* noop */
      }
    }
  }

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      /* noop */
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Instalar Longevify"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-brand-200 bg-white p-4 shadow-[0_24px_64px_-24px_rgba(13,40,24,0.28)] sm:bottom-4 sm:left-auto sm:right-4"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-700 text-white">
          <span className="font-bold text-[18px]">L</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-ink">
            Instalar Longevify
          </div>
          <div className="mt-0.5 text-[13px] text-muted">
            Acesso rápido pelo seu celular, sem precisar de browser.
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={dismiss}
          className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted hover:bg-brand-50/40"
          type="button"
        >
          Agora não
        </button>
        <button
          onClick={install}
          className="rounded-full bg-brand-700 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-800"
          type="button"
        >
          Instalar
        </button>
      </div>
    </div>
  );
}
