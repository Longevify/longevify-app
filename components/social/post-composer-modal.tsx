"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  X,
  ImagePlus,
  Trash2,
  Globe,
  Users as UsersIcon,
  Loader2,
  AlertCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createSocialPostAction } from "@/app/(app)/fitness/share-actions";

/**
 * Lucas (2026-05-24):
 *  - "não achei um botão fácil de publicação de stories e de fotos na
 *    parte social. Quero que tenha isso"
 *  - "os botões/textos estão muito altos, não dá para clicar. e quero
 *    que use mais icones nessa parte"
 *  - "ideal é criar 2 botões, um para story e outro para foto"
 *
 * Composer compactado, modo `post` ou `story`:
 *  - story: força foto (obrigatória) + caption curta, expira em 24h
 *  - post: foto opcional + texto livre, permanente
 *
 * Layout mobile-first: header MUITO compacto (1 linha só), foto e
 * controles ocupam o resto do viewport — Publicar é um botão chunky
 * fixo no rodapé pra ser sempre alcançável (Lucas reclamou de
 * "botões muito altos").
 */

export type ComposerMode = "post" | "story";

export function PostComposerModal({
  open,
  mode,
  onClose,
  onPosted,
}: {
  open: boolean;
  mode: ComposerMode;
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

  // Reset quando abre
  useEffect(() => {
    if (open) {
      setBody("");
      setPhotoDataUrl(null);
      setError(null);
      setPosting(false);
      // Pra story, abre file picker direto — UX Insta-style
      if (mode === "story") {
        // Pequeno delay pra dialog terminar de montar
        setTimeout(() => fileInputRef.current?.click(), 100);
      }
    }
  }, [open, mode]);

  if (!open) return null;

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      setError("Foto muito grande — máximo 12MB.");
      return;
    }
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
    if (mode === "story" && !photoDataUrl) {
      setError("Story precisa de foto.");
      return;
    }
    if (mode === "post" && !text && !photoDataUrl) {
      setError("Escreva algo ou anexe uma foto.");
      return;
    }
    setPosting(true);
    setError(null);
    startPosting(async () => {
      const payload: Parameters<typeof createSocialPostAction>[0]["payload"] = {
        title:
          mode === "story"
            ? text || "Compartilhou um story"
            : text || "Compartilhou um momento",
        body: text || undefined,
        imageUrl: photoDataUrl ?? undefined,
      };
      if (mode === "story") {
        // expira em 24h
        const exp = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        payload.expiresAt = exp;
      }

      const res = await createSocialPostAction({
        kind: mode === "story" ? "story" : "milestone",
        payload,
        visibility,
      });
      setPosting(false);
      if (res.ok) {
        onPosted?.();
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  const canPublish =
    mode === "story" ? !!photoDataUrl : !!photoDataUrl || !!body.trim();

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
      <div className="relative z-10 flex h-full max-h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90dvh] sm:max-w-[520px] sm:rounded-3xl">
        {/* Header — só X + título. safe-area-inset-top respeita notch
            do iPhone. Lucas (2026-05-25): "os botões/textos estão muito
            altos, não dá para clicar" → tirei o Publicar daqui pro
            footer fixo no bottom (sempre alcançável com o polegar). */}
        <header
          className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2.5"
          style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}
        >
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
            <h2 className="truncate text-[15px] font-semibold leading-tight text-zinc-900">
              {mode === "story" ? "Novo story" : "Nova publicação"}
            </h2>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
          {/* Foto: pra story toma a tela; pra post é placeholder ou preview */}
          {photoDataUrl ? (
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoDataUrl}
                alt="Pré-visualização"
                className={cn(
                  "block w-full",
                  mode === "story"
                    ? "max-h-[60dvh] object-cover"
                    : "max-h-[400px] object-cover",
                )}
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
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-12 transition hover:border-brand-400 hover:bg-brand-50/40"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-700 text-white shadow-md">
                <ImagePlus className="h-5 w-5" />
              </span>
              <span className="text-[13px] font-semibold text-zinc-700">
                {mode === "story" ? "Toque pra escolher foto" : "Anexar foto"}
              </span>
              {mode === "post" && (
                <span className="text-[11px] text-zinc-500">opcional</span>
              )}
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

          {/* Textarea — compacta */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              mode === "story" ? "Legenda (opcional)" : "Conte pros amigos…"
            }
            rows={mode === "story" ? 2 : 4}
            maxLength={mode === "story" ? 200 : 2000}
            // text-[16px] obrigatório pra iOS Safari não dar zoom
            className="mt-3 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[16px] leading-relaxed text-zinc-800 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
          />

          {/* Visibility — chips compactos */}
          <div className="mt-3 grid grid-cols-2 gap-2">
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
              <UsersIcon className="h-3 w-3" />
              Amigos
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
              <Globe className="h-3 w-3" />
              Público
            </button>
          </div>

          {mode === "story" && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-[11.5px] text-brand-900">
              <Zap className="h-3 w-3" />
              Story some em 24 horas, igual no Instagram.
            </p>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer fixo no bottom com botão Publicar grande — Lucas
            (2026-05-25): "ainda tem algumas seções que os botões estão
            la no topo do celular e com isso eu não consigo clicar
            (quando eu clico em adicionar story)". Bottom é sempre
            alcançável com o polegar. safe-area-inset-bottom evita
            ficar atrás do home indicator do iPhone. */}
        <div
          className="border-t border-zinc-100 bg-white px-4 pt-3"
          style={{
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          }}
        >
          <button
            type="button"
            onClick={publish}
            disabled={posting || !canPublish}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 px-5 py-3.5 text-[15px] font-semibold text-white shadow-md transition active:scale-[0.99] disabled:opacity-50"
          >
            {posting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publicando…
              </>
            ) : (
              "Publicar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
