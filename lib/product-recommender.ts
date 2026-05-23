import type { Biomarker } from "@/lib/mock-data";
import { PRODUCTS, type Product } from "@/lib/products";

export interface ProductRecommendation {
  product: Product;
  reason: string;
  matchedBiomarkers: Biomarker[];
}

const LONGEVITY_PRIORITY = new Set([
  "ldl",
  "apob",
  "hba1c",
  "crp",
  "vitd",
]);

// IDs de produtos que são EXAMES — não devem ser recomendados pra intervenção
// específica de biomarcador. Painéis ficam numa seção separada da loja
// ("Aprofunde seu diagnóstico"), porque painel não trata vit D baixa — ele
// só MEDE de novo. Lucas (2026-05): "Painel é extra, não tratamento."
const DIAGNOSTIC_EXAM_IDS = new Set([
  "painel-basico",
  "painel-avancado",
  "microbioma-intestinal",
]);

function buildReason(product: Product, biomarkers: Biomarker[]): string {
  if (biomarkers.length === 0) {
    return `Recomendado pela equipe médica Longevify com base no seu perfil.`;
  }
  const primary = biomarkers[0];
  const valueLabel = `${primary.value} ${primary.unit}`;
  const faixa = primary.referenceLabel
    ? ` (faixa ideal ${primary.referenceLabel})`
    : "";

  switch (primary.id) {
    case "ldl":
      return `Seu LDL está em ${valueLabel}${faixa} — ${product.brand} ${product.name} é uma das intervenções mais estudadas nessa faixa.`;
    case "apob":
      return `Com seu ApoB em ${valueLabel}, esse produto ajuda a otimizar o perfil aterogênico.`;
    case "vitd":
      return `Sua Vitamina D está em ${valueLabel}${faixa} — reposição com D3 de qualidade acelera a normalização.`;
    case "hba1c":
      return `Com HbA1c em ${valueLabel}, esse item suporta sua flexibilidade metabólica.`;
    case "crp":
      return `Seu PCR em ${valueLabel} indica espaço para modulação anti-inflamatória.`;
    case "hdl":
      return `Seu HDL em ${valueLabel} — esse produto contribui para manter o perfil lipídico protetor.`;
    case "ferritin":
      return `Com ferritina em ${valueLabel}, esse produto ajuda a manter reservas de ferro adequadas.`;
    case "testo":
      return `Com testosterona em ${valueLabel}, esse produto suporta massa magra e performance.`;
    case "alt":
      return `Com ALT em ${valueLabel}, esse item atua em suporte hepático e mitocondrial.`;
    default:
      return `Indicado para o seu marcador ${primary.name} em ${valueLabel}.`;
  }
}

/**
 * Recomenda PRODUTOS DE INTERVENÇÃO (suplementos) baseado nos biomarcadores
 * do paciente. EXAMES diagnósticos (painéis) são excluídos — eles aparecem
 * numa seção dedicada da loja, não como tratamento.
 */
export function getRecommendedProducts(
  biomarkers: Biomarker[],
  limit = 4,
): ProductRecommendation[] {
  const relevant = biomarkers.filter(
    (b) => b.status === "out" || b.status === "normal",
  );

  const scored: Array<{
    product: Product;
    score: number;
    matched: Biomarker[];
  }> = [];

  for (const product of PRODUCTS) {
    // Skip painéis/exames — não são intervenção
    if (DIAGNOSTIC_EXAM_IDS.has(product.id)) continue;

    const matched = relevant.filter((b) =>
      product.targetsBiomarkers.includes(b.id),
    );
    if (matched.length === 0) continue;

    let score = 0;
    for (const b of matched) {
      score += b.status === "out" ? 10 : 4;
      if (LONGEVITY_PRIORITY.has(b.id)) score += 2;
    }
    score += Math.min(product.rating, 5);
    // Lucas (2026-05-23): "as recomendações no protocolo tem que ser
    // preferencialmente de produtos longevify e não de outras marcas".
    // Boost forte (+20) garante que produto Longevify Original sempre
    // ganha de qualquer dropshipping curado cujo score esteja na mesma
    // faixa, sem zerar a recomendação dropshipping quando Longevify
    // não tiver opção pra um biomarcador específico.
    if (product.isLongevifyOriginal) score += 20;

    scored.push({ product, score, matched });
  }

  scored.sort((a, b) => {
    const aOut = a.matched.some((m) => m.status === "out") ? 1 : 0;
    const bOut = b.matched.some((m) => m.status === "out") ? 1 : 0;
    if (aOut !== bOut) return bOut - aOut;
    // Empate de "out": Longevify Original vem primeiro
    const aLvg = a.product.isLongevifyOriginal ? 1 : 0;
    const bLvg = b.product.isLongevifyOriginal ? 1 : 0;
    if (aLvg !== bLvg) return bLvg - aLvg;
    return b.score - a.score;
  });

  const ordered = scored.map(({ product, matched }) => {
    const sortedMatches = [...matched].sort((a, b) => {
      if (a.status === "out" && b.status !== "out") return -1;
      if (b.status === "out" && a.status !== "out") return 1;
      return 0;
    });
    return {
      product,
      matchedBiomarkers: sortedMatches,
      reason: buildReason(product, sortedMatches),
    };
  });

  return ordered.slice(0, limit);
}

/**
 * Retorna os EXAMES diagnósticos (painéis) — pra seção separada
 * "Aprofunde seu diagnóstico" da loja.
 */
export function getDiagnosticExams(): Product[] {
  return PRODUCTS.filter((p) => DIAGNOSTIC_EXAM_IDS.has(p.id));
}

export function getProductMatchedBiomarkers(
  product: Product,
  biomarkers: Biomarker[],
): Biomarker[] {
  return biomarkers.filter(
    (b) =>
      product.targetsBiomarkers.includes(b.id) &&
      (b.status === "out" || b.status === "normal"),
  );
}
