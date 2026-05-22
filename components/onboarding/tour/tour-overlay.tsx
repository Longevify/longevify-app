"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TourPlacement } from "./tour-steps";

/**
 * Overlay full-screen com:
 *  - Dim background com "cutout" no elemento alvo (efeito spotlight)
 *  - Tooltip posicionado evitando bordas do viewport
 *  - Botões skip / back / next + dots de progresso
 *
 * Posicionamento: tenta abaixo do elemento primeiro (espaço >= tooltip
 * height + 20px). Senão tenta acima, esquerda, direita. Fallback:
 * centralizado no viewport.
 *
 * Spotlight: SVG mask com retângulo cortado no rect do elemento +
 * padding 8px. Border-radius 12 pra suavizar.
 */

interface TourOverlayProps {
  /** Bounding rect do elemento alvo (já em viewport coords). null = step
   *  sem spotlight (modal centralizado). */
  targetRect: DOMRect | null;
  placement: TourPlacement;
  title: string;
  body: string;
  hint?: string;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const TOOLTIP_WIDTH = 320;
const TOOLTIP_PADDING = 16;
const SPOTLIGHT_PADDING = 8;

export function TourOverlay({
  targetRect,
  placement,
  title,
  body,
  hint,
  stepNumber,
  totalSteps,
  onNext,
  onBack,
  onSkip,
  isFirst,
  isLast,
}: TourOverlayProps) {
  // Re-posiciona quando viewport muda
  const [viewport, setViewport] = useState(() =>
    typeof window === "undefined"
      ? { w: 1024, h: 768 }
      : { w: window.innerWidth, h: window.innerHeight },
  );

  useEffect(() => {
    const onResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Calcula posição do tooltip baseado no rect do target + placement
  const tooltipStyle = useMemo<React.CSSProperties>(() => {
    // Modo centralizado (welcome / complete steps OR target não encontrado)
    if (!targetRect || placement === "center") {
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: `min(${TOOLTIP_WIDTH}px, calc(100vw - 32px))`,
      };
    }

    const padded = {
      top: targetRect.top - SPOTLIGHT_PADDING,
      left: targetRect.left - SPOTLIGHT_PADDING,
      right: targetRect.right + SPOTLIGHT_PADDING,
      bottom: targetRect.bottom + SPOTLIGHT_PADDING,
      width: targetRect.width + SPOTLIGHT_PADDING * 2,
      height: targetRect.height + SPOTLIGHT_PADDING * 2,
    };

    // Auto: escolhe melhor side baseado em espaço
    let actual: TourPlacement = placement;
    if (placement === "auto") {
      const spaceBelow = viewport.h - padded.bottom;
      const spaceAbove = padded.top;
      const spaceRight = viewport.w - padded.right;
      const spaceLeft = padded.left;
      if (spaceBelow >= 220) actual = "bottom";
      else if (spaceAbove >= 220) actual = "top";
      else if (spaceRight >= TOOLTIP_WIDTH + 32) actual = "right";
      else if (spaceLeft >= TOOLTIP_WIDTH + 32) actual = "left";
      else actual = "center";
    }

    const maxWidth = `min(${TOOLTIP_WIDTH}px, calc(100vw - 32px))`;

    if (actual === "center") {
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth,
      };
    }

    if (actual === "bottom") {
      const top = Math.min(padded.bottom + 12, viewport.h - 200);
      // Centraliza horizontalmente sobre o target, mas clamp aos limites
      const idealCenter = padded.left + padded.width / 2;
      const left = Math.max(
        TOOLTIP_PADDING,
        Math.min(
          idealCenter - TOOLTIP_WIDTH / 2,
          viewport.w - TOOLTIP_WIDTH - TOOLTIP_PADDING,
        ),
      );
      return { top, left, maxWidth, width: `min(${TOOLTIP_WIDTH}px, calc(100vw - 32px))` };
    }

    if (actual === "top") {
      // Posição relativa pelo bottom (calc) — Robusto pra elementos perto
      // do topo. Vou usar top calc com tooltip height estimate (~200px).
      const top = Math.max(TOOLTIP_PADDING, padded.top - 200 - 12);
      const idealCenter = padded.left + padded.width / 2;
      const left = Math.max(
        TOOLTIP_PADDING,
        Math.min(
          idealCenter - TOOLTIP_WIDTH / 2,
          viewport.w - TOOLTIP_WIDTH - TOOLTIP_PADDING,
        ),
      );
      return { top, left, maxWidth, width: `min(${TOOLTIP_WIDTH}px, calc(100vw - 32px))` };
    }

    if (actual === "right") {
      const left = Math.min(padded.right + 12, viewport.w - TOOLTIP_WIDTH - TOOLTIP_PADDING);
      const top = Math.max(
        TOOLTIP_PADDING,
        Math.min(padded.top, viewport.h - 240),
      );
      return { top, left, maxWidth, width: `min(${TOOLTIP_WIDTH}px, calc(100vw - 32px))` };
    }

    if (actual === "left") {
      const left = Math.max(TOOLTIP_PADDING, padded.left - TOOLTIP_WIDTH - 12);
      const top = Math.max(
        TOOLTIP_PADDING,
        Math.min(padded.top, viewport.h - 240),
      );
      return { top, left, maxWidth, width: `min(${TOOLTIP_WIDTH}px, calc(100vw - 32px))` };
    }

    return { left: "50%", top: "50%", transform: "translate(-50%, -50%)", maxWidth };
  }, [targetRect, placement, viewport]);

  return (
    <div
      className="fixed inset-0 z-[80] pointer-events-none"
      aria-modal="true"
      role="dialog"
      aria-label="Tutorial guiado"
    >
      {/* SVG overlay com cutout no spotlight. Pointer-events auto pro
          background (capture clicks fora do tooltip pra avançar/skip). */}
      <svg
        className="absolute inset-0 h-full w-full pointer-events-auto"
        onClick={onSkip}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && placement !== "center" && (
              <rect
                x={targetRect.left - SPOTLIGHT_PADDING}
                y={targetRect.top - SPOTLIGHT_PADDING}
                width={targetRect.width + SPOTLIGHT_PADDING * 2}
                height={targetRect.height + SPOTLIGHT_PADDING * 2}
                rx="12"
                ry="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.65)"
          mask="url(#tour-spotlight-mask)"
        />
        {/* Anel pulsando ao redor do spotlight */}
        {targetRect && placement !== "center" && (
          <rect
            x={targetRect.left - SPOTLIGHT_PADDING}
            y={targetRect.top - SPOTLIGHT_PADDING}
            width={targetRect.width + SPOTLIGHT_PADDING * 2}
            height={targetRect.height + SPOTLIGHT_PADDING * 2}
            rx="12"
            ry="12"
            fill="none"
            stroke="rgba(63, 154, 107, 0.8)"
            strokeWidth="2"
            className="tour-spotlight-pulse"
          />
        )}
      </svg>

      {/* Tooltip — pointer-events-auto pra capturar clicks dos botões */}
      <div
        className={cn(
          "absolute z-[81] flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-2xl pointer-events-auto",
          "animate-tour-tooltip-in",
        )}
        style={tooltipStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com progresso + skip */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === stepNumber - 1
                    ? "w-5 bg-brand-700"
                    : i < stepNumber - 1
                      ? "w-1.5 bg-brand-400"
                      : "w-1.5 bg-zinc-200",
                )}
              />
            ))}
          </div>
          {!isLast && (
            <button
              type="button"
              onClick={onSkip}
              aria-label="Pular tutorial"
              className="grid h-6 w-6 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Conteúdo */}
        <div>
          <h3 className="text-[17px] font-semibold tracking-tight text-zinc-900">
            {title}
          </h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-600">
            {body}
          </p>
          {hint && (
            <span className="mt-2.5 inline-block rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 ring-1 ring-brand-200">
              {hint}
            </span>
          )}
        </div>

        {/* Footer com nav */}
        <footer className="mt-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={isFirst}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium transition",
              isFirst
                ? "cursor-not-allowed text-zinc-300"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
            )}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Voltar
          </button>
          <span className="text-[11px] tabular-nums text-zinc-400">
            {stepNumber} / {totalSteps}
          </span>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-brand-800"
          >
            {isLast ? "Concluir" : "Próximo"}
            {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes tour-tooltip-in {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.96)
              translate(var(--tw-translate-x, 0), var(--tw-translate-y, 0));
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1)
              translate(var(--tw-translate-x, 0), var(--tw-translate-y, 0));
          }
        }
        .animate-tour-tooltip-in {
          animation: tour-tooltip-in 240ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes tour-pulse {
          0%,
          100% {
            opacity: 0.85;
            stroke-width: 2;
          }
          50% {
            opacity: 0.4;
            stroke-width: 3.5;
          }
        }
        .tour-spotlight-pulse {
          animation: tour-pulse 1.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Helper: força re-measure após scroll/route change. Não usado no
// overlay direto, mas pode ser útil em testes.
export function useElementRect(selector: string | null): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) {
      setRect(null);
      return;
    }
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [selector]);

  return rect;
}
