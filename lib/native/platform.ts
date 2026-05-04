"use client";

/**
 * Detecção de plataforma nativa (Capacitor) — usado em components pra
 * renderizar UI diferente em app vs web. Ex: mostrar "Conectar Apple
 * Health" só em iOS nativo, esconder PWA install prompt dentro do app.
 *
 * NÃO usa imports do @capacitor/core porque esse módulo não tá
 * instalado no package.json do Next (é separado em mobile/). Em vez
 * disso, lê `window.Capacitor` que é injetado pelo runtime nativo.
 *
 * Em SSR, sempre retorna false (não há window). Components que
 * dependem disso devem ser "use client" ou aceitar SSR fallback.
 *
 * Tipos do runtime ficam em ./types.ts pra evitar redeclaração global.
 */

import "./types";

/**
 * `true` quando o app tá rodando dentro do Capacitor (iOS/Android nativo).
 * Quando aberto no browser regular (Safari, Chrome) → false.
 */
export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  return window.Capacitor?.isNativePlatform?.() ?? false;
}

/**
 * Retorna "ios", "android", ou "web". Use pra branching condicional.
 */
export function getPlatform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  return window.Capacitor?.getPlatform?.() ?? "web";
}

/**
 * Standalone PWA installed (Add to Home Screen no Safari, "Install"
 * no Chrome). Não é Capacitor mas roda fullscreen sem chrome do browser.
 */
export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // Safari iOS legacy
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true
  );
}

/**
 * Helper combinada: app tá em "modo app" (nativo OR PWA standalone).
 * Útil pra esconder coisas que só fazem sentido no browser regular
 * (ex: link "Visite no celular pra melhor experiência").
 */
export function isAppMode(): boolean {
  return isNativePlatform() || isStandalonePWA();
}
