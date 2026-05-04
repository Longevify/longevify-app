"use client";

import { useEffect } from "react";

/**
 * Registra o service worker do PWA. Renderiza null — só roda useEffect.
 *
 * Comportamento:
 *  - Skip em dev (NODE_ENV !== "production") — evita cache atrapalhar HMR
 *  - Skip se não tiver navigator.serviceWorker (browsers antigos)
 *  - Skip dentro de Capacitor (vamos checar via window.Capacitor)
 *  - Quando atualização disponível, atualiza silenciosamente
 *
 * Adicionar este componente em algum layout client-aware.
 * Não usar diretamente no app/layout.tsx server component.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Capacitor injeta window.Capacitor no native runtime — não queremos
    // service worker dentro do app nativo (Capacitor já gerencia cache)
    const win = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
    if (win.Capacitor?.isNativePlatform?.()) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // Se um novo SW foi instalado em background, ativa imediatamente.
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // Update pronto — postMessage pra ele assumir
              installing.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("[sw] register failed:", err);
        }
      }
    };

    register();
  }, []);

  return null;
}
