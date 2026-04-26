"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart/store";
import { CartDrawer } from "./cart-drawer";

export function CartTrigger({ fallback }: { fallback?: React.ReactNode }) {
  const { count, hydrated, openCart } = useCart();
  const showBadge = hydrated && count > 0;

  return (
    <>
      <button
        type="button"
        onClick={openCart}
        aria-label={
          showBadge
            ? `Abrir carrinho — ${count} ${count === 1 ? "item" : "itens"}`
            : "Abrir carrinho"
        }
        className="relative grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-black/5 hover:text-ink"
      >
        <ShoppingBag className="h-4 w-4" />
        {showBadge ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white"
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>
      <CartDrawer />
      {/* `fallback` kept in signature for parity with previous placeholder */}
      <span className="sr-only">{fallback}</span>
    </>
  );
}
