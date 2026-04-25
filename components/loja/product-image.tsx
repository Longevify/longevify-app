import { cn } from "@/lib/utils";
import type { Product, ProductCategory } from "@/lib/products";

const CATEGORY_GRADIENTS: Record<ProductCategory, string> = {
  exame: "from-[#DFF5E9] via-[#C9E9D6] to-[#9FD4B3]",
  suplemento: "from-[#E7F5EC] via-[#9FD4B3] to-[#6DBA8E]",
  "longevify-original": "from-[#F4FAF6] via-[#E7F5EC] to-[#C9E9D6]",
  wearable: "from-[#1F2A26] via-[#3B4B43] to-[#9FB3AA]",
  equipamento: "from-[#E7F0FD] via-[#B8D2F4] to-[#2562A8]",
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
 * 2. Senão, usa gradient placeholder com a inicial da marca.
 */
export function ProductImage({
  product,
  className,
  aspect = "square",
}: ProductImageProps) {
  if (product.image) {
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
        />
      </div>
    );
  }

  // Fallback gradient placeholder
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
