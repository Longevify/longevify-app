"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Share2,
  X,
  Download,
  Globe,
  Users as UsersIcon,
  Loader2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GpsPoint, PaceSegment } from "@/lib/fitness/types";
import type { SocialPostKind, SocialPost } from "@/lib/social/types";
import { createSocialPostAction } from "@/app/(app)/fitness/share-actions";

/**
 * Lucas (2026-05-23): "tem que ter algum botão fácil de acessar para
 * compartilhar treinos, corridas com stats aparecendo na foto. na aba
 * fitness, tem que ter a opção de postar os achievements do treino,
 * depois de uma sessão de musculação, uma sessão de corrida".
 *
 * Modal genérico de compartilhamento estilo Strava:
 *  - Renderiza um card 1080×1080 em canvas com stats sobrepostos
 *  - 3 ações: Baixar imagem | Compartilhar (navigator.share) | Postar no feed
 *  - Toggle público/amigos (default: amigos)
 *
 * Variantes suportadas via `kind`:
 *  - running: distância + tempo + pace + traçado GPS
 *  - workout: volume kg + sets + exercícios + duração
 *  - other:   modalidade + duração + intensidade + calorias
 *  - achievement: emoji grande + título + XP
 *  - level_up: novo nível
 */

export type ShareKind = "running" | "workout" | "other" | "achievement" | "level_up";

export interface ShareWorkoutData {
  kind: ShareKind;
  title: string;
  /** Renderizado em destaque na primeira linha */
  primaryStat?: { value: string; label: string };
  /** Stats secundários — 1-3 itens lado a lado */
  secondaryStats?: Array<{ value: string; label: string }>;
  /** Trajeto GPS (running) — pares lat/lon */
  coordinates?: GpsPoint[];
  /** Pace por km (running) */
  paceSegments?: PaceSegment[];
  /** Emoji grande (achievement / activity) */
  emoji?: string;
  /** Lista de bullets adicionais (workout: lista de exercícios) */
  bullets?: string[];
  /** Body opcional pra texto do post */
  body?: string;
}

function fmtDurationLocal(secs: number): string {
  if (!secs || secs < 1) return "0m";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtPaceLocal(secsPerKm: number | null | undefined): string {
  if (!secsPerKm || !Number.isFinite(secsPerKm) || secsPerKm <= 0) return "—";
  const m = Math.floor(secsPerKm / 60);
  const s = Math.floor(secsPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

interface ShareWorkoutModalProps {
  data: ShareWorkoutData;
  /** Quando o user pular ou fechar */
  onClose: () => void;
  /** Override do título do modal */
  modalTitle?: string;
  /** Visivel já quando renderizado (modal controlado externamente) */
  open: boolean;
}

export function ShareWorkoutModal({
  data,
  onClose,
  modalTitle,
  open,
}: ShareWorkoutModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const [visibility, setVisibility] = useState<"friends" | "public">("friends");
  const [postStatus, setPostStatus] = useState<
    "idle" | "posting" | "posted" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Render preview canvas sempre que abrir
  useEffect(() => {
    if (!open) return;
    drawCanvasImage(previewRef.current, data, 540); // half-size pra preview
  }, [open, data]);

  if (!open) return null;

  const handleDownload = () => {
    const cvs = document.createElement("canvas");
    cvs.width = 1080;
    cvs.height = 1080;
    drawCanvasImage(cvs, data, 1080);
    cvs.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `longevify-${data.kind}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const handleShareNative = async () => {
    if (!navigator.share) {
      handleDownload();
      return;
    }
    // Try Web Share API com arquivo
    const cvs = document.createElement("canvas");
    cvs.width = 1080;
    cvs.height = 1080;
    drawCanvasImage(cvs, data, 1080);
    cvs.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `longevify-${data.kind}.png`, {
        type: "image/png",
      });
      try {
        // Some browsers support files in share, some don't
        const canShareFile =
          "canShare" in navigator &&
          navigator.canShare?.({ files: [file] });
        if (canShareFile) {
          await navigator.share({
            title: data.title,
            text: shareText(data),
            files: [file],
          });
        } else {
          await navigator.share({
            title: data.title,
            text: shareText(data),
            url: window.location.origin,
          });
        }
      } catch {
        /* user cancelled */
      }
    }, "image/png");
  };

  const handlePostFeed = () => {
    setPostStatus("posting");
    setError(null);
    startTransition(async () => {
      const payload: SocialPost["payload"] = {
        title: data.title,
        body: data.body,
      };
      // Mapeia campos de cada kind pro payload do social_posts
      if (data.kind === "running") {
        // primaryStat = "5.24 km" → extrai número
        const distNum = parseFloat(
          (data.primaryStat?.value ?? "0").replace(",", "."),
        );
        if (Number.isFinite(distNum) && distNum > 0)
          payload.distanceKm = distNum;
        const dur = data.secondaryStats?.find((s) =>
          s.label.toLowerCase().includes("tempo"),
        );
        const pace = data.secondaryStats?.find((s) =>
          s.label.toLowerCase().includes("pace"),
        );
        if (dur) payload.durationSeconds = parseDurationToSeconds(dur.value);
        if (pace) payload.paceSecondsPerKm = parsePaceToSeconds(pace.value);
        if (data.coordinates && data.coordinates.length > 0) {
          // simplifica: amostragem 1 em cada 5
          payload.routePreview = data.coordinates
            .filter((_, i) => i % 5 === 0)
            .map((c) => [c[0], c[1]]);
        }
      } else if (data.kind === "achievement") {
        payload.achievementEmoji = data.emoji;
      } else if (data.kind === "level_up") {
        const lvl = parseInt(data.primaryStat?.value ?? "", 10);
        if (Number.isFinite(lvl)) payload.level = lvl;
      }

      const socialKind: SocialPostKind =
        data.kind === "other" ? "workout" : (data.kind as SocialPostKind);
      const res = await createSocialPostAction({
        kind: socialKind,
        payload,
        visibility,
      });
      if (res.ok) {
        setPostStatus("posted");
        setTimeout(onClose, 1500);
      } else {
        setPostStatus("error");
        setError(res.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[94dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-[480px] sm:rounded-3xl rounded-t-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-[17px] font-semibold leading-tight text-zinc-900">
              {modalTitle ?? "Compartilhar"}
            </h2>
            <p className="mt-0.5 text-[11.5px] text-zinc-500">
              Imagem pronta pra Instagram, Twitter, WhatsApp ou postar no feed
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Preview do card */}
          <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl shadow-lg">
            <canvas
              ref={previewRef}
              width={540}
              height={540}
              className="block h-full w-full"
            />
          </div>

          {/* Visibility toggle pro post no feed */}
          <div className="mt-5">
            <label className="text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
              Quem vê seu post no feed?
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility("friends")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-semibold transition",
                  visibility === "friends"
                    ? "border-brand-300 bg-brand-50 text-brand-900"
                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
                )}
              >
                <UsersIcon className="h-3.5 w-3.5" />
                Só amigos
              </button>
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-semibold transition",
                  visibility === "public"
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
                )}
              >
                <Globe className="h-3.5 w-3.5" />
                Público
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {error}
            </div>
          )}
        </div>

        <footer className="border-t border-zinc-100 px-5 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={postStatus === "posting"}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[12.5px] font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar
            </button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                type="button"
                onClick={handleShareNative}
                disabled={postStatus === "posting"}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[12.5px] font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                <Share2 className="h-3.5 w-3.5" />
                Compartilhar
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handlePostFeed}
            disabled={postStatus === "posting" || postStatus === "posted"}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition disabled:opacity-60"
          >
            {postStatus === "posting" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Postando…
              </>
            ) : postStatus === "posted" ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Postado!
              </>
            ) : (
              <>Postar no feed Longevify</>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={postStatus === "posting"}
            className="mt-2 w-full rounded-xl px-3 py-2 text-[11.5px] font-medium text-zinc-500 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            Pular
          </button>
        </footer>

        {/* Canvas hidden 1080×1080 — pra download/share */}
        <canvas
          ref={canvasRef}
          width={1080}
          height={1080}
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function shareText(data: ShareWorkoutData): string {
  const stats =
    [data.primaryStat?.value, ...(data.secondaryStats?.map((s) => s.value) ?? [])]
      .filter(Boolean)
      .join(" · ") || "";
  return `${data.title}${stats ? ` — ${stats}` : ""} 💪 Longevify`;
}

function parseDurationToSeconds(s: string): number {
  // "1:23:45" → 5025; "23:45" → 1425
  const parts = s.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => !Number.isFinite(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

function parsePaceToSeconds(s: string): number {
  // "5:30/km" → 330
  const m = s.match(/(\d+):(\d{2})/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/**
 * Desenha o card 1080×1080 (ou escalado) — gradient brand + título + emoji
 * + stats centrais + tagline. Para corrida, sobrepõe traçado GPS.
 */
function drawCanvasImage(
  cvs: HTMLCanvasElement | null,
  data: ShareWorkoutData,
  size: number,
) {
  if (!cvs) return;
  const ctx = cvs.getContext("2d");
  if (!ctx) return;
  cvs.width = size;
  cvs.height = size;
  const s = size / 1080; // escala uniforme

  // Background gradient (brand-700 → brand-900)
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, "#1f5d3f");
  grad.addColorStop(1, "#0d2818");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Sutil glow no canto
  const glow = ctx.createRadialGradient(
    size * 0.85,
    size * 0.15,
    0,
    size * 0.85,
    size * 0.15,
    size * 0.5,
  );
  glow.addColorStop(0, "rgba(110,186,142,.25)");
  glow.addColorStop(1, "rgba(110,186,142,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Logo
  ctx.font = `600 ${32 * s}px ui-sans-serif, system-ui, -apple-system`;
  ctx.fillStyle = "rgba(255,255,255,.65)";
  ctx.fillText("LONGEVIFY", 60 * s, 80 * s);
  ctx.font = `400 ${20 * s}px ui-sans-serif, system-ui`;
  ctx.fillStyle = "rgba(255,255,255,.45)";
  ctx.fillText(
    new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    60 * s,
    120 * s,
  );

  // Kind chip
  const kindLabel = kindToLabel(data.kind);
  ctx.font = `600 ${22 * s}px ui-sans-serif, system-ui`;
  const chipWidth = ctx.measureText(kindLabel).width + 40 * s;
  ctx.fillStyle = "rgba(255,255,255,.15)";
  roundedRect(ctx, size - 60 * s - chipWidth, 56 * s, chipWidth, 40 * s, 20 * s);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(kindLabel, size - 60 * s - chipWidth + 20 * s, 84 * s);

  // Trace do trajeto pra running
  if (
    data.kind === "running" &&
    data.coordinates &&
    data.coordinates.length > 1
  ) {
    drawRoute(ctx, data.coordinates, size, s);
  }

  // Emoji grande pra achievement / activity (centralizado)
  if (data.emoji && (data.kind === "achievement" || data.kind === "level_up")) {
    ctx.font = `${160 * s}px ui-sans-serif, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText(data.emoji, size / 2, size * 0.42);
    ctx.textAlign = "left";
  } else if (data.emoji && (data.kind === "workout" || data.kind === "other")) {
    // Emoji menor no canto
    ctx.font = `${100 * s}px ui-sans-serif, system-ui`;
    ctx.fillText(data.emoji, 60 * s, 280 * s);
  }

  // Título principal
  ctx.font = `600 ${42 * s}px ui-sans-serif, system-ui`;
  ctx.fillStyle = "#ffffff";
  const titleY = data.kind === "running" ? 700 * s : 460 * s;
  wrapText(ctx, data.title, 60 * s, titleY, size - 120 * s, 50 * s);

  // Primary stat (grande)
  if (data.primaryStat) {
    ctx.font = `700 ${110 * s}px ui-sans-serif, system-ui`;
    ctx.fillStyle = "#ffffff";
    const primaryY = data.kind === "running" ? 820 * s : 590 * s;
    ctx.fillText(data.primaryStat.value, 60 * s, primaryY);

    ctx.font = `500 ${24 * s}px ui-sans-serif, system-ui`;
    ctx.fillStyle = "rgba(255,255,255,.6)";
    ctx.fillText(
      data.primaryStat.label.toUpperCase(),
      60 * s,
      primaryY + 35 * s,
    );
  }

  // Secondary stats (até 3, row horizontal)
  if (data.secondaryStats && data.secondaryStats.length > 0) {
    const secY = data.kind === "running" ? 920 * s : 720 * s;
    let cx = 60 * s;
    const colW = (size - 120 * s) / data.secondaryStats.length;
    for (const stat of data.secondaryStats) {
      ctx.font = `600 ${44 * s}px ui-sans-serif, system-ui`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(stat.value, cx, secY);
      ctx.font = `500 ${18 * s}px ui-sans-serif, system-ui`;
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.fillText(stat.label.toUpperCase(), cx, secY + 30 * s);
      cx += colW;
    }
  }

  // Bullets (workout: lista exercícios)
  if (data.bullets && data.bullets.length > 0 && data.kind !== "running") {
    let by = 800 * s;
    ctx.font = `400 ${22 * s}px ui-sans-serif, system-ui`;
    ctx.fillStyle = "rgba(255,255,255,.75)";
    for (const b of data.bullets.slice(0, 4)) {
      ctx.fillText(`· ${b}`, 60 * s, by);
      by += 32 * s;
    }
  }

  // Tagline rodapé
  ctx.font = `400 ${22 * s}px ui-sans-serif, system-ui`;
  ctx.fillStyle = "rgba(255,255,255,.45)";
  ctx.fillText("longevify.com.br · longevidade personalizada", 60 * s, 1020 * s);
}

function kindToLabel(k: ShareKind): string {
  switch (k) {
    case "running":
      return "🏃 Corrida";
    case "workout":
      return "💪 Treino";
    case "other":
      return "🏋️ Atividade";
    case "achievement":
      return "🏆 Conquista";
    case "level_up":
      return "👑 Level up";
  }
}

function drawRoute(
  ctx: CanvasRenderingContext2D,
  pts: GpsPoint[],
  size: number,
  s: number,
) {
  const lats = pts.map((p) => p[0]);
  const lons = pts.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latR = maxLat - minLat || 0.001;
  const lonR = maxLon - minLon || 0.001;
  const padding = 100 * s;
  const mapH = 480 * s;
  const mapW = 960 * s;
  const mapX = 60 * s;
  const mapY = 160 * s;

  // Frame sutil
  ctx.strokeStyle = "rgba(255,255,255,.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(mapX, mapY, mapW, mapH);

  // Traçado
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 6 * s;
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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
) {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const test = line + w + " ";
    if (ctx.measureText(test).width > maxW && line.length > 0) {
      ctx.fillText(line, x, y);
      line = w + " ";
      y += lineH;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
