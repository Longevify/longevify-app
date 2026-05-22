"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Play,
  Pause,
  Square,
  MapPin,
  Timer,
  Footprints,
  Share2,
  Loader2,
  Trophy,
  Flame,
  Activity,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  GpsPoint,
  PaceSegment,
  RunningSession,
} from "@/lib/fitness/types";
import { saveRunningSession } from "../actions";
import { toast } from "@/lib/toast";
import { RouteMap } from "./route-map";

/**
 * Lucas (2026-05-21): "imitaremos features do strava, atuando como
 * cronometro, medidor de pace e mostrando a localização de onde você
 * está correndo, quanto o pace ta variando nos determinados pontos do
 * trajeto e quero que isso seja postável nas redes sociais"
 *
 * Estados do tracker:
 *   - idle: tela inicial, header + botão "Iniciar corrida"
 *   - tracking: cronômetro rodando + GPS watch ativo + pace ao vivo
 *   - paused: cronômetro pausado, GPS desligado (economia bateria)
 *   - done: resumo final com mapa + métricas + botão Salvar/Descartar
 *
 * Persistence em running_sessions via saveRunningSession action.
 */

interface CorridaClientProps {
  history: RunningSession[];
  stats: {
    totalKmThisMonth: number;
    totalRunsThisMonth: number;
    bestPaceSecondsPerKm: number | null;
    longestRunKm: number | null;
  };
}

type RunState = "idle" | "tracking" | "paused" | "done";

interface Coord {
  lat: number;
  lon: number;
  ts: number; // segundos desde started
}

// Haversine — distância entre 2 pontos GPS em metros
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtPace(secsPerKm: number | null | undefined): string {
  if (!secsPerKm || !Number.isFinite(secsPerKm) || secsPerKm <= 0) return "—";
  const m = Math.floor(secsPerKm / 60);
  const s = Math.floor(secsPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function CorridaClient({ history, stats }: CorridaClientProps) {
  const [runState, setRunState] = useState<RunState>("idle");
  const [coords, setCoords] = useState<Coord[]>([]);
  const [distanceM, setDistanceM] = useState(0);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState<RunningSession | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const lastCoordRef = useRef<Coord | null>(null);

  const [saving, startSaving] = useTransition();

  // Pace atual (últimos ~500m / tempo)
  const currentPace = useMemo(() => {
    if (coords.length < 2) return null;
    // Últimos N pontos cobrindo até 500m ou 30s
    let totalM = 0;
    let totalS = 0;
    for (let i = coords.length - 1; i > 0; i--) {
      const a = coords[i - 1];
      const b = coords[i];
      const m = haversineMeters(a.lat, a.lon, b.lat, b.lon);
      const t = b.ts - a.ts;
      totalM += m;
      totalS += t;
      if (totalM > 500 || totalS > 30) break;
    }
    if (totalM < 5 || totalS < 1) return null;
    return (totalS / totalM) * 1000; // s/km
  }, [coords]);

  const avgPace = useMemo(() => {
    if (distanceM < 1 || elapsedSecs < 1) return null;
    return (elapsedSecs / distanceM) * 1000;
  }, [distanceM, elapsedSecs]);

  // ─── Timer (ticka a cada segundo durante tracking) ──────────────────
  useEffect(() => {
    if (runState === "tracking") {
      timerRef.current = setInterval(() => {
        if (startedAtRef.current) {
          // elapsedSecs = soma do tempo de tracking ATÉ AGORA - tempo pausado
          // Pra simplificar, contamos só "now - startedAt" (sem subtrair pausas)
          // — pra MVP, basta pausar o timer no estado paused
          setElapsedSecs((prev) => prev + 1);
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [runState]);

  // ─── GPS watcher ────────────────────────────────────────────────────
  useEffect(() => {
    if (runState !== "tracking") {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocalização não disponível neste dispositivo");
      setRunState("idle");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const ts = startedAtRef.current
          ? (Date.now() - startedAtRef.current) / 1000
          : 0;
        const coord: Coord = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          ts,
        };
        // Calcula delta de distância vs último ponto
        const last = lastCoordRef.current;
        if (last) {
          const m = haversineMeters(last.lat, last.lon, coord.lat, coord.lon);
          // Filtro de ruído: ignora deltas < 2m ou > 100m (sinal ruim)
          if (m >= 2 && m <= 100) {
            setDistanceM((cur) => cur + m);
          }
        }
        lastCoordRef.current = coord;
        setCoords((prev) => [...prev, coord]);
      },
      (err) => {
        setError(`GPS: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      },
    );

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [runState]);

  // ─── Controles ──────────────────────────────────────────────────────
  const start = () => {
    setError(null);
    setCoords([]);
    setDistanceM(0);
    setElapsedSecs(0);
    lastCoordRef.current = null;
    startedAtRef.current = Date.now();
    setRunState("tracking");
  };

  const pause = () => setRunState("paused");
  const resume = () => setRunState("tracking");

  const stop = () => {
    setRunState("done");
  };

  const discard = () => {
    if (!confirm("Descartar essa corrida? Os dados não serão salvos.")) return;
    setRunState("idle");
    setCoords([]);
    setDistanceM(0);
    setElapsedSecs(0);
    lastCoordRef.current = null;
    startedAtRef.current = null;
  };

  // Compute pace por km segments quando termina
  const paceSegments = useMemo<PaceSegment[]>(() => {
    if (coords.length < 2) return [];
    const segments: PaceSegment[] = [];
    let cumDistM = 0;
    let kmStartTs = 0;
    let kmIndex = 1;
    for (let i = 1; i < coords.length; i++) {
      const a = coords[i - 1];
      const b = coords[i];
      const m = haversineMeters(a.lat, a.lon, b.lat, b.lon);
      if (m < 2 || m > 100) continue;
      cumDistM += m;
      while (cumDistM >= kmIndex * 1000) {
        const kmEndTs = b.ts;
        const kmSecs = kmEndTs - kmStartTs;
        segments.push({ km: kmIndex, paceSeconds: kmSecs });
        kmStartTs = kmEndTs;
        kmIndex++;
      }
    }
    return segments;
  }, [coords]);

  const saveRun = () => {
    const distanceKm = distanceM / 1000;
    if (distanceKm < 0.05) {
      toast.error({
        title: "Corrida muito curta",
        description: "Mínimo 50m pra salvar.",
      });
      return;
    }
    startSaving(async () => {
      const gpsCoords: GpsPoint[] = coords.map((c) => [c.lat, c.lon, c.ts]);
      const result = await saveRunningSession({
        distanceKm,
        durationSeconds: elapsedSecs,
        avgPaceSecondsPerKm: avgPace ?? 0,
        coordinates: gpsCoords,
        paceSegments,
      });
      if (result.ok) {
        toast.success({
          title: "Corrida salva!",
          description: `${distanceKm.toFixed(2)} km · ${fmtDuration(elapsedSecs)} · ${fmtPace(avgPace)}`,
        });
        for (const ach of result.data?.newAchievements ?? []) {
          toast.success({
            title: `🏆 Nova conquista: ${ach.emoji} ${ach.title}`,
            description: `${ach.description} (+${ach.xp} XP)`,
          });
        }
        setRunState("idle");
        setCoords([]);
        setDistanceM(0);
        setElapsedSecs(0);
        lastCoordRef.current = null;
        startedAtRef.current = null;
        // Forçar reload pra pegar histórico
        window.location.reload();
      } else {
        toast.error({ title: "Erro ao salvar", description: result.error });
      }
    });
  };

  // ─── Render ────────────────────────────────────────────────────────

  if (runState === "tracking" || runState === "paused") {
    return (
      <TrackerView
        distanceM={distanceM}
        elapsedSecs={elapsedSecs}
        currentPace={currentPace}
        avgPace={avgPace}
        paused={runState === "paused"}
        coords={coords}
        onPause={pause}
        onResume={resume}
        onStop={stop}
        onDiscard={discard}
        error={error}
      />
    );
  }

  if (runState === "done") {
    return (
      <DoneView
        distanceM={distanceM}
        elapsedSecs={elapsedSecs}
        avgPace={avgPace}
        coords={coords}
        paceSegments={paceSegments}
        saving={saving}
        onSave={saveRun}
        onDiscard={discard}
      />
    );
  }

  // ─── Idle: stats + start + histórico ────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Stats header */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Footprints className="h-4 w-4 text-brand-700" />}
          label="Este mês"
          value={`${stats.totalKmThisMonth.toFixed(1)} km`}
          hint={`${stats.totalRunsThisMonth} corrida${stats.totalRunsThisMonth === 1 ? "" : "s"}`}
        />
        <StatCard
          icon={<Flame className="h-4 w-4 text-orange-500" />}
          label="Melhor pace"
          value={fmtPace(stats.bestPaceSecondsPerKm)}
          hint="histórico"
        />
        <StatCard
          icon={<Trophy className="h-4 w-4 text-amber-600" />}
          label="Mais longa"
          value={stats.longestRunKm ? `${stats.longestRunKm.toFixed(1)} km` : "—"}
          hint="histórico"
        />
        <StatCard
          icon={<Activity className="h-4 w-4 text-emerald-600" />}
          label="Total"
          value={`${history.length}`}
          hint="corridas"
        />
      </section>

      {/* Start big button — Phase 3H: pulse animation pra atrair atenção */}
      <button
        type="button"
        onClick={start}
        className="group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-10 text-white shadow-[0_8px_30px_-12px_rgba(31,93,63,.6)] transition active:scale-[0.98]"
      >
        {/* Pulse rings (puramente visual) */}
        <span
          aria-hidden
          className="pointer-events-none absolute h-24 w-24 animate-ping rounded-full bg-white/10"
          style={{ animationDuration: "2.4s" }}
        />
        <span className="relative grid h-16 w-16 place-items-center rounded-full bg-white/15 ring-1 ring-white/30 transition group-hover:bg-white/25 group-hover:scale-105">
          <Play className="h-7 w-7 fill-white" />
        </span>
        <span className="relative text-[16px] font-semibold tracking-tight">
          Iniciar corrida
        </span>
        <span className="relative text-[11px] text-white/70">
          GPS + cronômetro + pace em tempo real
        </span>
      </button>

      {/* Histórico */}
      <section>
        <h3 className="mb-2 px-1 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Histórico ({history.length})
        </h3>
        {history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-8 text-center text-[12.5px] text-zinc-500">
            Nenhuma corrida ainda. Toca em <strong>Iniciar corrida</strong> aí em
            cima 🏃
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((r) => (
              <li key={r.id} className="relative">
                <a
                  href={`/fitness/corrida/${r.id}`}
                  className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-brand-300 hover:shadow-sm"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <Footprints className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold tabular-nums text-zinc-900">
                      {(r.distanceKm ?? 0).toFixed(2)} km · {fmtDuration(r.durationSeconds ?? 0)}
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-500">
                      {r.sessionDate ? fmtDate(r.sessionDate) : "—"} · pace{" "}
                      {fmtPace(r.avgPaceSecondsPerKm)}
                    </div>
                  </div>
                </a>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShareOpen(r);
                  }}
                  aria-label="Compartilhar"
                  className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-brand-700"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Share modal */}
      {shareOpen && (
        <ShareModal session={shareOpen} onClose={() => setShareOpen(null)} />
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 shadow-[0_2px_8px_-4px_rgba(13,40,24,.08)]">
      <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-[16px] font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-[10.5px] text-zinc-400">{hint}</div>
    </div>
  );
}

function TrackerView({
  distanceM,
  elapsedSecs,
  currentPace,
  avgPace,
  paused,
  coords,
  onPause,
  onResume,
  onStop,
  onDiscard,
  error,
}: {
  distanceM: number;
  elapsedSecs: number;
  currentPace: number | null;
  avgPace: number | null;
  paused: boolean;
  coords: Coord[];
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onDiscard: () => void;
  error: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Live mapa */}
      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
        <RouteMap
          coords={coords.map((c) => [c.lat, c.lon, c.ts] as GpsPoint)}
          height={220}
          live
        />
      </section>

      {/* Métricas hero */}
      <section className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-6 text-white shadow-md">
        <div className="text-center">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/70">
            Distância
          </div>
          <div className="mt-1 text-[56px] font-semibold leading-none tracking-tight tabular-nums">
            {(distanceM / 1000).toFixed(2)}
            <span className="ml-1 text-[20px] font-medium text-white/70">km</span>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-white/70">
              Tempo
            </div>
            <div className="mt-0.5 text-[18px] font-semibold leading-none tabular-nums">
              {fmtDuration(elapsedSecs)}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-white/70">
              Pace atual
            </div>
            <div className="mt-0.5 text-[18px] font-semibold leading-none tabular-nums">
              {fmtPace(currentPace)}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-white/70">
              Pace médio
            </div>
            <div className="mt-0.5 text-[18px] font-semibold leading-none tabular-nums">
              {fmtPace(avgPace)}
            </div>
          </div>
        </div>
      </section>

      {/* Controles */}
      <section className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onDiscard}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-white py-3 text-[12px] font-semibold text-zinc-600 transition hover:bg-zinc-50"
        >
          <X className="h-4 w-4" />
          Descartar
        </button>
        {paused ? (
          <button
            type="button"
            onClick={onResume}
            className="col-span-1 flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 py-3 text-[13px] font-semibold text-white shadow-sm"
          >
            <Play className="h-4 w-4 fill-white" />
            Continuar
          </button>
        ) : (
          <button
            type="button"
            onClick={onPause}
            className="col-span-1 flex items-center justify-center gap-1.5 rounded-2xl bg-amber-100 py-3 text-[13px] font-semibold text-amber-900 transition hover:bg-amber-200"
          >
            <Pause className="h-4 w-4" />
            Pausar
          </button>
        )}
        <button
          type="button"
          onClick={onStop}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-rose-600 py-3 text-[13px] font-semibold text-white shadow-sm hover:bg-rose-700"
        >
          <Square className="h-4 w-4 fill-white" />
          Finalizar
        </button>
      </section>

      <p className="text-center text-[10.5px] text-zinc-400">
        Mantenha o app aberto pra GPS funcionar · pontos: {coords.length}
      </p>
    </div>
  );
}

function DoneView({
  distanceM,
  elapsedSecs,
  avgPace,
  coords,
  paceSegments,
  saving,
  onSave,
  onDiscard,
}: {
  distanceM: number;
  elapsedSecs: number;
  avgPace: number | null;
  coords: Coord[];
  paceSegments: PaceSegment[];
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const distanceKm = distanceM / 1000;

  return (
    <div className="flex flex-col gap-4">
      <section className="overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white">
        <div className="px-5 pt-5 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-emerald-800">
            <Check className="h-3 w-3" />
            Corrida finalizada
          </div>
          <div className="mt-3 text-[44px] font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">
            {distanceKm.toFixed(2)}{" "}
            <span className="text-[18px] font-medium text-zinc-500">km</span>
          </div>
          <div className="mt-3 flex justify-center gap-6 text-center">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                Tempo
              </div>
              <div className="mt-0.5 text-[16px] font-semibold tabular-nums text-zinc-900">
                {fmtDuration(elapsedSecs)}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                Pace médio
              </div>
              <div className="mt-0.5 text-[16px] font-semibold tabular-nums text-zinc-900">
                {fmtPace(avgPace)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <RouteMap
            coords={coords.map((c) => [c.lat, c.lon, c.ts] as GpsPoint)}
            height={200}
          />
        </div>
      </section>

      {/* Pace por km */}
      {paceSegments.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-3.5">
          <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <Timer className="h-3 w-3" />
            Splits por km
          </div>
          <ul className="flex flex-col gap-1">
            {paceSegments.map((seg) => (
              <li
                key={seg.km}
                className="flex items-center justify-between rounded-xl bg-zinc-50/60 px-3 py-1.5 text-[12.5px]"
              >
                <span className="font-medium text-zinc-700 tabular-nums">
                  km {seg.km}
                </span>
                <span className="text-zinc-900 font-semibold tabular-nums">
                  {fmtPace(seg.paceSeconds)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Save / Discard */}
      <section className="flex gap-3">
        <button
          type="button"
          onClick={onDiscard}
          disabled={saving}
          className="flex-1 rounded-xl border border-zinc-200 bg-white py-3 text-[13px] font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
        >
          Descartar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || distanceKm < 0.05}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 py-3 text-[14px] font-semibold text-white shadow-sm transition disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando…
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Salvar
            </>
          )}
        </button>
      </section>
    </div>
  );
}

function ShareModal({
  session,
  onClose,
}: {
  session: RunningSession;
  onClose: () => void;
}) {
  const distance = session.distanceKm ?? 0;
  const duration = session.durationSeconds ?? 0;
  const pace = session.avgPaceSecondsPerKm;

  const downloadImage = async () => {
    // Canvas-based share image
    const cvs = document.createElement("canvas");
    cvs.width = 1080;
    cvs.height = 1080;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 1080);
    grad.addColorStop(0, "#1f5d3f");
    grad.addColorStop(1, "#0d2818");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1080);

    // Logo
    ctx.font = "600 32px ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(255,255,255,.6)";
    ctx.fillText("LONGEVIFY", 60, 80);

    // Trace do trajeto (se houver)
    if (session.coordinates && session.coordinates.length > 1) {
      const pts = session.coordinates;
      const lats = pts.map((p) => p[0]);
      const lons = pts.map((p) => p[1]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      const latR = maxLat - minLat || 0.001;
      const lonR = maxLon - minLon || 0.001;
      const padding = 100;
      const mapH = 500;
      const mapW = 960;
      const mapX = 60;
      const mapY = 140;
      ctx.strokeStyle = "rgba(255,255,255,.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(mapX, mapY, mapW, mapH);

      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      pts.forEach((p, i) => {
        const x = mapX + padding + ((p[1] - minLon) / lonR) * (mapW - 2 * padding);
        const y =
          mapY + mapH - padding - ((p[0] - minLat) / latR) * (mapH - 2 * padding);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Métricas centrais
    ctx.fillStyle = "#fff";
    ctx.font = "600 96px ui-sans-serif, system-ui";
    ctx.fillText(`${distance.toFixed(2)} km`, 60, 760);
    ctx.font = "500 40px ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.fillText(fmtDuration(duration), 60, 820);
    ctx.fillText(fmtPace(pace), 60, 880);

    // Tagline
    ctx.font = "400 24px ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(255,255,255,.5)";
    ctx.fillText("longevify.com.br · longevidade personalizada", 60, 1020);

    cvs.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `corrida-${distance.toFixed(2)}km.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const shareNative = async () => {
    if (!navigator.share) {
      toast.error({ title: "Compartilhamento não suportado neste browser" });
      return;
    }
    try {
      await navigator.share({
        title: "Minha corrida no Longevify",
        text: `Corri ${distance.toFixed(2)}km em ${fmtDuration(duration)} · pace ${fmtPace(pace)} 🏃`,
        url: window.location.href,
      });
    } catch (e) {
      // user cancelled
      console.log(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-[480px] sm:rounded-3xl rounded-t-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-[16px] font-semibold leading-tight text-zinc-900">
              {distance.toFixed(2)} km · {fmtDuration(duration)}
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {session.sessionDate ? fmtDate(session.sessionDate) : "—"} · pace{" "}
              {fmtPace(pace)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {session.coordinates && session.coordinates.length > 1 && (
            <RouteMap coords={session.coordinates} height={220} />
          )}

          {session.paceSegments && session.paceSegments.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                <Timer className="h-3 w-3" />
                Splits por km
              </div>
              <ul className="flex flex-col gap-1">
                {session.paceSegments.map((seg) => (
                  <li
                    key={seg.km}
                    className="flex items-center justify-between rounded-xl bg-zinc-50/60 px-3 py-1.5 text-[12.5px]"
                  >
                    <span className="font-medium text-zinc-700 tabular-nums">
                      km {seg.km}
                    </span>
                    <span className="font-semibold tabular-nums text-zinc-900">
                      {fmtPace(seg.paceSeconds)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <footer className="border-t border-zinc-100 px-5 py-3 flex gap-2">
          <button
            type="button"
            onClick={downloadImage}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm",
            )}
          >
            <Share2 className="h-3.5 w-3.5" />
            Baixar imagem
          </button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              type="button"
              onClick={shareNative}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Compartilhar
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

// We don't have direct map tile rendering (avoids deps).
// RouteMap is implemented in ./route-map.tsx as inline SVG with bbox normalization.
