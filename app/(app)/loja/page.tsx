import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BIOMARKERS } from "@/lib/mock-data";
import { PRODUCTS } from "@/lib/products";
import {
  getRecommendedProducts,
  getDiagnosticExams,
} from "@/lib/product-recommender";
import { RecommendationsSection } from "@/components/loja/recommendations-section";
import { CategoryFilter } from "@/components/loja/category-filter";
import { ProductCard } from "@/components/loja/product-card";

export default function LojaPage() {
  // Recomendações principais: APENAS suplementos de intervenção
  // (sem painéis diagnósticos — esses ficam na seção "Aprofunde diagnóstico").
  const recommendations = getRecommendedProducts(BIOMARKERS, 4);

  // Painéis diagnósticos — extras, não tratamento.
  const exams = getDiagnosticExams();

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10">
      <header className="pb-8">
        <span className="text-[13px] text-muted">Curadoria Longevify</span>
        <h1 className="text-[28px] leading-[1.05] font-semibold tracking-tight sm:text-[40px]">
          Loja
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          Suplementação curada pela equipe Longevify, com base em evidência e
          integrada aos seus biomarcadores.
        </p>
      </header>

      <RecommendationsSection
        recommendations={recommendations}
        title="Recomendados pra você"
        className="mb-10"
      />

      {/* Anchor pra `/loja?q=X#produtos` — botão "Comprar" no protocolo
          leva direto pra grade filtrada, pulando recomendações */}
      <section id="produtos" className="scroll-mt-24">
        <CategoryFilter products={PRODUCTS} />
      </section>

      {/* ── Seção dedicada de exames diagnósticos ──
          Painéis são EXTRAS — não aparecem nas recomendações principais
          porque não tratam deficiência (só medem). Quem quiser aprofundar
          o diagnóstico encontra aqui. */}
      <section className="mt-16">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <span className="text-[12px] font-semibold uppercase tracking-wide text-brand-600">
              Aprofunde seu diagnóstico
            </span>
            <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
              Exames diagnósticos Longevify
            </h2>
            <p className="mt-1 max-w-2xl text-[13px] text-muted">
              Painéis completos pra quem quer medir mais marcadores e
              aprofundar a análise. Coleta domiciliar incluída.
            </p>
          </div>
          <Link
            href="/loja?q=painel"
            className="hidden items-center gap-1 text-[12px] font-semibold text-brand-700 transition hover:text-brand-800 sm:inline-flex"
          >
            Ver todos
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <ProductCard key={exam.id} product={exam} />
          ))}
        </div>
      </section>
    </div>
  );
}
