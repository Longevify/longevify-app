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
  ImagePlus,
  Trash2,
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
 * Lucas (2026-05-25): "quero que apareça a opção de compartilhar os
 * treinos na rede social instagram, facebook, e outros ou publicar na
 * rede social da longevify". Antes era um botão genérico "Compartilhar"
 * que abria o navigator.share — agora cada rede tem botão dedicado com
 * SVG + cor da marca, igual share sheet de app social.
 *
 * Modal genérico de compartilhamento estilo Strava:
 *  - Renderiza um card 1080×1080 em canvas com stats sobrepostos
 *  - Botões por rede: Instagram | Facebook | X | WhatsApp | Telegram | Mais
 *  - Botão grande: Postar no feed Longevify (com toggle público/amigos)
 *  - Toggle público/amigos (default: amigos)
 *
 * Estratégia por rede:
 *  - Instagram: sem deep-link com imagem confiável → baixa a imagem +
 *    instrução "Salvei a imagem — abra o Instagram e poste como Story/Post"
 *  - Facebook: sharer.php?u={url} + baixa imagem pra user anexar manualmente
 *  - X (Twitter): twitter.com/intent/tweet?text=...&url=... + baixa imagem
 *  - WhatsApp: wa.me/?text=... + baixa imagem
 *  - Telegram: t.me/share/url?url=...&text=... + baixa imagem
 *  - Mais: navigator.share() com file attach (Web Share Level 2)
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

/** Resultado de um clique numa rede externa — pra feedback inline */
type ShareToast =
  | { kind: "instagram_saved" }
  | { kind: "opened"; network: string }
  | { kind: "copied"; network: string }
  | { kind: "error"; message: string }
  | null;

export function ShareWorkoutModal({
  data,
  onClose,
  modalTitle,
  open,
}: ShareWorkoutModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [visibility, setVisibility] = useState<"friends" | "public">("friends");
  const [postStatus, setPostStatus] = useState<
    "idle" | "posting" | "posted" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  // Lucas (2026-05-24): "tenha a opção de anexar uma fotinho sua com os
  // stats da corrida, do treino ou do esporte escolhido e publicar."
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<ShareToast>(null);
  const [, startTransition] = useTransition();

  // Render preview canvas sempre que abrir ou foto mudar
  useEffect(() => {
    if (!open) return;
    drawCanvasImage(previewRef.current, data, 540, photoDataUrl);
  }, [open, data, photoDataUrl]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!shareToast) return;
    const t = setTimeout(() => setShareToast(null), 4000);
    return () => clearTimeout(t);
  }, [shareToast]);

  if (!open) return null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("Foto muito grande — máximo 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  /**
   * Gera o canvas 1080×1080 como Blob — base de todos os fluxos de share.
   * Devolve { blob, file } pra reuso (download direto OU navigator.share).
   */
  const generateImageBlob = async (): Promise<{
    blob: Blob;
    file: File;
  } | null> => {
    const cvs = document.createElement("canvas");
    cvs.width = 1080;
    cvs.height = 1080;
    await drawCanvasImage(cvs, data, 1080, photoDataUrl);
    return new Promise((resolve) => {
      cvs.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        const file = new File([blob], `longevify-${data.kind}.png`, {
          type: "image/png",
        });
        resolve({ blob, file });
      }, "image/png");
    });
  };

  /** Dispara o download da imagem PNG no disco do user */
  const downloadImage = async () => {
    const result = await generateImageBlob();
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `longevify-${data.kind}-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = async () => {
    await downloadImage();
    setShareToast({ kind: "opened", network: "Baixado" });
  };

  // ───────────────────────────────────────────────────────────────────
  //  Compartilhar em rede específica
  //
  //  Lucas (2026-05-25): instagram/facebook/twitter/whatsapp/telegram
  //  ganharam botões dedicados. Cada um:
  //    1) baixa a imagem (todos esses não aceitam imagem inline via URL)
  //    2) abre a URL de share da rede
  //    3) mostra toast com instrução
  //
  //  Exceção: Instagram não tem URL pública de "post composer" — abre só
  //  o app. A user tem que selecionar a imagem manualmente, então a UX é
  //  "baixei a imagem, abra o Instagram e poste como Story/Post".
  // ───────────────────────────────────────────────────────────────────

  const shareUrl = "https://longevify.com.br";
  const shareTxt = shareText(data);

  const handleShareInstagram = async () => {
    await downloadImage();
    setShareToast({ kind: "instagram_saved" });
    // Tenta abrir o Instagram via deep-link — em mobile vai pro app, em
    // desktop fallback pra web. Não consegue pre-anexar imagem (limitação
    // do Instagram), mas pelo menos abre na tela de Story.
    setTimeout(() => {
      window.open("https://www.instagram.com/", "_blank", "noopener");
    }, 600);
  };

  const handleShareFacebook = async () => {
    await downloadImage();
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      shareUrl,
    )}&quote=${encodeURIComponent(shareTxt)}`;
    window.open(url, "_blank", "noopener,width=600,height=600");
    setShareToast({ kind: "opened", network: "Facebook" });
  };

  const handleShareTwitter = async () => {
    await downloadImage();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareTxt,
    )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,width=600,height=600");
    setShareToast({ kind: "opened", network: "X / Twitter" });
  };

  const handleShareWhatsApp = async () => {
    await downloadImage();
    const url = `https://wa.me/?text=${encodeURIComponent(
      `${shareTxt} — ${shareUrl}`,
    )}`;
    window.open(url, "_blank", "noopener");
    setShareToast({ kind: "opened", network: "WhatsApp" });
  };

  const handleShareTelegram = async () => {
    await downloadImage();
    const url = `https://t.me/share/url?url=${encodeURIComponent(
      shareUrl,
    )}&text=${encodeURIComponent(shareTxt)}`;
    window.open(url, "_blank", "noopener");
    setShareToast({ kind: "opened", network: "Telegram" });
  };

  /** "Mais" — navigator.share() nativo com file attach quando possível */
  const handleShareNative = async () => {
    if (typeof navigator === "undefined" || !navigator.share) {
      // Fallback: copia link pra clipboard
      try {
        await navigator.clipboard.writeText(`${shareTxt} — ${shareUrl}`);
        setShareToast({ kind: "copied", network: "Link" });
      } catch {
        await downloadImage();
        setShareToast({ kind: "instagram_saved" });
      }
      return;
    }
    const result = await generateImageBlob();
    if (!result) return;
    try {
      const canShareFile =
        "canShare" in navigator && navigator.canShare?.({ files: [result.file] });
      if (canShareFile) {
        await navigator.share({
          title: data.title,
          text: shareTxt,
          files: [result.file],
        });
      } else {
        await navigator.share({
          title: data.title,
          text: shareTxt,
          url: shareUrl,
        });
      }
      setShareToast({ kind: "opened", network: "Compartilhar" });
    } catch {
      /* user cancelled */
    }
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

  const hasNativeShare =
    typeof navigator !== "undefined" && "share" in navigator;

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
              Compartilhe no Instagram, Facebook, WhatsApp ou publique no feed
              Longevify
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
          <div className="relative mx-auto aspect-square w-full max-w-[260px] overflow-hidden rounded-2xl shadow-lg">
            <canvas
              ref={previewRef}
              width={540}
              height={540}
              className="block h-full w-full"
            />
          </div>

          {/* Photo upload — Lucas (2026-05-24): "anexar uma fotinho sua" */}
          <div className="mt-3 flex justify-center gap-2">
            {photoDataUrl ? (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-[11.5px] font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Trocar foto
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoDataUrl(null)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-[11.5px] font-medium text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-1.5 text-[11.5px] font-semibold text-zinc-700 hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-700"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Anexar foto sua
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>

          {/* ─── Compartilhar em redes externas ─── */}
          <div className="mt-5">
            <label className="text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
              Compartilhar em
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
              <SocialShareButton
                label="Instagram"
                onClick={handleShareInstagram}
                bgClass="bg-gradient-to-br from-[#feda75] via-[#fa7e1e] via-50% to-[#d62976]"
                icon={<InstagramIcon />}
              />
              <SocialShareButton
                label="Facebook"
                onClick={handleShareFacebook}
                bgClass="bg-[#1877F2]"
                icon={<FacebookIcon />}
              />
              <SocialShareButton
                label="X"
                onClick={handleShareTwitter}
                bgClass="bg-black"
                icon={<XIcon />}
              />
              <SocialShareButton
                label="WhatsApp"
                onClick={handleShareWhatsApp}
                bgClass="bg-[#25D366]"
                icon={<WhatsAppIcon />}
              />
              <SocialShareButton
                label="Telegram"
                onClick={handleShareTelegram}
                bgClass="bg-[#229ED9]"
                icon={<TelegramIcon />}
              />
              <SocialShareButton
                label={hasNativeShare ? "Mais" : "Copiar"}
                onClick={handleShareNative}
                bgClass="bg-zinc-700"
                icon={<Share2 className="h-5 w-5 text-white" strokeWidth={2.5} />}
              />
            </div>
            <button
              type="button"
              onClick={handleDownload}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar imagem
            </button>
          </div>

          {/* Toast inline pro feedback de share */}
          {shareToast && (
            <div
              className={cn(
                "mt-3 rounded-xl px-3 py-2 text-[11.5px] leading-tight",
                shareToast.kind === "instagram_saved"
                  ? "border border-amber-200 bg-amber-50 text-amber-800"
                  : shareToast.kind === "error"
                    ? "border border-rose-200 bg-rose-50 text-rose-700"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-800",
              )}
            >
              {shareToast.kind === "instagram_saved" && (
                <>
                  📸 Imagem salva! Abra o Instagram e poste como{" "}
                  <strong>Story</strong> ou <strong>Feed</strong> selecionando a
                  imagem que foi baixada.
                </>
              )}
              {shareToast.kind === "opened" &&
                `✓ ${shareToast.network} aberto — imagem salva no seu dispositivo`}
              {shareToast.kind === "copied" &&
                `✓ ${shareToast.network} copiado pra área de transferência`}
              {shareToast.kind === "error" && shareToast.message}
            </div>
          )}

          {/* ─── Postar no feed Longevify ─── */}
          <div className="mt-5 rounded-2xl border border-brand-200/70 bg-brand-50/40 px-4 py-4">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-700 text-[12px] font-bold text-white">
                L
              </span>
              <div>
                <p className="text-[13px] font-semibold text-brand-900">
                  Postar no feed Longevify
                </p>
                <p className="text-[10.5px] text-brand-700/70">
                  Apareça no ranking e inspire seus amigos
                </p>
              </div>
            </div>

            {/* Visibility toggle */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility("friends")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[11.5px] font-semibold transition",
                  visibility === "friends"
                    ? "border-brand-400 bg-white text-brand-900"
                    : "border-zinc-200 bg-white/60 text-zinc-600 hover:bg-white",
                )}
              >
                <UsersIcon className="h-3.5 w-3.5" />
                Só amigos
              </button>
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[11.5px] font-semibold transition",
                  visibility === "public"
                    ? "border-amber-300 bg-white text-amber-900"
                    : "border-zinc-200 bg-white/60 text-zinc-600 hover:bg-white",
                )}
              >
                <Globe className="h-3.5 w-3.5" />
                Público
              </button>
            </div>

            <button
              type="button"
              onClick={handlePostFeed}
              disabled={postStatus === "posting" || postStatus === "posted"}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition disabled:opacity-60"
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
                <>Publicar no feed</>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {error}
            </div>
          )}
        </div>

        <footer className="border-t border-zinc-100 px-5 py-3 pb-[max(env(safe-area-inset-bottom),12px)]">
          <button
            type="button"
            onClick={onClose}
            disabled={postStatus === "posting"}
            className="w-full rounded-xl px-3 py-2 text-[12px] font-medium text-zinc-500 transition hover:bg-zinc-50 disabled:opacity-50"
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

// ─── Botão de rede social ─────────────────────────────────────────────

interface SocialShareButtonProps {
  label: string;
  onClick: () => void | Promise<void>;
  bgClass: string;
  icon: React.ReactNode;
}

function SocialShareButton({
  label,
  onClick,
  bgClass,
  icon,
}: SocialShareButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition hover:bg-zinc-50 active:scale-95"
    >
      <span
        className={cn(
          "grid h-11 w-11 place-items-center rounded-full shadow-sm transition group-hover:shadow-md",
          bgClass,
        )}
      >
        {icon}
      </span>
      <span className="text-[10.5px] font-semibold leading-tight text-zinc-700">
        {label}
      </span>
    </button>
  );
}

// ─── SVG das marcas (open-source, simple-icons style) ─────────────────
//
// lucide-react não tem ícones de marcas (Instagram/Facebook/etc) por
// questão de licença. Embutimos SVGs minimal aqui — paths são variantes
// genéricas do logotipo, dentro do uso comum permitido pra ícones de
// share. Cor white forçada porque o fundo já é a cor da marca.

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-white"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2.16c3.2 0 3.58.012 4.85.07 1.17.054 1.8.25 2.23.41.56.218.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.058 1.27.07 1.65.07 4.85s-.012 3.58-.07 4.85c-.054 1.17-.25 1.8-.41 2.23-.218.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.058-1.65.07-4.85.07s-3.58-.012-4.85-.07c-1.17-.054-1.8-.25-2.23-.41a3.7 3.7 0 01-1.38-.9 3.7 3.7 0 01-.9-1.38c-.16-.43-.36-1.06-.41-2.23C2.172 15.58 2.16 15.2 2.16 12s.012-3.58.07-4.85c.054-1.17.25-1.8.41-2.23.218-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41C8.42 2.172 8.8 2.16 12 2.16zm0 1.62c-3.13 0-3.5.012-4.74.068-1.07.05-1.65.226-2.04.376-.51.198-.88.435-1.27.823-.39.388-.625.757-.823 1.27-.15.39-.327.97-.376 2.04C2.7 8.5 2.69 8.87 2.69 12s.01 3.5.067 4.74c.05 1.07.226 1.65.376 2.04.198.51.435.88.823 1.27.388.39.757.625 1.27.823.39.15.97.327 2.04.376 1.24.056 1.61.068 4.74.068s3.5-.012 4.74-.068c1.07-.05 1.65-.226 2.04-.376.51-.198.88-.435 1.27-.823.39-.388.625-.757.823-1.27.15-.39.327-.97.376-2.04.056-1.24.068-1.61.068-4.74s-.012-3.5-.068-4.74c-.05-1.07-.226-1.65-.376-2.04a3.42 3.42 0 00-.823-1.27 3.42 3.42 0 00-1.27-.823c-.39-.15-.97-.327-2.04-.376C15.5 3.7 15.13 3.78 12 3.78zm0 2.76a5.46 5.46 0 110 10.92 5.46 5.46 0 010-10.92zm0 1.62a3.84 3.84 0 100 7.68 3.84 3.84 0 000-7.68zm5.65-2.88a1.28 1.28 0 11-2.56 0 1.28 1.28 0 012.56 0z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-white"
      fill="currentColor"
      aria-hidden
    >
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88V14.9H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.9h-2.33v6.98C18.34 21.13 22 16.99 22 12z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-white"
      fill="currentColor"
      aria-hidden
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-white"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.5 14.38c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15s-.77.97-.95 1.17c-.18.2-.35.22-.65.08-.3-.15-1.27-.47-2.42-1.5-.89-.8-1.49-1.77-1.67-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01s-.52.07-.8.37c-.27.3-1.05 1.02-1.05 2.5s1.07 2.9 1.22 3.1c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35zM12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2.05 22l5.25-1.38a9.94 9.94 0 004.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.92 0-2.65-1.03-5.14-2.9-7.01a9.83 9.83 0 00-7-2.9zm5.95 15.55a8.27 8.27 0 01-5.95 2.46h-.01a8.24 8.24 0 01-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 01-1.26-4.36c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.83c0 4.54-3.7 8.23-8.24 8.23z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-white"
      fill="currentColor"
      aria-hidden
    >
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
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
 *
 * Se `photoDataUrl` for passado, ela vira o background do card com
 * gradient overlay escuro pra stats ficarem legíveis.
 */
async function drawCanvasImage(
  cvs: HTMLCanvasElement | null,
  data: ShareWorkoutData,
  size: number,
  photoDataUrl?: string | null,
): Promise<void> {
  if (!cvs) return;
  const ctx = cvs.getContext("2d");
  if (!ctx) return;
  cvs.width = size;
  cvs.height = size;
  const s = size / 1080; // escala uniforme

  // Background — foto do user ou gradient brand
  if (photoDataUrl) {
    await drawPhotoCover(ctx, photoDataUrl, size);
    // Overlay gradient escuro pra texto ficar legível
    const overlay = ctx.createLinearGradient(0, 0, 0, size);
    overlay.addColorStop(0, "rgba(13,40,24,0.45)");
    overlay.addColorStop(0.55, "rgba(13,40,24,0.15)");
    overlay.addColorStop(1, "rgba(13,40,24,0.85)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, size, size);
  } else {
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
  }

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

/**
 * Carrega data URL como Image e desenha como cover (preenche todo o
 * canvas mantendo aspect ratio com crop central).
 */
function drawPhotoCover(
  ctx: CanvasRenderingContext2D,
  dataUrl: string,
  size: number,
): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Cover crop: escala pra preencher e centraliza
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (size - w) / 2;
      const y = (size - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      resolve();
    };
    img.onerror = () => resolve(); // falha silenciosa → fallback gradient
    img.src = dataUrl;
  });
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
