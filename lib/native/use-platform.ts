"use client";

import { useEffect, useState } from "react";
import {
  getPlatform,
  isAppMode,
  isNativePlatform,
  isStandalonePWA,
} from "./platform";

/**
 * React hook pra detectar plataforma nativa de forma SSR-safe.
 *
 * SSR retorna estado "neutro" (web, não nativo, não standalone) — depois
 * useEffect roda no client e atualiza pro valor real. Evita hydration
 * mismatch.
 *
 * Uso:
 *   const { isNative, platform, isStandalone } = usePlatform();
 *   if (isNative && platform === "ios") return <AppleHealthButton />;
 */
export interface PlatformState {
  isNative: boolean;
  platform: "ios" | "android" | "web";
  isStandalone: boolean;
  isAppMode: boolean;
  /** Hidratado — após o primeiro render client-side. */
  hydrated: boolean;
}

const SSR_DEFAULT: PlatformState = {
  isNative: false,
  platform: "web",
  isStandalone: false,
  isAppMode: false,
  hydrated: false,
};

export function usePlatform(): PlatformState {
  const [state, setState] = useState<PlatformState>(SSR_DEFAULT);

  useEffect(() => {
    setState({
      isNative: isNativePlatform(),
      platform: getPlatform(),
      isStandalone: isStandalonePWA(),
      isAppMode: isAppMode(),
      hydrated: true,
    });
  }, []);

  return state;
}
