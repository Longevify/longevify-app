import { Sparkles } from "lucide-react";
import type { ProductRecommendation } from "@/lib/product-recommender";
import { ProductCard } from "./product-card";

export function RecommendationStrip({
  recommendations,
}: {
  recommendations: ProductRecommendation[];
}) {
  if (recommendations.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            Recomendados pra você
          </span>
          <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
            Selecionados a partir dos seus biomarcadores
          </h2>
        </div>
      </div>

      {/* M4: removido min-w-max que forçava overflow real na página —
           cada filho tem w-[280px] shrink-0, o scroll interno do wrapper é suficiente */}
      <div className="-mx-6 overflow-x-auto px-6 pb-2 [scrollbar-width:thin]">
        <div className="flex gap-4">
          {recommendations.map(({ product, reason }) => (
            <div key={product.id} className="w-[280px] shrink-0">
              <ProductCard product={product} highlight reason={reason} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
