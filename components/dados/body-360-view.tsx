"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import type { PatientSex } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// 24 frames de 0° a 345° gerados via gpt-image-1 (scripts/generate-avatar-360.mjs)
// e comprimidos pra WebP 512x768 (~5KB/frame, total ~240KB pros 2 sexos).
const TOTAL_FRAMES = 24;
const FRAMES = Array.from({ length: TOTAL_FRAMES }, (_, i) =>
  String(i * (360 / TOTAL_FRAMES)).padStart(3, "0"),
);

interface Body360ViewProps {
  sex: PatientSex;
  className?: string;
  /** Distância em pixels horizontal pra completar 1 volta completa. Default 360. */
  dragSensitivity?: number;
  /** Mostra frame inicial diferente (ex: 90° = lado). */
  initialFrame?: number;
}

/**
 * Viewer 360° de avatar fotorrealístico — array de PNGs em /public/avatars/360/.
 * Drag/swipe horizontal pra rotacionar entre frames.
 *
 * NÃO usa Three.js — substitui o BodyAvatar3D quando o objetivo é só
 * "exibir avatar humano realista rotacionável" (sem destaque por região
 * via vertex color, sem overlay de órgãos).
 */
export function Body360View({
  sex,
  className,
  dragSensitivity = 360,
  initialFrame = 0,
}: Body360ViewProps) {
  const [frame, setFrame] = useState(initialFrame);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number | null>(null);
  const dragStartFrame = useRef(0);

  // Preload todos os frames em background — performance crítica pra drag suave
  useEffect(() => {
    FRAMES.forEach((angle) => {
      const img = new window.Image();
      img.src = `/avatars/360/${sex}/${angle}.webp`;
    });
  }, [sex]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      dragStartX.current = e.clientX;
      dragStartFrame.current = frame;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [frame],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (dragStartX.current === null) return;
      const dx = e.clientX - dragStartX.current;
      const framesShift = Math.round((dx / dragSensitivity) * TOTAL_FRAMES);
      const next =
        (((dragStartFrame.current - framesShift) % TOTAL_FRAMES) + TOTAL_FRAMES) %
        TOTAL_FRAMES;
      setFrame(next);
    },
    [dragSensitivity],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      dragStartX.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* já solto */
      }
    },
    [],
  );

  const src = useMemo(
    () => `/avatars/360/${sex}/${FRAMES[frame]}.webp`,
    [sex, frame],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-[2/3] w-full select-none cursor-grab touch-none active:cursor-grabbing",
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <Image
        src={src}
        alt={`Avatar corporal ${sex === "female" ? "feminino" : "masculino"} (${FRAMES[frame]}°)`}
        fill
        sizes="(min-width: 1024px) 280px, 140px"
        priority
        className="object-contain"
        draggable={false}
      />
    </div>
  );
}
