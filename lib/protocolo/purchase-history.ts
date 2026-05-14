export interface Purchase {
  productId: string; // slug do produto (vitamina-d, omega-3, etc.)
  purchasedAt: string; // ISO date
  quantity: number; // frascos comprados
}

/**
 * Histórico de compras mock do João Silva.
 *
 * Datas relativas a 2026-05-14 (hoje):
 * - vitamina-d: comprado 2026-03-01 (~74 dias atrás). Duração: 60 dias × 1 frasco = 60d → ACABOU.
 * - omega-3: comprado 2026-04-20 (~24 dias atrás). Duração: 60 dias × 1 frasco = 60d → AINDA TEM.
 * - creatina: sem histórico → "never-purchased".
 * - magnesio-quelato: comprado 2025-12-01 (~165 dias atrás). Duração: 60 dias × 1 frasco = 60d → ACABOU.
 */
export const PURCHASE_HISTORY: Purchase[] = [
  { productId: "vitamina-d", purchasedAt: "2026-03-01", quantity: 1 },
  { productId: "omega-3", purchasedAt: "2026-04-20", quantity: 1 },
  { productId: "magnesio-quelato", purchasedAt: "2025-12-01", quantity: 1 },
];
