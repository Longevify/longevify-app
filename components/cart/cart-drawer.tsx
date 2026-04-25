"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/lib/cart/store";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/loja/product-image";

export function CartDrawer() {
  const {
    items,
    count,
    totalBRL,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
  } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeCart();
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, closeCart]);

  return (
    <>
      <div
        aria-hidden={!isOpen}
        onClick={closeCart}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200",
          isOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />
      <aside
        aria-hidden={!isOpen}
        aria-label="Carrinho de compras"
        role="dialog"
        className={cn(
          "fixed right-0 top-0 z-50 flex h-dvh w-full max-w-[420px] flex-col border-l border-border bg-surface shadow-[-12px_0_40px_rgba(13,40,24,.15)] transition-transform duration-250 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted">
              Carrinho
            </div>
            <h2 className="text-[17px] font-semibold text-ink">
              {count > 0
                ? `${count} ${count === 1 ? "item" : "itens"}`
                : "Seu carrinho"}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Fechar carrinho"
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <div>
              <div className="text-[16px] font-semibold text-ink">
                Carrinho vazio
              </div>
              <p className="mt-1 text-[13px] text-muted">
                Comece pela curadoria da nossa equipe médica.
              </p>
            </div>
            <Link href="/loja" onClick={closeCart}>
              <Button variant="primary" size="md">
                Descobrir produtos
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-5">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex gap-3 py-4">
                  <div className="h-20 w-20 shrink-0">
                    <ProductImage product={product} aspect="square" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.12em] text-muted">
                          {product.brand}
                        </div>
                        <Link
                          href={`/loja/${product.id}`}
                          onClick={closeCart}
                          className="line-clamp-2 text-[13.5px] font-medium leading-snug text-ink hover:text-brand-700"
                        >
                          {product.name}
                        </Link>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(product.id)}
                        aria-label={`Remover ${product.name}`}
                        className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <QuantityStepper
                        value={quantity}
                        onChange={(q) => updateQuantity(product.id, q)}
                      />
                      <span className="text-[14px] font-semibold tabular-nums">
                        {formatBRL(product.priceBRL * quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="border-t border-border bg-brand-50/40 px-5 py-4">
              <dl className="space-y-1.5 text-[13px]">
                <div className="flex items-center justify-between text-muted">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums text-ink">
                    {formatBRL(totalBRL)}
                  </dd>
                </div>
                <div className="flex items-center justify-between text-muted">
                  <dt>Frete</dt>
                  <dd>A calcular no checkout</dd>
                </div>
                <div className="flex items-center justify-between pt-1 text-[15px] font-semibold text-ink">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatBRL(totalBRL)}</dd>
                </div>
              </dl>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="mt-4 block"
              >
                <Button variant="dark" size="lg" className="w-full">
                  Ir pro checkout
                </Button>
              </Link>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}

function QuantityStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0 overflow-hidden rounded-full border border-border bg-surface">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        aria-label="Diminuir quantidade"
        className="grid h-7 w-7 place-items-center text-muted hover:bg-black/5 hover:text-ink"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="min-w-6 px-1 text-center text-[12.5px] font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label="Aumentar quantidade"
        className="grid h-7 w-7 place-items-center text-muted hover:bg-black/5 hover:text-ink"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
