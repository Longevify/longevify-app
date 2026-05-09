"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Product, ProductCategory } from "@/lib/products";

const CATEGORY_GRADIENTS: Record<ProductCategory, string> = {
  exame: "from-[#DFF5E9] via-[#C9E9D6] to-[#9FD4B3]",
  suplemento: "from-[#E7F5EC] via-[#9FD4B3] to-[#6DBA8E]",
  "longevify-original": "from-[#F4FAF6] via-[#E7F5EC] to-[#C9E9D6]",
};

const ASPECT: Record<NonNullable<ProductImageProps["aspect"]>, string> = {
  square: "aspect-square",
  tall: "aspect-[4/5]",
  wide: "aspect-[16/10]",
  compact: "aspect-[16/7]",
};

interface ProductImageProps {
  product: Product;
  className?: string;
  aspect?: "square" | "tall" | "wide" | "compact";
}

/**
 * Renderização do produto:
 * 1. Se tem `product.image`, mostra a foto real centralizada num fundo neutro
 *    cinza-clarinho (estilo superpower.com — produto "flutuando" no card).
 * 2. Senão (ou se a imagem falhar ao carregar), usa gradient placeholder com
 *    a inicial da marca. O onError evita o quadrado preto quando a URL da
 *    imagem retorna 404 ou falha de rede (C4).
 */
export function ProductImage({
  product,
  className,
  aspect = "square",
}: ProductImageProps) {
  // C4 — controla fallback quando a imagem real falha ao carregar em runtime
  const [imgError, setImgError] = useState(false);

  if (product.image && !imgError) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-[16px] bg-[#F5F5F4]",
          ASPECT[aspect],
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.name}
          className="absolute inset-0 h-full w-full object-contain p-4"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback gradient placeholder — também usado quando onError dispara
  const gradient = CATEGORY_GRADIENTS[product.category];
  const initial = product.brand.slice(0, 1).toUpperCase();
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[16px]",
        `bg-gradient-to-br ${gradient}`,
        ASPECT[aspect],
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,rgba(255,255,255,0.4),transparent_60%)]"
      />
      <span
        aria-hidden
        className="absolute inset-0 grid place-items-center font-semibold tracking-tight text-white/85 select-none"
        style={{ fontSize: "min(48%, 56px)", letterSpacing: "-0.04em" }}
      >
        {initial}
      </span>
    </div>
  );
}
