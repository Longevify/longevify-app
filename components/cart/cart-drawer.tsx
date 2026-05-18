"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Minus, Plus, Repeat, ShoppingBag, X } from "lucide-react";
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
    totalRecurringBRL,
    recurringCount,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    setRecurring,
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

  // "Compra única hoje" = soma só dos itens não-recorrentes.
  // "Mensal recorrente" = soma equivalente mensal dos itens recorrentes (já com desconto).
  const split = useMemo(() => {
    let oneShot = 0;
    let monthlyRecurring = 0;
    let monthlySavings = 0;
    for (const item of items) {
      const lineTotal = item.product.priceBRL * item.quantity;
      if (item.recurring && item.product.recurrence) {
        const interval = item.product.recurrence.intervalDays;
        const discountPct = item.product.recurrence.subscriptionDiscountPct / 100;
        const perMonth = (lineTotal * 30) / interval;
        monthlyRecurring += perMonth * (1 - discountPct);
        monthlySavings += perMonth * discountPct;
      } else {
        oneShot += lineTotal;
      }
    }
    return {
      oneShot: Math.round(oneShot),
      monthlyRecurring: Math.round(monthlyRecurring),
      monthlySavings: Math.round(monthlySavings),
    };
  }, [items]);

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
        {/* Header com padding-top que respeita o safe-area-inset-top
            (Dynamic Island/notch do iPhone). Lucas 2026-05-17 reportou
            que "X" e infos ficavam coladas no topo do telefone, sem
            espaço pra clicar. Usa max(env, 1rem) pra garantir mínimo
            mesmo em browsers que não suportam env(). */}
        <header
          className="flex items-center justify-between border-b border-border px-5 pb-4"
          style={{ paddingTop: "max(env(safe-area-inset-top), 1rem)" }}
        >
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
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink"
          >
            <X className="h-5 w-5" />
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
                Comece pela curadoria de suplementos com base em evidência.
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
              {items.map(({ product, quantity, recurring }) => {
                const canRecur = Boolean(product.recurrence);
                const isRecurring = canRecur && Boolean(recurring);
                const modeLabel = isRecurring
                  ? `assinatura · ${product.recurrence?.label ?? "recorrente"}`
                  : "compra única";
                return (
                  <li key={product.id} className="flex gap-3 py-4">
                    <div className="h-20 w-20 shrink-0">
                      <ProductImage product={product} aspect="square" />
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5">
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

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                            isRecurring
                              ? "bg-brand-100 text-brand-800"
                              : "bg-black/5 text-muted",
                          )}
                        >
                          {isRecurring ? (
                            <Repeat className="h-3 w-3" />
                          ) : null}
                          {modeLabel}
                        </span>
                        {canRecur ? (
                          <button
                            type="button"
                            onClick={() =>
                              setRecurring(product.id, !isRecurring)
                            }
                            className="text-[11px] font-medium text-brand-700 underline-offset-2 hover:text-brand-900 hover:underline"
                          >
                            {isRecurring
                              ? "trocar p/ compra única"
                              : `assinar (-${product.recurrence?.subscriptionDiscountPct}%)`}
                          </button>
                        ) : null}
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
                );
              })}
            </ul>

            <footer
              className="border-t border-border bg-brand-50/40 px-5 pt-4"
              style={{
                // safe-area-inset-bottom: cobre o Home indicator do iPhone
                // pra que o CTA "Finalizar pedido" não fique colado no
                // gesture bar.
                paddingBottom: "max(env(safe-area-inset-bottom), 1rem)",
              }}
            >
              <dl className="space-y-1.5 text-[13px]">
                {recurringCount > 0 ? (
                  <>
                    <div className="flex items-center justify-between text-muted">
                      <dt>Compra única hoje</dt>
                      <dd className="tabular-nums text-ink">
                        {formatBRL(split.oneShot)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between text-muted">
                      <dt className="inline-flex items-center gap-1.5">
                        <Repeat className="h-3 w-3" />
                        Mensal recorrente
                      </dt>
                      <dd className="tabular-nums text-brand-800">
                        {formatBRL(split.monthlyRecurring)}
                      </dd>
                    </div>
                    {split.monthlySavings > 0 ? (
                      <div className="rounded-full bg-brand-100 px-3 py-1 text-[11.5px] font-medium text-brand-800">
                        Economiza {formatBRL(split.monthlySavings)}/mês com
                        assinatura
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </dl>
              {/* totalRecurringBRL é referenciado pra manter consistência com o store */}
              <div className="sr-only" aria-hidden>
                {totalRecurringBRL}
              </div>
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
