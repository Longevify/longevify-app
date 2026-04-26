import { BIOMARKERS } from "@/lib/mock-data";
import { PRODUCTS } from "@/lib/products";
import { getRecommendedProducts } from "@/lib/product-recommender";
import { RecommendationStrip } from "@/components/loja/recommendation-strip";
import { RecommendationsSection } from "@/components/loja/recommendations-section";
import { CategoryFilter } from "@/components/loja/category-filter";

export default function LojaPage() {
  const recommendations = getRecommendedProducts(BIOMARKERS, 4);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10">
      <header className="pb-8">
        <span className="text-[13px] text-muted">Curadoria Longevify</span>
        <h1 className="text-[40px] leading-[1.05] font-semibold tracking-tight">
          Loja
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          Suplementação, wearables e essenciais curados pela equipe Longevify —
          selecionados com base em evidência e integrados aos seus biomarcadores.
        </p>
      </header>

      <RecommendationsSection
        recommendations={recommendations}
        title="Recomendados pra você"
        className="mb-8"
      />

      <RecommendationStrip recommendations={recommendations} />

      <CategoryFilter products={PRODUCTS} />
    </div>
  );
}
