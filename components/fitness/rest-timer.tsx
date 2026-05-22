"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Phase 3D — Rest timer entre sets.
 *
 * Countdown configurável (default 90s) com:
 *  - Anel circular SVG mostrando progresso
 *  - +15s / -15s ajustes rápidos
 *  - Reset / pausa
 *  - Beep ao terminar (Web Audio API — sem dependência de arquivo)
 *  - Vibração no mobile via Vibration API
 *
 * Compacto pra usar dentro de modal de log set.
 */

interface RestTimerProps {
  seconds: number;
  /** Chamado quando timer chega a zero */
  onComplete?: () => void;
  /** Chamado ao fechar/dispensar */
  onClose?: () => void;
  className?: string;
}

const PRESET_OPTIONS = [30, 60, 90, 120, 180];

export function RestTimer({
  seconds: initialSeconds,
  onComplete,
  onClose,
  className,
}: RestTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [remaining, setRemaining] = useState(initialSeconds);
  const [running, setRunning] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const completedRef = useRef(false);

  // Tick loop
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (!completedRef.current) {
            completedRef.current = true;
            if (soundOn) playBeep();
            try {
              if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                navigator.vibrate?.([200, 100, 200]);
              }
            } catch {
              /* noop */
            }
            onComplete?.();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, soundOn]);

  // Reseta completedRef quando muda total
  useEffect(() => {
    completedRef.current = false;
  }, [totalSeconds]);

  const reset = (newSecs?: number) => {
    const s = newSecs ?? totalSeconds;
    setTotalSeconds(s);
    setRemaining(s);
    setRunning(true);
    completedRef.current = false;
  };

  const adjust = (delta: number) => {
    setRemaining((r) => Math.max(0, r + delta));
    setTotalSeconds((t) => Math.max(0, t + delta));
  };

  const pct = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 0;
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (pct / 100) * circumference;

  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white shadow-sm",
        remaining === 0
          ? "border-emerald-300 bg-emerald-50/40"
          : "border-zinc-200",
        className,
      )}
    >
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Anel SVG */}
        <div className="relative h-20 w-20 shrink-0">
          <svg
            viewBox="0 0 100 100"
            className="h-full w-full -rotate-90"
            aria-hidden
          >
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="rgba(63, 154, 107, 0.15)"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={remaining === 0 ? "#059669" : "#2a7a53"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.5s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[20px] font-semibold tabular-nums leading-none text-zinc-900">
              {minutes}:{String(secs).padStart(2, "0")}
            </div>
            <div className="text-[8.5px] uppercase tracking-wider text-zinc-500">
              descanso
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="flex-1">
          {remaining === 0 ? (
            <div className="text-[13px] font-semibold text-emerald-700">
              ✓ Pronto pro próximo set!
            </div>
          ) : (
            <div className="text-[11.5px] text-zinc-600">
              Total: {Math.floor(totalSeconds / 60)}:{String(totalSeconds % 60).padStart(2, "0")}
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => adjust(-15)}
              disabled={running && remaining < 15}
              className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10.5px] font-semibold text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-30"
              aria-label="Menos 15 segundos"
            >
              −15
            </button>
            <button
              type="button"
              onClick={() => adjust(15)}
              className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10.5px] font-semibold text-zinc-700 transition hover:bg-zinc-200"
              aria-label="Mais 15 segundos"
            >
              +15
            </button>
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              className="ml-1 grid h-6 w-6 place-items-center rounded-md bg-brand-700 text-white transition hover:bg-brand-800"
              aria-label={running ? "Pausar" : "Continuar"}
            >
              {running ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
            <button
              type="button"
              onClick={() => reset()}
              className="grid h-6 w-6 place-items-center rounded-md bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"
              aria-label="Reiniciar"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setSoundOn((s) => !s)}
              className="grid h-6 w-6 place-items-center rounded-md bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"
              aria-label={soundOn ? "Mutar" : "Desmutar"}
            >
              {soundOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="ml-auto grid h-6 w-6 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-100"
                aria-label="Fechar timer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Presets */}
          <div className="mt-2 flex flex-wrap gap-1">
            {PRESET_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => reset(s)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[9.5px] font-semibold tabular-nums transition",
                  totalSeconds === s
                    ? "bg-brand-700 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                )}
              >
                {s < 60 ? `${s}s` : `${Math.floor(s / 60)}min`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Beep simples via Web Audio API. Não bloqueia se contexto indisponível.
 */
function playBeep() {
  try {
    const AudioCtxClass = (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext);
    if (!AudioCtxClass) return;
    const ctx = new AudioCtxClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880; // A5
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    setTimeout(() => ctx.close(), 600);
  } catch {
    /* noop */
  }
}
