export interface Purchase {
  productId: string; // slug Longevify Original do produto (longevify-vitamina-d, longevify-omega-3, etc.)
  purchasedAt: string; // ISO date
  quantity: number; // frascos comprados
}

/**
 * Histórico de compras mock do João Silva.
 *
 * Usa IDs Longevify Original (longevify-*) — protocolo recomenda
 * preferencialmente a linha própria, então o histórico também é
 * dessa linha.
 *
 * Datas relativas a 2026-05-14 (hoje):
 * - longevify-vitamina-d: comprado 2026-03-01 (~74 dias atrás). Duração: 60 dias × 1 frasco = 60d → ACABOU.
 * - longevify-omega-3: comprado 2026-04-20 (~24 dias atrás). Duração: 60 dias × 1 frasco = 60d → AINDA TEM.
 * - longevify-creatina: sem histórico → "never-purchased".
 * - longevify-magnesio-quelato: comprado 2025-12-01 (~165 dias atrás). Duração: 60 dias × 1 frasco = 60d → ACABOU.
 */
export const PURCHASE_HISTORY: Purchase[] = [
  { productId: "longevify-vitamina-d", purchasedAt: "2026-03-01", quantity: 1 },
  { productId: "longevify-omega-3", purchasedAt: "2026-04-20", quantity: 1 },
  { productId: "longevify-magnesio-quelato", purchasedAt: "2025-12-01", quantity: 1 },
];
