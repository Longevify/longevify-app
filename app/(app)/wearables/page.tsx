"use client";

import { Activity, Heart, Moon, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConnectAppleHealth } from "@/components/native/connect-apple-health";
import { ConnectModal } from "@/components/wearables/connect-modal";
import { ConnectionStatus } from "@/components/wearables/connection-status";
import { DeviceCard } from "@/components/wearables/device-card";
import { GoalsDashboard } from "@/components/wearables/goals-dashboard";
import { MetricTile } from "@/components/wearables/metric-tile";
import { SyncHistory } from "@/components/wearables/sync-history";
import {
  average,
  DAILY_METRICS,
  DEVICES,
  OTHER_DEVICES,
  type DailyHealthMetrics,
  type WearableDevice,
} from "@/lib/wearables-mock";
import {
  getAllSyncedMetrics,
  getConnection,
  recordSyncRun,
  removeConnection,
  saveConnection,
  upsertSyncedMetrics,
} from "@/lib/wearables/storage";
import type { WearableProvider } from "@/lib/wearables/types";

type ModalMode =
  | { kind: "oauth"; provider: "oura" | "whoop" }
  | { kind: "apple" }
  | { kind: "garmin" }
  | { kind: "coming"; brand: WearableDevice["brand"]; name: string }
  | null;

export default function WearablesPage() {
  const [devices, setDevices] = useState<WearableDevice[]>(DEVICES);
  const [otherDevices] = useState<WearableDevice[]>(OTHER_DEVICES);
  const [metrics, setMetrics] = useState<DailyHealthMetrics[]>([]);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [syncingProvider, setSyncingProvider] =
    useState<WearableProvider | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  // Hidrata estado das conexões e métricas (localStorage) no mount.
  useEffect(() => {
    setDevices((ds) =>
      ds.map((d) => {
        const conn = getConnection(d.brand as WearableProvider);
        if (!conn) return d;
        return {
          ...d,
          connected: true,
          lastSyncAt: new Date(conn.connectedAt).toISOString(),
          syncStatus: "live",
        };
      }),
    );
    const synced = getAllSyncedMetrics();
    setMetrics(synced.length ? synced : DAILY_METRICS);
  }, []);

  // OAuth callback: token vem no fragment (#access_token=...). Captura, salva,
  // e dispara primeira sincronização automaticamente.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const ouraOk = url.searchParams.get("oura_connected") === "1";
    const whoopOk = url.searchParams.get("whoop_connected") === "1";
    const ouraErr = url.searchParams.get("oura_error");
    const whoopErr = url.searchParams.get("whoop_error");

    if (ouraErr) showToast(`Falha Oura: ${ouraErr}`);
    if (whoopErr) showToast(`Falha Whoop: ${whoopErr}`);

    const provider: WearableProvider | null = ouraOk
      ? "oura"
      : whoopOk
        ? "whoop"
        : null;
    if (!provider) return;

    const fragment = window.location.hash.slice(1);
    const params = new URLSearchParams(fragment);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token") || undefined;
    const expiresIn = Number(params.get("expires_in") ?? 0);
    if (!accessToken) return;

    saveConnection(provider, {
      accessToken,
      refreshToken,
      expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
    });
    setDevices((ds) =>
      ds.map((d) =>
        d.brand === provider
          ? {
              ...d,
              connected: true,
              lastSyncAt: new Date().toISOString(),
              syncStatus: "live",
            }
          : d,
      ),
    );
    showToast(`${provider === "oura" ? "Oura" : "Whoop"} conectado.`);

    // limpa URL (remove fragment + query)
    window.history.replaceState({}, "", "/wearables");

    // dispara sync inicial
    void runSync(provider);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const runSync = useCallback(
    async (provider: WearableProvider) => {
      const conn = getConnection(provider);
      if (!conn) return;
      setSyncingProvider(provider);
      const startedAt = Date.now();
      try {
        const res = await fetch(`/api/wearables/${provider}/sync`, {
          method: "POST",
          headers: { Authorization: `Bearer ${conn.accessToken}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const json = (await res.json()) as {
          ok: boolean;
          metrics: DailyHealthMetrics[];
        };
        upsertSyncedMetrics(provider, json.metrics);
        recordSyncRun({
          id: `sync-${startedAt}`,
          provider,
          startedAt,
          finishedAt: Date.now(),
          metricsCount: json.metrics.length,
          status: "ok",
        });
        setMetrics(getAllSyncedMetrics());
        setDevices((ds) =>
          ds.map((d) =>
            d.brand === provider
              ? { ...d, lastSyncAt: new Date().toISOString() }
              : d,
          ),
        );
        showToast(
          `Sincronizado: ${json.metrics.length} dia${json.metrics.length === 1 ? "" : "s"} de ${provider === "oura" ? "Oura" : "Whoop"}.`,
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Falha na sincronização";
        recordSyncRun({
          id: `sync-${startedAt}`,
          provider,
          startedAt,
          finishedAt: Date.now(),
          metricsCount: 0,
          status: "error",
          error: message,
        });
        showToast(`Falha ao sincronizar ${provider}: ${message}`);
      } finally {
        setSyncingProvider(null);
        setHistoryKey((k) => k + 1);
      }
    },
    [showToast],
  );

  function handleConnect(device: WearableDevice) {
    if (device.brand === "apple") {
      setModalMode({ kind: "apple" });
      return;
    }
    if (device.brand === "garmin") {
      setModalMode({ kind: "garmin" });
      return;
    }
    if (device.brand === "oura" || device.brand === "whoop") {
      setModalMode({ kind: "oauth", provider: device.brand });
      return;
    }
    setModalMode({ kind: "coming", brand: device.brand, name: device.name });
  }

  function handleDisconnect(device: WearableDevice) {
    removeConnection(device.brand as WearableProvider);
    setDevices((ds) =>
      ds.map((d) =>
        d.brand === device.brand
          ? { ...d, connected: false, syncStatus: undefined, lastSyncAt: undefined }
          : d,
      ),
    );
    setMetrics(getAllSyncedMetrics().length ? getAllSyncedMetrics() : DAILY_METRICS);
    showToast(`${device.name} desconectado.`);
  }

  function handleNotify(device: WearableDevice) {
    setModalMode({ kind: "coming", brand: device.brand, name: device.name });
  }

  function handleAppleParsed(parsed: DailyHealthMetrics[]) {
    upsertSyncedMetrics("apple", parsed);
    saveConnection("apple", { accessToken: "apple-health-xml" });
    recordSyncRun({
      id: `sync-${Date.now()}`,
      provider: "apple",
      startedAt: Date.now(),
      finishedAt: Date.now(),
      metricsCount: parsed.length,
      status: "ok",
    });
    setMetrics(getAllSyncedMetrics());
    setDevices((ds) =>
      ds.map((d) =>
        d.brand === "apple"
          ? {
              ...d,
              connected: true,
              lastSyncAt: new Date().toISOString(),
              syncStatus: "live",
            }
          : d,
      ),
    );
    setHistoryKey((k) => k + 1);
    showToast(`Apple Health: ${parsed.length} dias importados.`);
  }

  function handleWaitlist(_brand: WearableDevice["brand"], email: string) {
    showToast(`Vamos te avisar em ${email} quando estiver disponível.`);
  }

  const hasConnected = devices.some((d) => d.connected);

  const last7 = useMemo(() => metrics.slice(-7), [metrics]);
  const avgSleepMinutes = average(metrics, "sleepMinutes", 7);
  const avgSteps = average(metrics, "steps", 7);
  const avgHRV = average(metrics, "hrv", 7);
  const latestVO2max =
    [...metrics].reverse().find((m) => typeof m.vo2max === "number")?.vo2max ??
    46.5;

  const sleepSeries = last7.map((m) => ({ date: m.date, value: m.sleepMinutes }));
  const stepsSeries = last7.map((m) => ({ date: m.date, value: m.steps }));
  const hrvSeries = last7.map((m) => ({ date: m.date, value: m.hrv }));
  const vo2Series = last7.map((m) => ({
    date: m.date,
    value: m.vo2max ?? latestVO2max,
  }));

  const avgSleepHours = Math.floor(avgSleepMinutes / 60);
  const avgSleepRest = Math.round(avgSleepMinutes % 60);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10">
      <header className="flex flex-col gap-1 pb-8">
        <span className="text-[13px] text-muted">Wearables</span>
        <h1 className="text-[36px] leading-[1.05] font-semibold tracking-tight">
          Conecte seus wearables
        </h1>
        <p className="mt-2 max-w-[640px] text-[14px] text-muted">
          Sono, atividade e recuperação têm impacto direto no seu Longevify
          Score. Conecte seus dispositivos e a gente faz o resto.
        </p>
      </header>

      {toast ? (
        <div className="mb-6 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-[13px] text-brand-800">
          {toast}
        </div>
      ) : null}

      {/* Apple Health connect — só aparece em iOS nativo (Capacitor),
          retorna null em browser web. Renderiza no topo porque é o
          caminho de conexão MAIS RICO disponível (HRV, sono, peso,
          VO2max etc do Apple Watch). */}
      <div className="mb-6">
        <ConnectAppleHealth />
      </div>

      <section className="mb-10 flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[18px] font-semibold">Dispositivos principais</h2>
          <span className="text-[12px] text-muted">
            {devices.filter((d) => d.connected).length} de {devices.length}{" "}
            conectado
            {devices.filter((d) => d.connected).length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {devices.map((d) => {
            const isSyncTarget =
              d.brand === "oura" || d.brand === "whoop";
            return (
              <div key={d.brand} className="flex flex-col gap-2">
                <DeviceCard
                  device={d}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  onNotify={handleNotify}
                />
                {d.connected && isSyncTarget ? (
                  <ConnectionStatus
                    lastSyncAt={d.lastSyncAt}
                    syncing={syncingProvider === d.brand}
                    onSync={() => runSync(d.brand as WearableProvider)}
                    onDisconnect={() => handleDisconnect(d)}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-10 flex flex-col gap-4">
        <div>
          <h2 className="text-[18px] font-semibold">Outros dispositivos</h2>
          <p className="mt-1 text-[13px] text-muted">
            Estamos finalizando integrações. Avise-nos qual seria sua prioridade.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {otherDevices.map((d) => (
            <DeviceCard
              key={d.brand}
              device={d}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onNotify={handleNotify}
            />
          ))}
        </div>
      </section>

      <SyncHistory refreshKey={historyKey} />

      {hasConnected ? (
        <>
          <section className="mt-10 mb-10 flex flex-col gap-4">
            <div>
              <h2 className="text-[18px] font-semibold">Suas métricas</h2>
              <p className="mt-1 text-[13px] text-muted">
                Médias dos últimos 7 dias com base nos dispositivos conectados.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricTile
                label={
                  <span className="inline-flex items-center gap-1">
                    <Moon className="h-3 w-3" /> Sono 7d
                  </span>
                }
                value={`${avgSleepHours}h${avgSleepRest.toString().padStart(2, "0")}`}
                series={sleepSeries}
                color="#3f9a6b"
                helper="Meta: 7h30"
              />
              <MetricTile
                label={
                  <span className="inline-flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Passos 7d
                  </span>
                }
                value={Math.round(avgSteps).toLocaleString("pt-BR")}
                series={stepsSeries}
                color="#2a7a53"
                helper="Meta: 8.000/dia"
              />
              <MetricTile
                label={
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-3 w-3" /> HRV 7d
                  </span>
                }
                value={`${Math.round(avgHRV)}`}
                unit="ms"
                series={hrvSeries}
                color="#e6b845"
                helper="Baseline: 45ms"
              />
              <MetricTile
                label={
                  <span className="inline-flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> VO2max
                  </span>
                }
                value={latestVO2max.toFixed(1)}
                unit="ml/kg/min"
                series={vo2Series}
                color="#1f5d3f"
                helper="Meta: > 45"
              />
            </div>
          </section>

          <section className="mb-10 flex flex-col gap-4">
            <div>
              <h2 className="text-[18px] font-semibold">Suas metas</h2>
              <p className="mt-1 text-[13px] text-muted">
                Baseado nos últimos 7 dias de dados sincronizados.
              </p>
            </div>
            <GoalsDashboard metrics={metrics} />
          </section>
        </>
      ) : (
        <section className="mt-10 mb-10 rounded-[20px] border border-dashed border-border bg-brand-50/30 p-6 text-center">
          <h2 className="text-[16px] font-semibold">
            Suas métricas aparecem aqui
          </h2>
          <p className="mx-auto mt-1 max-w-[420px] text-[13px] text-muted">
            Conecte ao menos um dispositivo acima para ver médias de sono,
            passos, HRV e VO2max.
          </p>
        </section>
      )}

      <ConnectModal
        mode={modalMode}
        onClose={() => setModalMode(null)}
        onAppleParsed={handleAppleParsed}
        onNotify={handleWaitlist}
      />
    </div>
  );
}
