import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/products";

export function PriceTag({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeCls =
    size === "lg"
      ? "text-[28px]"
      : size === "sm"
        ? "text-[14px]"
        : "text-[18px]";
  return (
    <span
      className={cn("font-semibold tracking-tight text-ink", sizeCls, className)}
    >
      {formatBRL(value)}
    </span>
  );
}
