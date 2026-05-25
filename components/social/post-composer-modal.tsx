"use client";

import { useRef, useState, useTransition } from "react";
import {
  X,
  ImagePlus,
  Trash2,
  Globe,
  Users as UsersIcon,
  Loader2,
  Send,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createSocialPostAction } from "@/app/(app)/fitness/share-actions";

/**
 * Lucas (2026-05-24): "não achei um botão fácil de publicação de
 * stories e de fotos na parte social. Quero que tenha isso"
 *
 * Composer simples pra publicar texto + foto opcional no feed Longevify.
 * Foto vai como dataURL embedded no payload (max ~500KB após compress).
 *
 * Crucial: compress imagem client-side antes de salvar pra não bloar o
 * jsonb payload. Reduz pra max 1080px lado maior + JPEG quality 0.82.
 */
export function PostComposerModal({
  open,
  onClose,
  onPosted,
}: {
  open: boolean;
  onClose: () => void;
  onPosted?: () => void;
}) {
  const [body, setBody] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"friends" | "public">("friends");
  const [, startPosting] = useTransition();
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      setError("Foto muito grande — máximo 12MB.");
      return;
    }
    // Carrega + redimensiona pra max 1080px lado maior, JPEG 0.82
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 1080;
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          if (width >= height) {
            height = Math.round((height * maxSide) / width);
            width = maxSide;
          } else {
            width = Math.round((width * maxSide) / height);
            height = maxSide;
          }
        }
        const cvs = document.createElement("canvas");
        cvs.width = width;
        cvs.height = height;
        const ctx = cvs.getContext("2d");
        if (!ctx) {
          setError("Erro processando foto.");
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = cvs.toDataURL("image/jpeg", 0.82);
        setPhotoDataUrl(compressed);
        setError(null);
      };
      img.onerror = () => setError("Não consegui ler essa imagem.");
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const publish = () => {
    const text = body.trim();
    if (!text && !photoDataUrl) {
      setError("Escreva algo ou anexe uma foto.");
      return;
    }
    setPosting(true);
    setError(null);
    startPosting(async () => {
      const res = await createSocialPostAction({
        kind: "milestone",
        payload: {
          title: text || "Compartilhou um momento",
          body: text,
          imageUrl: photoDataUrl ?? undefined,
        },
        visibility,
      });
      setPosting(false);
      if (res.ok) {
        setBody("");
        setPhotoDataUrl(null);
        onPosted?.();
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-full max-h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[88dvh] sm:max-w-[520px] sm:rounded-3xl">
        <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3.5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            disabled={posting}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[16px] font-semibold leading-tight text-zinc-900">
              Publicar no feed
            </h2>
            <p className="mt-0.5 truncate text-[12px] text-zinc-500">
              Foto, texto ou os dois — pros seus amigos verem
            </p>
          </div>
          <button
            type="button"
            onClick={publish}
            disabled={posting || (!body.trim() && !photoDataUrl)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-br from-brand-700 to-brand-800 px-4 text-[13px] font-semibold text-white shadow-sm transition disabled:opacity-50"
          >
            {posting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Publicar
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Foto preview */}
          {photoDataUrl ? (
            <div className="relative mb-4 overflow-hidden rounded-2xl border border-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoDataUrl}
                alt="Pré-visualização"
                className="block h-auto max-h-[400px] w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setPhotoDataUrl(null)}
                aria-label="Remover foto"
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-10 text-[13px] font-semibold text-zinc-600 transition hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-700"
            >
              <ImagePlus className="h-5 w-5" />
              Anexar foto
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            className="hidden"
          />

          {/* Texto */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Como foi? Conte pros amigos…"
            rows={5}
            maxLength={2000}
            autoFocus
            // text-[16px] obrigatório pra iOS Safari NÃO dar zoom
            className="w-full resize-y rounded-2xl border border-zinc-200 bg-white px-3.5 py-3 text-[16px] leading-relaxed text-zinc-800 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
          />
          <div className="mt-1 text-right text-[10.5px] text-zinc-400 tabular-nums">
            {body.length} / 2000
          </div>

          {/* Visibility */}
          <div className="mt-4">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Quem vê esse post?
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility("friends")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition",
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
                  "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition",
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
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
