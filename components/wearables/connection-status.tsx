"use client";

import { Loader2, RefreshCcw, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

function formatSync(iso?: string): string {
  if (!iso) return "Nunca sincronizado";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.round(h / 24);
  return `há ${d}d`;
}

export function ConnectionStatus({
  lastSyncAt,
  syncing,
  onSync,
  onDisconnect,
}: {
  lastSyncAt?: string;
  syncing?: boolean;
  onSync?: () => void;
  onDisconnect?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div
      className="flex items-center justify-between gap-2 rounded-xl bg-[#DFF5E9] px-3 py-2"
      suppressHydrationWarning
    >
      <div className="text-[12px] text-[#0E7B45]">
        <span className="font-medium">Conectado</span>
        <span className="mx-1.5 opacity-50">·</span>
        <span>
          sincronizado {mounted ? formatSync(lastSyncAt) : "recentemente"}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onSync}
          disabled={syncing}
          aria-label="Sincronizar"
          className="grid h-7 w-7 place-items-center rounded-full text-[#0E7B45] hover:bg-white/60 disabled:opacity-50"
        >
          {syncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCcw className="h-3.5 w-3.5" />
          )}
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[12px]"
          onClick={onDisconnect}
        >
          <Unplug className="h-3 w-3" />
          Desconectar
        </Button>
      </div>
    </div>
  );
}
