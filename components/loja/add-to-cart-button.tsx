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
}

export function AddToCartButton({
  product,
  productName,
  variant = "primary",
  className,
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
    addItem(product.id);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
    toast.success({
      title: "Adicionado ao carrinho",
      description: product.name,
      action: {
        label: "Ver carrinho",
        onClick: openCart,
      },
    });
  };

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
          Adicionado
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" />
          Adicionar ao carrinho
        </>
      )}
    </Button>
  );
}
