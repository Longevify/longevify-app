"use client";

import { useState, type MouseEvent } from "react";
import { Check, Plus } from "lucide-react";
import { useCart } from "@/lib/cart/store";
import { toast } from "@/lib/toast";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

interface QuickAddButtonProps {
  product: Product;
  className?: string;
  /** Quando `true`, fica em cima da imagem (canto superior direito).
   *  Padrão é `false` — botão renderiza inline. */
  overlay?: boolean;
}

/**
 * Botão pequeno pra adicionar ao carrinho direto do card da loja, sem
 * abrir a página de detalhe. Renderiza como filho do <Link> do card mas
 * intercepta o clique pra não navegar.
 */
export function QuickAddButton({
  product,
  className,
  overlay,
}: QuickAddButtonProps) {
  const { addItem, openCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    // Card inteiro é um <Link>; interceptar pra não navegar pra /loja/[id].
    e.preventDefault();
    e.stopPropagation();

    addItem(product.id, { quantity: 1 });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
    toast.success({
      title: "Adicionado ao carrinho",
      description: product.name,
      action: { label: "Ver carrinho", onClick: openCart },
    });
  }

  const Icon = justAdded ? Check : Plus;
  const label = justAdded ? "Adicionado" : "Adicionar";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Adicionar ${product.name} ao carrinho`}
      aria-live="polite"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-all",
        "border border-border bg-white text-ink shadow-[0_1px_3px_rgba(13,40,24,.08)]",
        "hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
        justAdded && "border-brand-400 bg-brand-50 text-brand-800",
        overlay
          ? "absolute right-2 top-2 z-10 h-9 w-9 p-0"
          : "h-9 px-3 text-[13px]",
        className,
      )}
    >
      <Icon className={cn("h-4 w-4", justAdded && "text-brand-700")} />
      {!overlay ? <span>{label}</span> : null}
      {overlay ? <span className="sr-only">{label}</span> : null}
    </button>
  );
}
