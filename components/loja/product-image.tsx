import { cn } from "@/lib/utils";
import type { Product, ProductCategory } from "@/lib/products";

const CATEGORY_GRADIENTS: Record<ProductCategory, string[]> = {
  suplemento: [
    "from-[#DFF5E9] via-[#C9E9D6] to-[#9FD4B3]",
    "from-[#E7F5EC] via-[#9FD4B3] to-[#6DBA8E]",
    "from-[#F4FAF6] via-[#C9E9D6] to-[#3F9A6B]",
  ],
  "longevify-original": [
    "from-[#0D2818] via-[#1F5D3F] to-[#3F9A6B]",
    "from-[#123E2A] via-[#2A7A53] to-[#6DBA8E]",
  ],
  wearable: [
    "from-[#0F1F19] via-[#2A3B34] to-[#6B7A74]",
    "from-[#1F2A26] via-[#3B4B43] to-[#9FB3AA]",
  ],
  equipamento: [
    "from-[#E7F0FD] via-[#B8D2F4] to-[#2562A8]",
    "from-[#FCEBD8] via-[#E8C8A0] to-[#A8651B]",
  ],
  exame: [
    "from-[#FEF3F0] via-[#FBD9C4] to-[#E89B6B]",
    "from-[#F3E7FD] via-[#D4B8F4] to-[#7E55B8]",
  ],
};

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++)
    h = (h * 31 + id.charCodeAt(i)) & 0x7fffffff;
  return h;
}

function productGradient(product: Product): string {
  const palette = CATEGORY_GRADIENTS[product.category];
  return palette[hashId(product.id) % palette.length];
}

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
  /** quando `true`, usa o brand como rótulo grande no canto. Default `false` (sem texto). */
  showBrand?: boolean;
}

/**
 * Placeholder visual: gradient brando + inicial da marca no centro.
 * Sem texto extra na imagem — o brand fica no card de fora.
 */
export function ProductImage({
  product,
  className,
  aspect = "square",
  showBrand = false,
}: ProductImageProps) {
  const gradient = productGradient(product);
  const initial = product.brand.slice(0, 1).toUpperCase();

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[14px]",
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
        className="absolute inset-0 grid place-items-center text-white/85 font-semibold tracking-tight select-none"
        style={{ fontSize: "min(48%, 56px)", letterSpacing: "-0.04em" }}
      >
        {initial}
      </span>
      {showBrand ? (
        <span
          aria-hidden
          className="absolute bottom-2 left-2 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-white/90 backdrop-blur"
        >
          {product.brand}
        </span>
      ) : null}
    </div>
  );
}
