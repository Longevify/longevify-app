import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/badge";
import { BIOMARKERS } from "@/lib/mock-data";
import { CATEGORY_LABELS, getProductById } from "@/lib/products";
import { getProductMatchedBiomarkers } from "@/lib/product-recommender";
import { ProductImage } from "@/components/loja/product-image";
import { PriceTag } from "@/components/loja/price-tag";
import { AddToCartButton } from "@/components/loja/add-to-cart-button";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = getProductById(productId);
  if (!product) notFound();

  const matchedBiomarkers = getProductMatchedBiomarkers(product, BIOMARKERS);
  const targetedBiomarkers = BIOMARKERS.filter((b) =>
    product.targetsBiomarkers.includes(b.id),
  );

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10">
      <Link
        href="/loja"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para a loja
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,480px)_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductImage product={product} aspect="square" className="rounded-[24px]" />
          {product.packageSize ? (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-[12px] font-medium text-muted">
              {product.packageSize}
              {product.posology ? <span aria-hidden>·</span> : null}
              {product.posology ? <span>{product.posology}</span> : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <span className="uppercase tracking-[0.14em]">
              {CATEGORY_LABELS[product.category]}
            </span>
            <span aria-hidden>·</span>
            <span>{product.brand}</span>
          </div>

          <h1 className="text-[36px] leading-[1.1] font-semibold tracking-tight">
            {product.name}
          </h1>

          <div className="flex items-center gap-3 text-[13px] text-muted">
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-[#E6B845] text-[#E6B845]" />
              <span className="font-medium text-ink">
                {product.rating.toFixed(1)}
              </span>
              <span>({product.reviewsCount} avaliações)</span>
            </span>
          </div>

          <p className="text-[15px] leading-relaxed text-ink/90">
            {product.longDescription}
          </p>

          <div>
            <h2 className="mb-2 text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
              Benefícios
            </h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {product.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-[14px]">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
                    <Check className="h-3 w-3" />
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <Card className="flex flex-col gap-1 p-4">
            <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted">
              Como usar
            </span>
            <p className="text-[14px] text-ink">{product.usage}</p>
          </Card>

          {targetedBiomarkers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {targetedBiomarkers.map((b) => (
                <Link
                  key={b.id}
                  href={`/dados/${b.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-[12px] font-medium text-ink hover:border-brand-300 hover:bg-brand-50"
                >
                  <StatusDot status={b.status} />
                  {b.name}
                </Link>
              ))}
            </div>
          )}

          {product.recurrence ? (
            <Card className="flex flex-col gap-1 border-brand-200 bg-brand-50/40 p-4">
              <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-brand-700">
                Disponível como assinatura
              </span>
              <p className="text-[14px] text-ink">
                Recorrência sugerida: <strong>{product.recurrence.label}</strong> ·{" "}
                {product.recurrence.subscriptionDiscountPct}% de desconto na
                renovação automática.
              </p>
            </Card>
          ) : null}

          <div className="mt-2 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-0.5">
              <PriceTag value={product.priceBRL} size="lg" />
              {product.recurrence ? (
                <span className="text-[12px] text-muted">
                  ou{" "}
                  <strong className="text-ink">
                    {(() => {
                      const v = Math.round(
                        product.priceBRL *
                          (1 - product.recurrence.subscriptionDiscountPct / 100),
                      );
                      return new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        minimumFractionDigits: 0,
                      }).format(v);
                    })()}
                  </strong>{" "}
                  com assinatura ({product.recurrence.label})
                </span>
              ) : null}
            </div>
            <AddToCartButton product={product} />
          </div>
        </div>
      </div>

      {matchedBiomarkers.length > 0 && (
        <section className="mt-12">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
            Por que é recomendado pra você
          </h2>
          <Card className="mt-3 flex flex-col gap-4 p-5">
            <p className="text-[14px] text-ink/90">
              Esse produto foi selecionado porque ele atua sobre marcadores seus
              que estão fora da faixa ótima ou em alerta. Clique em cada um para
              ver o histórico e os detalhes clínicos.
            </p>
            <ul className="flex flex-col divide-y divide-border/70">
              {matchedBiomarkers.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/dados/${b.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-brand-700"
                  >
                    <div className="flex items-center gap-3">
                      <StatusDot status={b.status} />
                      <div>
                        <div className="text-[14px] font-medium">{b.name}</div>
                        <div className="text-[12px] text-muted">
                          {b.value} {b.unit} · referência {b.referenceLabel}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}
