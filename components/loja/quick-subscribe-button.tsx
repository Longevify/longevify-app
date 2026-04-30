"use client";

import { useState, type MouseEvent } from "react";
import { Check, Repeat } from "lucide-react";
import { useCart } from "@/lib/cart/store";
import { toast } from "@/lib/toast";
import { recommendInterval, type Product } from "@/lib/products";
import { cn } from "@/lib/utils";

interface QuickSubscribeButtonProps {
  product: Product;
  className?: string;
  /** Quando `true`, fica em cima da imagem (canto inferior direito).
   *  Padrão é `false` — botão renderiza inline. */
  overlay?: boolean;
}

/**
 * Botão complementar ao QuickAddButton: adiciona o produto ao carrinho
 * já como assinatura recorrente, usando a frequência recomendada
 * (ex: 60 cápsulas, 1/dia → a cada 2 meses).
 *
 * Renderiza `null` pra produtos que não suportam recorrência (exames,
 * wearables sem consumível) — caller pode confiar nisso pra hide o botão.
 */
export function QuickSubscribeButton({
  product,
  className,
  overlay,
}: QuickSubscribeButtonProps) {
  const { addItem, openCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const recommendation = recommendInterval(product);
  if (!recommendation) return null;

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    // Card inteiro é um <Link>; interceptar pra não navegar pra /loja/[id].
    e.preventDefault();
    e.stopPropagation();

    addItem(product.id, {
      quantity: 1,
      recurring: true,
      recurringIntervalDays: recommendation!.intervalDays,
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
    toast.success({
      title: "Assinatura adicionada",
      description: `${product.name} · ${recommendation!.label}`,
      action: { label: "Ver carrinho", onClick: openCart },
    });
  }

  const Icon = justAdded ? Check : Repeat;
  const label = justAdded ? "Assinatura adicionada" : "Assinar";
  const ariaLabel = `Assinar ${product.name} (${recommendation.label})`;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-live="polite"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-all",
        "border border-brand-700 bg-brand-700 text-white shadow-[0_1px_3px_rgba(13,40,24,.18)]",
        "hover:bg-brand-800",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
        justAdded && "bg-brand-800",
        overlay
          ? "absolute right-2 top-12 z-10 h-9 w-9 p-0"
          : "h-9 px-3 text-[13px]",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
      {!overlay ? <span>{label}</span> : null}
      {overlay ? <span className="sr-only">{label}</span> : null}
    </button>
  );
}
