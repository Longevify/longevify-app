"use client";

import { useEffect } from "react";
import "@/lib/native/types";

/**
 * Esconde o splash screen do Capacitor depois que a webview terminou
 * de hidratar a primeira página. Sem isso, o splash fica eternamente
 * visível (config launchAutoHide: false em capacitor.config.ts).
 *
 * Por que launchAutoHide: false: o splash padrão esconde após X ms,
 * mas a WebView pode ainda estar carregando o JS do app.longevify.com.br.
 * O usuário veria flash de tela branca entre splash → conteúdo. Com
 * controle manual, escondemos só quando o React mountou.
 *
 * Skip se não tá em Capacitor (web puro, splash não existe).
 */

export function SplashController() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.Capacitor?.isNativePlatform?.()) return;

    // Pequeno delay pra dar tempo do React pintar a primeira frame
    // antes de esconder o splash — evita flash branco.
    const timeout = setTimeout(() => {
      window.Capacitor?.Plugins?.SplashScreen?.hide?.({
        fadeOutDuration: 300,
      })?.catch(() => {
        /* Plugin pode não estar disponível em todos os builds */
      });
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  return null;
}
