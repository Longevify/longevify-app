"use client";

import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/store";
import { toast } from "@/lib/toast";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps {
  product?: Product;
  productName?: string;
  variant?: "primary" | "dark";
  className?: string;
  /** Quando `true`, adiciona como assinatura recorrente. */
  recurring?: boolean;
  /** Intervalo (em dias) da assinatura. Só usado quando `recurring=true`. */
  intervalDays?: number;
}

export function AddToCartButton({
  product,
  productName,
  variant = "primary",
  className,
  recurring,
  intervalDays,
}: AddToCartButtonProps) {
  const { addItem, openCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  if (!product) {
    return (
      <Button
        size="lg"
        variant={variant}
        className={cn("w-full sm:w-auto", className)}
        disabled
      >
        <ShoppingCart className="h-4 w-4" />
        {productName ? `Adicionar ${productName}` : "Adicionar ao carrinho"}
      </Button>
    );
  }

  const handleClick = () => {
    addItem(product.id, {
      quantity: 1,
      recurring,
      recurringIntervalDays: recurring ? intervalDays : undefined,
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
    toast.success({
      title: recurring ? "Assinatura adicionada" : "Adicionado ao carrinho",
      description: product.name,
      action: {
        label: "Ver carrinho",
        onClick: openCart,
      },
    });
  };

  const idleLabel = recurring ? "Assinar agora" : "Adicionar ao carrinho";
  const successLabel = recurring ? "Assinatura criada" : "Adicionado";

  return (
    <Button
      size="lg"
      variant={variant}
      className={cn("w-full sm:w-auto", className)}
      onClick={handleClick}
      aria-live="polite"
    >
      {justAdded ? (
        <>
          <Check className="h-4 w-4" />
          {successLabel}
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" />
          {idleLabel}
        </>
      )}
    </Button>
  );
}
