"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Product, ProductCategory } from "@/lib/products";
import { ProductCard } from "./product-card";

type FilterKey = "all" | ProductCategory;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "exame", label: "Exames" },
  { key: "longevify-original", label: "Suplementos Longevify" },
  { key: "wearable", label: "Wearables" },
  { key: "equipamento", label: "Equipamento" },
];

export function CategoryFilter({ products }: { products: Product[] }) {
  const [active, setActive] = useState<FilterKey>("all");

  const filtered =
    active === "all" ? products : products.filter((p) => p.category === active);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={cn(
                "inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-brand-900 text-white"
                  : "border border-border bg-white text-ink hover:bg-brand-50",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-border bg-surface/60 p-10 text-center text-[14px] text-muted">
          Nenhum produto nessa categoria ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
