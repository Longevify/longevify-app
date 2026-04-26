"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOAST_EVENT_NAME, type ToastPayload, type ToastVariant } from "@/lib/toast";

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 4000;

const VARIANT_STYLES: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; accent: string; ring: string }
> = {
  success: {
    icon: CheckCircle2,
    accent: "text-[color:var(--color-status-optimal)]",
    ring: "ring-[color:var(--color-status-optimal)]/25",
  },
  error: {
    icon: AlertCircle,
    accent: "text-[color:var(--color-status-out)]",
    ring: "ring-[color:var(--color-status-out)]/25",
  },
  info: {
    icon: Info,
    accent: "text-brand-600",
    ring: "ring-brand-500/25",
  },
};

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastPayload[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const payload = (e as CustomEvent<ToastPayload>).detail;
      if (!payload) return;
      setToasts((prev) => {
        const next = [...prev, payload];
        return next.slice(Math.max(0, next.length - MAX_TOASTS));
      });
    }
    window.addEventListener(TOAST_EVENT_NAME, onToast);
    return () => window.removeEventListener(TOAST_EVENT_NAME, onToast);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, t.durationMs ?? DEFAULT_DURATION),
    );
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [toasts]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          payload={t}
          onDismiss={() =>
            setToasts((prev) => prev.filter((x) => x.id !== t.id))
          }
        />
      ))}
    </div>
  );
}

function ToastItem({
  payload,
  onDismiss,
}: {
  payload: ToastPayload;
  onDismiss: () => void;
}) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const variant = VARIANT_STYLES[payload.variant];
  const Icon = variant.icon;

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-[16px] border border-border bg-surface/95 px-4 py-3 shadow-[0_8px_24px_rgba(13,40,24,.12)] ring-1 backdrop-blur",
        variant.ring,
        "transition-all duration-200 ease-out",
        entered ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", variant.accent)} />
      <div className="flex-1">
        <div className="text-[14px] font-semibold text-ink">{payload.title}</div>
        {payload.description ? (
          <div className="mt-0.5 text-[12.5px] text-muted">
            {payload.description}
          </div>
        ) : null}
        {payload.action ? (
          <button
            type="button"
            onClick={() => {
              payload.action?.onClick();
              onDismiss();
            }}
            className="mt-2 text-[12.5px] font-semibold text-brand-700 hover:text-brand-800"
          >
            {payload.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="-mr-1 -mt-1 grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink"
        aria-label="Fechar notificação"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
