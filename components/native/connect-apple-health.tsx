"use client";

import { useEffect, useState } from "react";
import { usePlatform } from "@/lib/native/use-platform";

/**
 * Card "Conectar Apple Health" — só aparece em iOS nativo (Capacitor).
 * No browser web, retorna null. No PWA standalone web, retorna null
 * (HealthKit só funciona via Capacitor com plugin nativo).
 *
 * Quando o user clica:
 *  1. Pede permissão HealthKit (chama bridge Capacitor)
 *  2. Faz pull dos últimos 30 dias de HRV, sono, passos, peso
 *  3. POST /api/wearables/healthkit/ingest com batch de métricas
 *
 * Implementação real do bridge HealthKit fica em mobile/src/bridges/health.ts
 * — esse component só chama via window.Capacitor.Plugins quando
 * disponível. A integração real é responsabilidade do agente de Capacitor.
 *
 * Status local persiste em localStorage pra mostrar "Conectado" depois.
 */

const CONNECTED_KEY = "longevify.healthkit.connected";

interface CapacitorPlugins {
  Plugins?: {
    Health?: {
      requestAuth?: (options: unknown) => Promise<unknown>;
      queryAggregated?: (options: unknown) => Promise<{
        result?: Array<Record<string, unknown>>;
      }>;
    };
  };
}

export function ConnectAppleHealth() {
  const { isNative, platform, hydrated } = usePlatform();
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setConnected(window.localStorage.getItem(CONNECTED_KEY) === "1");
    } catch {
      /* noop */
    }
  }, []);

  // SSR-safe: nada renderizado até hydrate
  if (!hydrated) return null;
  // Só faz sentido em iOS nativo
  if (!isNative || platform !== "ios") return null;

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const cap = (window as unknown as { Capacitor?: CapacitorPlugins })
        .Capacitor;
      const Health = cap?.Plugins?.Health;
      if (!Health?.requestAuth || !Health?.queryAggregated) {
        throw new Error("Plugin Health não disponível");
      }

      // 1. Pede permissão (HealthKit)
      await Health.requestAuth({
        read: [
          "steps",
          "active-energy-burned",
          "heart-rate",
          "resting-heart-rate",
          "heart-rate-variability",
          "sleep-analysis",
          "vo2max",
          "weight",
        ],
        write: [],
      });

      // 2. Puxa últimos 30 dias de métricas agregadas por dia
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);

      const [steps, sleep, hr, hrv, vo2] = await Promise.all([
        Health.queryAggregated({
          dataType: "steps",
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          bucket: "day",
        }),
        Health.queryAggregated({
          dataType: "sleep-analysis",
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          bucket: "day",
        }),
        Health.queryAggregated({
          dataType: "resting-heart-rate",
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          bucket: "day",
        }),
        Health.queryAggregated({
          dataType: "heart-rate-variability",
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          bucket: "day",
        }),
        Health.queryAggregated({
          dataType: "vo2max",
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          bucket: "day",
        }),
      ]);

      // 3. Combina por dia + envia pro backend
      type Bucket = { date: string; value?: number };
      const byDate = new Map<string, Record<string, number>>();
      const merge = (
        rows: Bucket[] | undefined,
        field: string,
        transform: (v: number) => number = (v) => v,
      ) => {
        for (const r of rows ?? []) {
          if (!r.date || r.value === undefined) continue;
          const day = r.date.slice(0, 10);
          const cur = byDate.get(day) ?? {};
          cur[field] = transform(r.value);
          byDate.set(day, cur);
        }
      };
      merge(steps.result as Bucket[] | undefined, "steps");
      merge(
        sleep.result as Bucket[] | undefined,
        "sleep_minutes",
        (v) => Math.round(v / 60),
      );
      merge(hr.result as Bucket[] | undefined, "resting_hr");
      merge(hrv.result as Bucket[] | undefined, "hrv");
      merge(vo2.result as Bucket[] | undefined, "vo2max");

      const metrics = Array.from(byDate.entries()).map(([date, m]) => ({
        date,
        ...m,
      }));

      const res = await fetch("/api/wearables/healthkit/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "healthkit", metrics }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Falha ao salvar");

      setConnected(true);
      try {
        window.localStorage.setItem(CONNECTED_KEY, "1");
      } catch {
        /* noop */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (connected) {
    return (
      <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4 text-[13px]">
        <div className="flex items-center gap-2 text-brand-800">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-700 text-white">
            ✓
          </span>
          <span className="font-semibold">Apple Health conectado</span>
        </div>
        <p className="mt-1 text-muted">
          Suas métricas de saúde do Apple Watch e Health são sincronizadas
          automaticamente.
        </p>
        <button
          onClick={connect}
          disabled={busy}
          className="mt-2 text-[12px] text-brand-700 underline-offset-2 hover:underline disabled:opacity-50"
          type="button"
        >
          {busy ? "Sincronizando..." : "Sincronizar agora"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FF2D55] text-white">
          <span className="text-[20px]">♥</span>
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-ink">
            Conectar Apple Health
          </div>
          <div className="mt-0.5 text-[13px] text-muted">
            Sincronize HRV, sono, passos e peso do seu Apple Watch
            automaticamente. Alimenta seu Longevify Score.
          </div>
        </div>
      </div>
      {error ? (
        <div className="mt-3 rounded-lg border border-[#FBE1E1] bg-[#FBE1E1]/40 p-2 text-[12px] text-[#B6333A]">
          {error}
        </div>
      ) : null}
      <button
        onClick={connect}
        disabled={busy}
        className="mt-3 w-full rounded-full bg-brand-700 py-2 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
        type="button"
      >
        {busy ? "Conectando..." : "Conectar"}
      </button>
    </div>
  );
}
