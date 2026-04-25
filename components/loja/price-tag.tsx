import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/products";

export function PriceTag({
  value,
  size = "md",
  compact,
  className,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  /** alias para `size="sm"` — usado pra padronizar com cards compactos */
  compact?: boolean;
  className?: string;
}) {
  const effective = compact ? "sm" : size;
  const sizeCls =
    effective === "lg"
      ? "text-[28px]"
      : effective === "sm"
        ? "text-[13.5px]"
        : "text-[18px]";
  return (
    <span
      className={cn("font-semibold tracking-tight text-ink", sizeCls, className)}
    >
      {formatBRL(value)}
    </span>
  );
}
