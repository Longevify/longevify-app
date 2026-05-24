"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  Download,
  Copy,
  Check,
  ImageIcon,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PRODUCTS } from "@/lib/products";

/**
 * UI do admin Higgsfield. Workflow:
 *  1. Lucas escolhe um produto da loja (preenche prompt sugerido) OU
 *     escreve um prompt do zero.
 *  2. Pode tunar aspect ratio, seed e model.
 *  3. Botão "Gerar" → fetch /api/admin/higgsfield/generate
 *  4. Resultado mostrado lado-a-lado com a foto atual (quando há produto)
 *  5. Botões: baixar PNG, copiar URL, gerar nova versão.
 */

const ASPECT_RATIOS: Array<{ value: string; label: string }> = [
  { value: "1:1", label: "Quadrado (1:1)" },
  { value: "4:5", label: "Vertical (4:5)" },
  { value: "3:4", label: "Retrato (3:4)" },
  { value: "9:16", label: "Story (9:16)" },
  { value: "16:9", label: "Wide (16:9)" },
];

const QUALITIES: Array<{ value: "720p" | "1080p"; label: string; hint: string }> =
  [
    { value: "720p", label: "720p (rápido)", hint: "~5-10s, mais barato" },
    {
      value: "1080p",
      label: "1080p (recomendado)",
      hint: "~10-30s, qualidade pra catálogo",
    },
  ];

function suggestPromptForProduct(name: string, brand: string): string {
  // Background #e8e4db é a paleta dos produtos atuais da loja
  return [
    `Professional product photography of ${name} supplement bottle by ${brand}.`,
    "Studio lighting, soft shadows, centered composition, hyperrealistic detail.",
    "Background: neutral warm beige #e8e4db, seamless paper backdrop.",
    "Label is clearly legible. Brand identity is clean and premium.",
    "No human hands, no text overlays, no logos other than the product label.",
    "8k, sharp focus, e-commerce style, ready for white-label catalog.",
  ].join(" ");
}

export function HiggsfieldClient() {
  const [selectedProductId, setSelectedProductId] = useState<string | "custom">(
    "custom",
  );
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quality, setQuality] = useState<"720p" | "1080p">("1080p");
  const [seed, setSeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedProduct = useMemo(
    () => PRODUCTS.find((p) => p.id === selectedProductId) ?? null,
    [selectedProductId],
  );

  const onProductChange = (id: string) => {
    setSelectedProductId(id);
    const product = PRODUCTS.find((p) => p.id === id);
    if (product) {
      setPrompt(suggestPromptForProduct(product.name, product.brand));
    } else if (id === "custom") {
      setPrompt("");
    }
  };

  const submit = async () => {
    if (prompt.trim().length < 4) {
      setError("Escreva um prompt antes (mínimo 4 caracteres).");
      return;
    }
    setLoading(true);
    setError(null);
    setResultUrl(null);
    try {
      const seedNum = seed ? parseInt(seed, 10) : undefined;
      const res = await fetch("/api/admin/higgsfield/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          quality,
          seed: Number.isFinite(seedNum) ? seedNum : undefined,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setResultUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const downloadResult = () => {
    if (!resultUrl) return;
    // Fetch + download como blob (CDN URL pode ter CORS quebrado pra
    // download direto)
    fetch(resultUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = selectedProduct
          ? `longevify-${selectedProduct.id}.png`
          : `higgsfield-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        // Fallback: abre numa aba pra Lucas salvar manualmente
        window.open(resultUrl, "_blank");
      });
  };

  const copyUrl = () => {
    if (!resultUrl) return;
    navigator.clipboard.writeText(resultUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link
          href="/admin"
          className="text-[12px] text-zinc-500 hover:text-brand-700"
        >
          ← Admin
        </Link>
        <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight">
          <Sparkles className="mr-1 inline h-5 w-5 text-brand-700" />
          Higgsfield — fotos de produtos
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          Gera foto AI alinhada com a paleta da loja (fundo bege #e8e4db).
          Baixe e commite em <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px]">public/marketplace/</code>.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Coluna esquerda — controles */}
        <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Produto (opcional — preenche prompt)
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => onProductChange(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13px] text-zinc-800 focus:border-brand-400 focus:outline-none"
            >
              <option value="custom">— Prompt livre —</option>
              {PRODUCTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand} · {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={9}
              placeholder="Descreva a foto desejada (em inglês funciona melhor)."
              className="mt-1.5 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[12.5px] leading-relaxed text-zinc-800 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Proporção
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13px] text-zinc-800 focus:border-brand-400 focus:outline-none"
              >
                {ASPECT_RATIOS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Seed (opcional)
              </label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="ex: 1234"
                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Qualidade
            </label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as "720p" | "1080p")}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13px] text-zinc-800 focus:border-brand-400 focus:outline-none"
            >
              {QUALITIES.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label} — {q.hint}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10.5px] text-zinc-500">
              Modelo: Higgsfield Soul (text-to-image)
            </p>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 px-5 py-3 text-[14px] font-semibold text-white shadow-md transition disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando… (5-30s)
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar imagem
              </>
            )}
          </button>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] text-rose-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* Coluna direita — preview */}
        <section className="flex flex-col gap-3">
          {selectedProduct && selectedProduct.image && (
            <div>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Foto atual
              </h3>
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                <div className="relative aspect-square w-full">
                  <Image
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Resultado AI
            </h3>
            <div
              className={cn(
                "overflow-hidden rounded-2xl border bg-zinc-50",
                resultUrl ? "border-brand-300" : "border-dashed border-zinc-300",
              )}
            >
              <div className="relative aspect-square w-full">
                {resultUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={resultUrl}
                    alt="Resultado Higgsfield"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                ) : loading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-[12px]">Gerando imagem…</span>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-[12px]">Clique em Gerar pra começar</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {resultUrl && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={downloadResult}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-brand-800"
              >
                <Download className="h-3.5 w-3.5" />
                Baixar PNG
              </button>
              <button
                type="button"
                onClick={copyUrl}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-[12.5px] font-semibold transition",
                  copied
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> URL copiada
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copiar URL
                  </>
                )}
              </button>
            </div>
          )}

          {selectedProduct && resultUrl && selectedProduct.image && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] leading-relaxed text-amber-900">
              💡 Pra usar essa foto: baixe o PNG e salve em{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5 text-[10.5px]">
                public/marketplace/{selectedProduct.image.split("/").pop()}
              </code>{" "}
              (sobrescreve o atual). Aí dá commit.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
