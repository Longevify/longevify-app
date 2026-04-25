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

export function ProductCard({
  product,
  className,
  highlight,
  reason,
  size = "default",
}: {
  product: Product;
  className?: string;
  highlight?: boolean;
  reason?: string;
  /**
   * `default` — full card with square image, used in /loja grid.
   * `compact` — small horizontal card for recommendation strips on Home.
   */
  size?: "default" | "compact";
}) {
  const isCompact = size === "compact";

  return (
    <Link
      href={`/loja/${product.id}`}
      className={cn("group block focus-visible:outline-none", className)}
    >
      <Card
        className={cn(
          "flex h-full transition-shadow hover:shadow-[0_6px_20px_rgba(13,40,24,.08)]",
          isCompact ? "flex-row gap-3 p-3" : "flex-col gap-3 p-4",
          highlight && "border-brand-300",
        )}
      >
        <div className={cn("relative", isCompact ? "w-24 shrink-0" : "")}>
          <ProductImage
            product={product}
            aspect={isCompact ? "square" : "wide"}
            className={isCompact ? "h-full" : ""}
          />
          {!isCompact && (
            <div className="absolute left-2 top-2 flex gap-1.5">
              {highlight && (
                <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
                  Pra você
                </span>
              )}
              {product.badge && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    BADGE_STYLES[product.badge],
                  )}
                >
                  {product.badge}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.12em] text-muted truncate">
              {product.brand}
            </span>
            {isCompact && highlight ? (
              <span className="rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-700">
                Pra você
              </span>
            ) : null}
          </div>
          <h3
            className={cn(
              "font-semibold leading-snug text-ink group-hover:text-brand-700",
              isCompact ? "text-[13px] line-clamp-2" : "text-[15px]",
            )}
          >
            {product.name}
          </h3>
          {!isCompact && (
            <p className="line-clamp-2 text-[12.5px] text-muted">
              {product.shortDescription}
            </p>
          )}
          {reason ? (
            <p
              className={cn(
                "rounded-lg bg-brand-50/80 px-2 py-1.5 leading-snug text-brand-800",
                isCompact ? "text-[10.5px] line-clamp-2 mt-0.5" : "text-[11.5px] line-clamp-3 mt-1",
              )}
            >
              {reason}
            </p>
          ) : null}

          <div
            className={cn(
              "flex items-center justify-between gap-2",
              isCompact
                ? "mt-1"
                : "mt-1 border-t border-border/70 pt-3",
            )}
          >
            <PriceTag value={product.priceBRL} />
            <span className="inline-flex items-center gap-1 text-[11px] text-muted">
              <Star className="h-3 w-3 fill-[#E6B845] text-[#E6B845]" />
              {product.rating.toFixed(1)}
              {!isCompact && (
                <span className="text-muted/70">({product.reviewsCount})</span>
              )}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
