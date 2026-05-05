import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Product, ProductBadge } from "@/lib/products";
import { ProductImage } from "./product-image";
import { PriceTag } from "./price-tag";
import { QuickAddButton } from "./quick-add-button";
import { QuickSubscribeButton } from "./quick-subscribe-button";

const BADGE_STYLES: Record<ProductBadge, string> = {
  "Mais Vendido": "text-[#D7411F]",
  "Melhor Custo": "text-[#D7411F]",
  Top: "text-[#D7411F]",
  Novo: "text-[#0E7B45]",
  Exclusivo: "text-brand-700",
  Curadoria: "text-[#3B44C2]",
};

interface ProductCardProps {
  product: Product;
  className?: string;
  highlight?: boolean;
  reason?: string;
  /**
   * `default` — full square card no estilo superpower.com (Loja).
   * `compact` — horizontal pequeno pra recomendações na Home.
   */
  size?: "default" | "compact";
}

export function ProductCard({
  product,
  className,
  highlight,
  reason,
  size = "default",
}: ProductCardProps) {
  if (size === "compact") {
    return (
      <CompactCard
        product={product}
        className={className}
        highlight={highlight}
        reason={reason}
      />
    );
  }
  return (
    <DefaultCard
      product={product}
      className={className}
      highlight={highlight}
      reason={reason}
    />
  );
}

// ──────────────────────────────────────────────────────────────────
// Default card — superpower.com style
// ──────────────────────────────────────────────────────────────────
function DefaultCard({
  product,
  className,
  highlight,
  reason,
}: Omit<ProductCardProps, "size">) {
  return (
    <Link
      href={`/loja/${product.id}`}
      className={cn(
        "group block focus-visible:outline-none",
        className,
      )}
    >
      <div className="flex h-full flex-col">
        {/* H14: imagem limitada a max-h-48 em mobile (1 col) para não dominar o viewport */}
        {/* Em sm+ volta ao aspect-square padrão sem restrição de altura */}
        <div className="relative">
          <ProductImage
            product={product}
            aspect="square"
            className="max-h-48 sm:max-h-none transition-transform duration-200 group-hover:scale-[1.01]"
          />
          <QuickAddButton product={product} overlay />
          <QuickSubscribeButton product={product} overlay />
        </div>

        {/* Texto abaixo da imagem (sem card box, estilo limpo) */}
        <div className="flex flex-1 flex-col gap-1 px-1 pt-3">
          {/* Linha 1: badge colorido (se houver) */}
          {(highlight || product.badge) && (
            <div className="text-[12.5px] font-semibold tracking-tight">
              {highlight ? (
                <span className="text-brand-700">Pra você</span>
              ) : product.badge ? (
                <span className={BADGE_STYLES[product.badge]}>
                  {product.badge}
                </span>
              ) : null}
            </div>
          )}

          {/* Linha 2: kicker cinza */}
          <div className="text-[12.5px] text-muted">{product.kicker}</div>

          {/* Linha 3: nome do produto */}
          <h3 className="text-[18px] font-semibold leading-tight text-ink group-hover:text-brand-700">
            {product.name}
          </h3>

          {/* Linha 4: preço */}
          <div className="mt-1">
            <PriceTag value={product.priceBRL} size="md" />
          </div>

          {/* Reason (apenas se vier de recomendação) */}
          {reason ? (
            <p className="mt-2 line-clamp-3 rounded-lg bg-brand-50/80 px-2.5 py-2 text-[11.5px] leading-snug text-brand-800">
              {reason}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

// ──────────────────────────────────────────────────────────────────
// Compact horizontal card — recommendation strips on Home
// ──────────────────────────────────────────────────────────────────
function CompactCard({
  product,
  className,
  highlight,
  reason,
}: Omit<ProductCardProps, "size">) {
  return (
    <Link
      href={`/loja/${product.id}`}
      className={cn("group block focus-visible:outline-none", className)}
    >
      <div
        className={cn(
          "flex h-full items-stretch gap-3 rounded-[16px] border border-border bg-white p-3 transition-shadow hover:shadow-[0_4px_14px_rgba(13,40,24,.06)]",
          highlight && "border-brand-300",
        )}
      >
        <div className="relative h-20 w-20 flex-none">
          <ProductImage
            product={product}
            aspect="square"
            className="h-full w-full"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-muted">
            <span className="truncate">{product.kicker}</span>
            {highlight ? (
              <span className="rounded-full bg-brand-500/15 px-1.5 py-0.5 font-semibold tracking-wide text-brand-700">
                pra você
              </span>
            ) : null}
          </div>
          <h3 className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-tight text-ink group-hover:text-brand-700">
            {product.name}
          </h3>
          {reason ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted">
              {reason}
            </p>
          ) : null}
          <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
            <PriceTag value={product.priceBRL} compact />
            <div className="flex items-center gap-1.5">
              <QuickSubscribeButton product={product} />
              <QuickAddButton product={product} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
