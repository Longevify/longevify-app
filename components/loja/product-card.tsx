import Link from "next/link";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Product, ProductBadge } from "@/lib/products";
import { ProductImage } from "./product-image";
import { PriceTag } from "./price-tag";

const BADGE_STYLES: Record<ProductBadge, string> = {
  Top: "bg-[#FBF0D4] text-[#8A6A13]",
  Novo: "bg-[#DFF5E9] text-[#0E7B45]",
  Exclusivo: "bg-brand-900 text-brand-100",
  Curadoria: "bg-[#E7ECFD] text-[#3B44C2]",
};

interface ProductCardProps {
  product: Product;
  className?: string;
  highlight?: boolean;
  reason?: string;
  /**
   * `default` — full card with vertical image (used in /loja grid).
   * `compact` — small horizontal card (used in Home recommendations).
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
  if (size === "compact") return <CompactCard {...{ product, className, highlight, reason }} />;
  return <DefaultCard {...{ product, className, highlight, reason }} />;
}

// ──────────────────────────────────────────────────────────────────
// Default vertical card
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
      className={cn("group block focus-visible:outline-none", className)}
    >
      <Card
        className={cn(
          "flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-[0_6px_20px_rgba(13,40,24,.08)]",
          highlight && "border-brand-300",
        )}
      >
        <div className="relative">
          <ProductImage product={product} aspect="wide" />
          <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
            {highlight ? <BadgePill className="bg-brand-500 text-white">Pra você</BadgePill> : null}
            {product.badge ? (
              <BadgePill className={BADGE_STYLES[product.badge]}>{product.badge}</BadgePill>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
          <span className="text-[10.5px] uppercase tracking-[0.12em] text-muted truncate">
            {product.brand}
          </span>
          <h3 className="text-[14.5px] font-semibold leading-snug text-ink group-hover:text-brand-700 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-[12px] text-muted line-clamp-2">
            {product.shortDescription}
          </p>
          {reason ? (
            <p className="mt-1 rounded-lg bg-brand-50/80 px-2.5 py-2 text-[11.5px] leading-snug text-brand-800 line-clamp-3">
              {reason}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border/70 pt-3">
          <PriceTag value={product.priceBRL} />
          <span className="inline-flex items-center gap-1 text-[12px] text-muted">
            <Star className="h-3.5 w-3.5 fill-[#E6B845] text-[#E6B845]" />
            {product.rating.toFixed(1)}
            <span className="text-muted/70">({product.reviewsCount})</span>
          </span>
        </div>
      </Card>
    </Link>
  );
}

// ──────────────────────────────────────────────────────────────────
// Compact horizontal card — for recommendation strips
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
      <Card
        className={cn(
          "flex h-full items-stretch gap-3 p-3 transition-shadow hover:shadow-[0_4px_14px_rgba(13,40,24,.06)]",
          highlight && "border-brand-300",
        )}
      >
        <div className="relative h-20 w-20 flex-none">
          <ProductImage product={product} aspect="square" className="h-full w-full" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-muted">
            <span className="truncate">{product.brand}</span>
            {highlight ? (
              <span className="rounded-full bg-brand-500/15 px-1.5 py-0.5 font-semibold tracking-wide text-brand-700">
                pra você
              </span>
            ) : null}
          </div>
          <h3 className="mt-0.5 text-[13px] font-semibold leading-tight text-ink group-hover:text-brand-700 line-clamp-2">
            {product.name}
          </h3>
          {reason ? (
            <p className="mt-1 text-[11px] leading-snug text-muted line-clamp-2">
              {reason}
            </p>
          ) : null}
          <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
            <PriceTag value={product.priceBRL} compact />
            <span className="inline-flex items-center gap-0.5 text-[11px] text-muted">
              <Star className="h-3 w-3 fill-[#E6B845] text-[#E6B845]" />
              {product.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function BadgePill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        className,
      )}
    >
      {children}
    </span>
  );
}
