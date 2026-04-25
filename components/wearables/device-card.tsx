"use client";

import {
  Activity,
  BellRing,
  Heart,
  Scale,
  Smartphone,
  Watch,
} from "lucide-react";
import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WearableBrand, WearableDevice } from "@/lib/wearables-mock";

const ICONS: Record<WearableBrand, ComponentType<SVGProps<SVGSVGElement>>> = {
  apple: Watch,
  garmin: Activity,
  oura: Heart,
  whoop: Activity,
  fitbit: Smartphone,
  withings: Scale,
};

const ACCENTS: Record<WearableBrand, string> = {
  apple: "bg-brand-900 text-white",
  garmin: "bg-[#0a2a43] text-white",
  oura: "bg-[#1b1b1b] text-white",
  whoop: "bg-[#0a0a0a] text-white",
  fitbit: "bg-[#00b0b9] text-white",
  withings: "bg-brand-700 text-white",
};

function formatSync(iso?: string): string {
  if (!iso) return "Nunca sincronizado";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "Agora mesmo";
  if (min < 60) return `Sincronizado há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Sincronizado há ${h} h`;
  const d = Math.round(h / 24);
  return `Sincronizado há ${d} d`;
}

export function DeviceCard({
  device,
  onConnect,
  onDisconnect,
  onNotify,
}: {
  device: WearableDevice;
  onConnect?: (d: WearableDevice) => void;
  onDisconnect?: (d: WearableDevice) => void;
  onNotify?: (d: WearableDevice) => void;
}) {
  const Icon = ICONS[device.brand];
  const accent = ACCENTS[device.brand];

  const isComing = device.supported === "coming";
  const isConnected = device.connected;

  // formatSync uses Date.now(), which differs between server and client — defer
  // the rendered string until after hydration to avoid text mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            accent,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold leading-tight">
            {device.name}
          </div>
          <div className="mt-1 text-[12px] text-muted" suppressHydrationWarning>
            {isComing
              ? "Integração em breve"
              : isConnected
                ? mounted
                  ? formatSync(device.lastSyncAt)
                  : "Sincronizado recentemente"
                : "Não conectado"}
          </div>
        </div>
        <StatusPill device={device} />
      </div>

      <div className="mt-auto flex items-center gap-2">
        {isComing ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onNotify?.(device)}
          >
            <BellRing className="h-3.5 w-3.5" />
            Avisar quando disponível
          </Button>
        ) : isConnected ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => onDisconnect?.(device)}
          >
            Desconectar
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => onConnect?.(device)}
          >
            Conectar
          </Button>
        )}
      </div>
    </Card>
  );
}

function StatusPill({ device }: { device: WearableDevice }) {
  if (device.supported === "coming") {
    return (
      <span className="inline-flex h-6 items-center rounded-full bg-[#FBF0D4] px-2.5 text-[11px] font-medium text-[#8A6A13]">
        Em breve
      </span>
    );
  }
  if (device.connected) {
    return (
      <span className="inline-flex h-6 items-center rounded-full bg-[#DFF5E9] px-2.5 text-[11px] font-medium text-[#0E7B45]">
        Conectado
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center rounded-full bg-brand-100 px-2.5 text-[11px] font-medium text-brand-700">
      Disponível
    </span>
  );
}
