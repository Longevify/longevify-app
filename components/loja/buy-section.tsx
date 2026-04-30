"use client";

import { useState } from "react";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/store";
import { toast } from "@/lib/toast";
import { PriceTag } from "./price-tag";
import { AddToCartButton } from "./add-to-cart-button";
import { SubscriptionSelector } from "./subscription-selector";
import { recommendInterval, type Product } from "@/lib/products";

interface BuySectionProps {
  product: Product;
}

/**
 * Bloco "preço + assinatura + botão" da página de detalhe. Concentra o
 * estado de `recurring` + `intervalDays` num único client component pra
 * o detail page (server component) ficar simples.
 */
export function BuySection({ product }: BuySectionProps) {
  const recommendation = recommendInterval(product);

  const [recurring, setRecurring] = useState(false);
  const [intervalDays, setIntervalDays] = useState(
    recommendation?.intervalDays ?? 30,
  );

  const { addItem, openCart } = useCart();

  function handleQuickSubscribe() {
    if (!recommendation) return;
    addItem(product.id, {
      quantity: 1,
      recurring: true,
      recurringIntervalDays: recommendation.intervalDays,
    });
    toast.success({
      title: "Assinatura adicionada",
      description: `${product.name} · ${recommendation.label}`,
      action: { label: "Ver carrinho", onClick: openCart },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {recommendation ? (
        <SubscriptionSelector
          product={product}
          recurring={recurring}
          onRecurringChange={setRecurring}
          intervalDays={intervalDays}
          onIntervalChange={setIntervalDays}
        />
      ) : null}

      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <PriceTag value={product.priceBRL} size="lg" />
          {recommendation && !recurring ? (
            <span className="text-[12px] text-muted">
              ou{" "}
              <strong className="text-ink">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  minimumFractionDigits: 0,
                }).format(
                  Math.round(
                    product.priceBRL *
                      (1 - recommendation.subscriptionDiscountPct / 100),
                  ),
                )}
              </strong>{" "}
              com assinatura
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {recommendation && !recurring ? (
            <Button
              size="lg"
              variant="outline"
              onClick={handleQuickSubscribe}
              className="w-full sm:w-auto"
              aria-label={`Assinar ${product.name} (${recommendation.label})`}
            >
              <Repeat className="h-4 w-4" />
              Assinar ({recommendation.label})
            </Button>
          ) : null}
          <AddToCartButton
            product={product}
            recurring={recurring}
            intervalDays={recurring ? intervalDays : undefined}
          />
        </div>
      </div>
    </div>
  );
}
