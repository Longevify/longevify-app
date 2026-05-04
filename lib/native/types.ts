/**
 * Tipos compartilhados pro runtime Capacitor exposto em `window.Capacitor`.
 *
 * Esse arquivo é a ÚNICA fonte da declaração `declare global`. Outros
 * módulos importam `CapacitorRuntime` daqui em vez de redeclarar (senão
 * TypeScript reclama de "Subsequent property declarations must have the
 * same type").
 *
 * Não importa nada do @capacitor/core — esse pacote não está no
 * package.json do app web (fica em mobile/). Em vez disso, definimos
 * a interface manualmente baseado no que sabemos do runtime injection.
 */

export interface CapacitorRuntime {
  isNativePlatform?: () => boolean;
  getPlatform?: () => "ios" | "android" | "web";
  Plugins?: {
    SplashScreen?: {
      hide?: (options?: { fadeOutDuration?: number }) => Promise<void>;
      show?: () => Promise<void>;
    };
    App?: {
      getInfo?: () => Promise<{
        version: string;
        build: string;
        name: string;
        id: string;
      }>;
    };
    Health?: {
      requestAuth?: (options: unknown) => Promise<unknown>;
      queryAggregated?: (options: unknown) => Promise<{
        result?: Array<Record<string, unknown>>;
      }>;
    };
    PushNotifications?: {
      register?: () => Promise<void>;
      requestPermissions?: () => Promise<{ receive: string }>;
      addListener?: (event: string, cb: (data: unknown) => void) => void;
    };
  };
}

declare global {
  interface Window {
    Capacitor?: CapacitorRuntime;
  }
}

// Re-export pra ergonomia
export type { CapacitorRuntime as default };
