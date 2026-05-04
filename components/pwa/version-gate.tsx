"use client";

import { useEffect, useState } from "react";

interface VersionInfo {
  latest: string;
  minimum: string;
  buildHash?: string;
  timestamp?: string;
}

const APP_STORE_URL =
  "https://apps.apple.com/br/app/longevify/idTBD";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.longevify.app";

/**
 * Compara semver "1.0.0" — retorna -1, 0, ou 1.
 */
function semverCompare(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

/**
 * Bloqueia o app inteiro se o user estiver com versão mobile abaixo
 * do `minimum` retornado pelo /api/version. Necessário pra evitar que
 * UI antigo + backend novo gere bugs aleatórios e suporte vire inferno.
 *
 * Só roda dentro de Capacitor (apps nativos) — PWA atualiza
 * automaticamente via service worker.
 *
 * Usage: adicionar em algum layout que envelope tudo. Provavelmente
 * dentro do (app)/layout.tsx do Next, ou um wrapper client.
 */
export function VersionGate({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Só roda em Capacitor — PWA não precisa (auto-updates)
    const win = window as unknown as {
      Capacitor?: {
        isNativePlatform?: () => boolean;
        Plugins?: { App?: { getInfo?: () => Promise<{ version: string }> } };
      };
    };
    if (!win.Capacitor?.isNativePlatform?.()) {
      setChecked(true);
      return;
    }

    async function check() {
      try {
        const [appInfo, versionRes] = await Promise.all([
          win.Capacitor?.Plugins?.App?.getInfo?.(),
          fetch("/api/version").then((r) => r.json()),
        ]);
        const installed = appInfo?.version ?? "0.0.0";
        const info = versionRes as VersionInfo;

        if (semverCompare(installed, info.minimum) < 0) {
          setBlocked(true);
        }
      } catch {
        // Best-effort — falha silenciosa, não bloqueia
      } finally {
        setChecked(true);
      }
    }
    check();
  }, []);

  if (!checked) {
    // Splash invisível enquanto checa pra evitar flash de UI
    return null;
  }

  if (blocked) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-900 p-6 text-white">
        <div className="max-w-sm rounded-2xl border border-white/15 bg-white/5 p-6 text-center backdrop-blur-md">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-700 text-[26px] font-bold">
            L
          </div>
          <h2 className="text-[20px] font-semibold leading-tight">
            Atualize o app
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-white/80">
            Lançamos uma versão nova com melhorias importantes. Pra continuar usando o Longevify, atualize pela loja.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <a
              href={
                navigator.userAgent.includes("iPhone") ||
                navigator.userAgent.includes("iPad")
                  ? APP_STORE_URL
                  : PLAY_STORE_URL
              }
              className="block rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-brand-900 hover:bg-white/95"
            >
              Atualizar agora
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
