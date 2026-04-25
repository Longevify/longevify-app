"use client";

import { useMemo, useState } from "react";
import { Activity, Heart, Moon, TrendingUp } from "lucide-react";
import { AppleHealthUpload } from "@/components/wearables/apple-health-upload";
import { DeviceCard } from "@/components/wearables/device-card";
import { GoalsDashboard } from "@/components/wearables/goals-dashboard";
import { MetricTile } from "@/components/wearables/metric-tile";
import {
  average,
  DAILY_METRICS,
  DEVICES,
  type DailyHealthMetrics,
  type WearableDevice,
} from "@/lib/wearables-mock";

export default function WearablesPage() {
  const [devices, setDevices] = useState<WearableDevice[]>(DEVICES);
  const [metrics, setMetrics] =
    useState<DailyHealthMetrics[]>(DAILY_METRICS);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [notifyToast, setNotifyToast] = useState<string | null>(null);

  const last7 = useMemo(() => metrics.slice(-7), [metrics]);

  const avgSleepMinutes = average(metrics, "sleepMinutes", 7);
  const avgSteps = average(metrics, "steps", 7);
  const avgHRV = average(metrics, "hrv", 7);
  const latestVO2max = [...metrics]
    .reverse()
    .find((m) => typeof m.vo2max === "number")?.vo2max ?? 46.5;

  function handleConnect(device: WearableDevice) {
    if (device.brand === "apple") {
      setUploadOpen(true);
      return;
    }
    setDevices((ds) =>
      ds.map((d) =>
        d.brand === device.brand
          ? {
              ...d,
              connected: true,
              lastSyncAt: new Date().toISOString(),
              syncStatus: "live",
            }
          : d,
      ),
    );
  }

  function handleDisconnect(device: WearableDevice) {
    if (device.brand === "apple") {
      setUploadOpen(false);
    }
    setDevices((ds) =>
      ds.map((d) =>
        d.brand === device.brand
          ? { ...d, connected: false, syncStatus: undefined }
          : d,
      ),
    );
  }

  function handleNotify(device: WearableDevice) {
    setNotifyToast(`Vamos te avisar quando ${device.name} estiver disponível.`);
    setTimeout(() => setNotifyToast(null), 3200);
  }

  function handleParsed(parsed: DailyHealthMetrics[]) {
    // merge: substitui por dias que o upload cobre, mantém resto
    const byDate = new Map<string, DailyHealthMetrics>();
    for (const m of metrics) byDate.set(m.date, m);
    for (const m of parsed) {
      const existing = byDate.get(m.date);
      byDate.set(m.date, existing ? { ...existing, ...m } : m);
    }
    const merged = Array.from(byDate.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    setMetrics(merged);
  }

  const sleepSeries = last7.map((m) => ({
    date: m.date,
    value: m.sleepMinutes,
  }));
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
          Wearables & Metas
        </h1>
        <p className="mt-2 max-w-[640px] text-[14px] text-muted">
          Conecte seus dispositivos e acompanhe se você está cumprindo o
          protocolo. Sono, atividade e recuperação têm impacto direto no seu
          Longevify Score.
        </p>
      </header>

      {notifyToast ? (
        <div className="mb-6 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-[13px] text-brand-800">
          {notifyToast}
        </div>
      ) : null}

      <section className="mb-10 flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[18px] font-semibold">Dispositivos</h2>
          <span className="text-[12px] text-muted">
            {devices.filter((d) => d.connected).length} conectado
            {devices.filter((d) => d.connected).length === 1 ? "" : "s"} ·{" "}
            {devices.length} disponíveis
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((d) => (
            <DeviceCard
              key={d.brand}
              device={d}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onNotify={handleNotify}
            />
          ))}
        </div>

        {uploadOpen ? (
          <div className="pt-2">
            <AppleHealthUpload onParsed={handleParsed} />
          </div>
        ) : null}
      </section>

      <section className="mb-10 flex flex-col gap-4">
        <div>
          <h2 className="text-[18px] font-semibold">Metas do protocolo</h2>
          <p className="mt-1 text-[13px] text-muted">
            Baseado nos últimos 7 dias de dados sincronizados.
          </p>
        </div>
        <GoalsDashboard metrics={metrics} />
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-[18px] font-semibold">Métricas chave</h2>
          <p className="mt-1 text-[13px] text-muted">
            Médias dos últimos 7 dias.
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
    </div>
  );
}
