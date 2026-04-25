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
};

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0x7fffffff;
  return h;
}

function productGradient(product: Product): string {
  const palette = CATEGORY_GRADIENTS[product.category];
  return palette[hashId(product.id) % palette.length];
}

export function ProductImage({
  product,
  className,
  aspect = "square",
}: {
  product: Product;
  className?: string;
  aspect?: "square" | "tall" | "wide" | "compact";
}) {
  const gradient = productGradient(product);
  const initials = product.brand.slice(0, 1).toUpperCase();
  const aspectCls =
    aspect === "tall"
      ? "aspect-[4/5]"
      : aspect === "wide"
        ? "aspect-[16/10]"
        : aspect === "compact"
          ? "aspect-[16/7]"
          : "aspect-square";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[16px]",
        `bg-gradient-to-br ${gradient}`,
        aspectCls,
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,rgba(255,255,255,0.45),transparent_60%)]" />
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/85 drop-shadow">
          {product.brand}
        </span>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/25 text-[12px] font-semibold text-white backdrop-blur">
          {initials}
        </span>
      </div>
    </div>
  );
}
