"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown, Repeat, ShoppingCart, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/loja/product-card";
import { useCart } from "@/lib/cart/store";
import { toast } from "@/lib/toast";
import { formatBRL } from "@/lib/products";
import type { ProductRecommendation } from "@/lib/product-recommender";
import { cn } from "@/lib/utils";

interface RecommendationsSectionProps {
  recommendations: ProductRecommendation[];
  /** Quantidade exibida (até) */
  limit?: number;
  className?: string;
  /** título customizado — default "Recomendados pra você" */
  title?: string;
}

/**
 * Bloco de produtos recomendados com 2 ações em batch:
 * - "Adicionar todos ao carrinho" — adiciona um por um, mostra toast com total.
 * - "Tornar recorrente" — adiciona todos como assinaturas, calculando frequência
 *   pro produto a partir de `product.recurrence` (posologia / embalagem).
 *
 * Usado na Home; também pode ser reaproveitado em outras telas.
 */
export function RecommendationsSection({
  recommendations,
  limit = 3,
  className,
  title = "Recomendados pra você",
}: RecommendationsSectionProps) {
  const { addItems, openCart } = useCart();
  const items = recommendations.slice(0, limit);

  const summary = useMemo(() => {
    let oneShotTotal = 0;
    let recurringMonthlyEquivalent = 0;
    let recurringSavings = 0;
    let recurringEligible = 0;

    for (const { product } of items) {
      oneShotTotal += product.priceBRL;
      if (product.recurrence) {
        recurringEligible++;
        // converte intervalo de dias em "por mês" pra mostrar custo recorrente equivalente
        const perMonth =
          (product.priceBRL * 30) / product.recurrence.intervalDays;
        const discount = product.recurrence.subscriptionDiscountPct / 100;
        recurringMonthlyEquivalent += perMonth * (1 - discount);
        recurringSavings += perMonth * discount;
      } else {
        recurringMonthlyEquivalent += product.priceBRL;
      }
    }

    return {
      oneShotTotal: Math.round(oneShotTotal),
      recurringMonthlyEquivalent: Math.round(recurringMonthlyEquivalent),
      recurringSavings: Math.round(recurringSavings),
      recurringEligible,
    };
  }, [items]);

  if (items.length === 0) return null;

  function addAllOneShot() {
    addItems(items.map((r) => r.product.id));
    toast.success({
      title: `${items.length} produtos adicionados`,
      description: `Total: ${formatBRL(summary.oneShotTotal)} — compra única`,
      action: { label: "Ver carrinho", onClick: openCart },
    });
  }

  function addAllRecurring() {
    // Adiciona consumíveis como recorrentes; não-consumíveis vão como compra única
    for (const { product } of items) {
      addItems([product.id], { recurring: Boolean(product.recurrence) });
    }
    toast.success({
      title: `Assinatura ativada em ${summary.recurringEligible} item(ns)`,
      description: `~${formatBRL(summary.recurringMonthlyEquivalent)}/mês equivalente · economia de ${formatBRL(summary.recurringSavings)}/mês`,
      action: { label: "Ver carrinho", onClick: openCart },
    });
  }

  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="inline-flex items-center gap-1.5 text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
            <Sparkles className="h-3.5 w-3.5 text-brand-600" />
            {title}
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Selecionados a partir dos seus biomarcadores e protocolo atual.
          </p>
        </div>
        <Link
          href="/loja"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-900"
        >
          Ver loja completa <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Bulk actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3">
        <div className="text-[13px] text-muted">
          Pacote de {items.length} produtos · compra única{" "}
          <span className="font-semibold text-ink">
            {formatBRL(summary.oneShotTotal)}
          </span>
          {summary.recurringEligible > 0 ? (
            <>
              {" "}
              · assinatura{" "}
              <span className="font-semibold text-brand-700">
                {formatBRL(summary.recurringMonthlyEquivalent)}/mês
              </span>{" "}
              <span className="text-[12px] text-muted/80">
                (economiza {formatBRL(summary.recurringSavings)}/mês)
              </span>
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={addAllOneShot}>
            <ShoppingCart className="h-4 w-4" />
            Adicionar todos
          </Button>
          {summary.recurringEligible > 0 ? (
            <Button size="sm" variant="primary" onClick={addAllRecurring}>
              <Repeat className="h-4 w-4" />
              Assinar pacote
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ product, reason }) => (
          <RecommendedCard
            key={product.id}
            productId={product.id}
            reason={reason}
            recommendation={{ product, reason, matchedBiomarkers: [] }}
          />
        ))}
      </div>
    </section>
  );
}

interface RecommendedCardProps {
  productId: string;
  reason: string;
  recommendation: ProductRecommendation;
}

/**
 * Card compacto + ações por item (adicionar, recorrente)
 */
function RecommendedCard({
  productId,
  reason,
  recommendation,
}: RecommendedCardProps) {
  const { addItem, openCart } = useCart();
  const product = recommendation.product;
  // Lucas (2026-05-20): "na loja, tem que ter esse mesmo botão de saiba
  // mais na aba de recomendados, explicando porque estamos recomendando
  // tal produto."
  const [expanded, setExpanded] = useState(false);

  function handleAdd(recurring: boolean) {
    addItem(productId, { recurring });
    toast.success({
      title: recurring ? "Assinatura ativada" : "Adicionado ao carrinho",
      description: recurring
        ? `${product.name} — ${product.recurrence?.label ?? "recorrente"}`
        : product.name,
      action: { label: "Ver carrinho", onClick: openCart },
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ProductCard
        product={product}
        reason={reason}
        size="compact"
        highlight
      />

      {/* Botão "Saber mais" — expande pra mostrar razão completa contextualizada */}
      {reason && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1 self-start text-[11.5px] font-semibold text-brand-700 transition hover:text-brand-800"
        >
          {expanded ? "Fechar" : "Saber mais"}
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              expanded && "rotate-180",
            )}
            strokeWidth={2.5}
          />
        </button>
      )}

      {expanded && reason && (
        <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2.5 text-[12px] leading-relaxed text-zinc-700">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700">
            Por que recomendamos
          </div>
          {reason}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 px-3 text-[12px]"
          onClick={() => handleAdd(false)}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Adicionar
        </Button>
        {product.recurrence ? (
          <Button
            size="sm"
            variant="dark"
            className="flex-1 h-8 px-3 text-[12px]"
            onClick={() => handleAdd(true)}
            title={`Recorrência: ${product.recurrence.label} (-${product.recurrence.subscriptionDiscountPct}%)`}
          >
            <Repeat className="h-3.5 w-3.5" />
            Assinar · {product.recurrence.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
