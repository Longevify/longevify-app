"use client";

import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getSyncHistory } from "@/lib/wearables/storage";
import type { SyncRun, WearableProvider } from "@/lib/wearables/types";

const PROVIDER_LABEL: Record<WearableProvider, string> = {
  oura: "Oura",
  whoop: "Whoop",
  apple: "Apple Watch",
  garmin: "Garmin",
};

function formatDateTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date(ts).toISOString();
  }
}

export function SyncHistory({ refreshKey }: { refreshKey?: number }) {
  const [runs, setRuns] = useState<SyncRun[]>([]);

  useEffect(() => {
    const all: SyncRun[] = [];
    const providers: WearableProvider[] = ["oura", "whoop", "apple", "garmin"];
    for (const p of providers) all.push(...getSyncHistory(p));
    all.sort((a, b) => b.startedAt - a.startedAt);
    setRuns(all.slice(0, 5));
  }, [refreshKey]);

  if (!runs.length) return null;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted" />
        <div className="text-[14px] font-semibold">Histórico de sincronizações</div>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {runs.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 py-2 text-[13px]"
          >
            <div className="flex items-center gap-2">
              {r.status === "ok" ? (
                <CheckCircle2 className="h-4 w-4 text-[#0E7B45]" />
              ) : (
                <XCircle className="h-4 w-4 text-[#B6333A]" />
              )}
              <span className="font-medium">
                {PROVIDER_LABEL[r.provider]}
              </span>
              <span className="text-muted">
                · {formatDateTime(r.startedAt)}
              </span>
            </div>
            <div className="text-muted">
              {r.status === "ok"
                ? `${r.metricsCount} dia${r.metricsCount === 1 ? "" : "s"} de métricas`
                : (r.error ?? "Falhou")}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
