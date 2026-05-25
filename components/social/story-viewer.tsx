"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoryItem } from "@/lib/social/server";

/**
 * Viewer fullscreen Instagram-style. Auto-advance em 5s, tap pra
 * próxima, swipe/click bordas pra navegar.
 */
export function StoryViewer({
  stories,
  startIndex,
  onClose,
}: {
  stories: StoryItem[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const story = stories[index];

  // Auto-advance: 5s por story
  useEffect(() => {
    setProgress(0);
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 5000;
      if (elapsed >= 1) {
        clearInterval(interval);
        if (index < stories.length - 1) {
          setIndex(index + 1);
        } else {
          onClose();
        }
      } else {
        setProgress(elapsed);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [index, stories.length, onClose]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && index > 0) setIndex(index - 1);
      else if (e.key === "ArrowRight") {
        if (index < stories.length - 1) setIndex(index + 1);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, stories.length, onClose]);

  if (!story) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
    >
      {/* Progress bars no topo */}
      <div className="flex gap-1 px-2 pt-2">
        {stories.map((_, i) => (
          <div
            key={i}
            className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
          >
            <div
              className="h-full bg-white transition-[width]"
              style={{
                width:
                  i < index
                    ? "100%"
                    : i === index
                      ? `${Math.round(progress * 100)}%`
                      : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header com autor + close */}
      <header className="flex items-center gap-2 px-3 py-2 text-white">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 text-[14px] font-semibold backdrop-blur-sm">
          {story.firstName[0]?.toUpperCase() ?? "?"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold">
            {story.isMine ? "Você" : story.firstName}
          </div>
          <div className="text-[10.5px] text-white/70">
            {timeAgo(story.createdAt)}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/25"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Foto centralizada — tap zones nas bordas pra navegar */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={story.imageUrl}
          alt={story.caption ?? "Story"}
          className="max-h-full max-w-full object-contain"
        />

        {/* Zona esquerda — voltar */}
        <button
          type="button"
          onClick={() => index > 0 && setIndex(index - 1)}
          aria-label="Story anterior"
          className={cn(
            "absolute inset-y-0 left-0 grid w-1/4 place-items-start pl-2 pt-3 text-white/0 transition group-hover:text-white/50",
          )}
        >
          {index > 0 && <ChevronLeft className="h-5 w-5 opacity-30" />}
        </button>
        {/* Zona direita — avançar */}
        <button
          type="button"
          onClick={() =>
            index < stories.length - 1 ? setIndex(index + 1) : onClose()
          }
          aria-label="Próximo story"
          className="absolute inset-y-0 right-0 grid w-1/4 place-items-start pr-2 pt-3 text-white/0"
        >
          <ChevronRight className="h-5 w-5 opacity-30" />
        </button>

        {/* Caption sobreposto na base */}
        {story.caption && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-8 pt-12">
            <p className="text-[13px] leading-relaxed text-white whitespace-pre-wrap">
              {story.caption}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) {
    const minutes = Math.max(1, Math.floor(ms / 60_000));
    return `${minutes}min`;
  }
  return `${hours}h`;
}
