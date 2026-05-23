"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product, ProductCategory } from "@/lib/products";
import { sortLongevifyFirst } from "@/lib/products";
import { ProductCard } from "./product-card";

type FilterKey = "all" | ProductCategory;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "exame", label: "Exames" },
  { key: "suplemento", label: "Suplementos" },
  { key: "natural", label: "Naturais" },
];

/** Match case-insensitive em name + brand do produto. */
function matchesQuery(product: Product, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    product.name.toLowerCase().includes(q) ||
    product.brand.toLowerCase().includes(q) ||
    product.shortDescription.toLowerCase().includes(q)
  );
}

/**
 * Lista filtrada de produtos. Aceita 2 dimensões de filtro:
 *   1. Categoria (Todos / Exames / Suplementos) — UI pills no topo
 *   2. Query de texto (busca por name/brand/desc) — lido via `?q=` da URL
 *      pra integrar com o protocolo (botão "Comprar Vit D" → /loja?q=vitamina+d)
 *
 * Quando a URL traz `?q=`, mostra um chip "Filtrando por X · ✕" pra deixar
 * óbvio que tem filtro ativo + botão pra limpar.
 */
export function CategoryFilter({ products }: { products: Product[] }) {
  const [active, setActive] = useState<FilterKey>("all");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Lê `?q=` da URL como source-of-truth, sincroniza com state local
  // (controlled input). useState pra pode editar antes de pushar URL.
  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);

  // Quando URL muda externamente (botão back, link), sincroniza
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  function commitQuery(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim()) {
      params.set("q", next.trim());
    } else {
      params.delete("q");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function clearQuery() {
    setQuery("");
    commitQuery("");
  }

  // Sort Longevify-first: produtos da marca própria sempre vêm primeiro
  // dentro do mesmo filtro/busca. Quando o paciente digita "vitamina c",
  // a Vitamina C Longevify aparece antes do Bio Vit C+ Puravida.
  // Pra termos sem produto Longevify (ex: "café"), só os curados aparecem.
  const filtered = sortLongevifyFirst(
    products
      .filter((p) => (active === "all" ? true : p.category === active))
      .filter((p) => matchesQuery(p, query)),
  );

  return (
    <div>
      {/* Linha de filtros: pill categoria + input de busca */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
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

        {/* Search input — flex-1 pra ocupar espaço sobrando */}
        <div className="relative ml-auto flex h-9 min-w-[200px] flex-1 items-center sm:max-w-[320px]">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => commitQuery(query)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitQuery(query);
              if (e.key === "Escape") clearQuery();
            }}
            placeholder="Buscar produto..."
            className="h-9 w-full rounded-full border border-border bg-white pl-9 pr-9 text-[13px] text-ink placeholder:text-muted focus:border-brand-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={clearQuery}
              aria-label="Limpar busca"
              className="absolute right-2 grid h-6 w-6 place-items-center rounded-full text-muted transition hover:bg-zinc-100 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Chip ativo quando vier do protocolo via ?q= */}
      {urlQuery && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-[12px] text-brand-700">
          <span>
            Filtrando por:{" "}
            <span className="font-semibold">&ldquo;{urlQuery}&rdquo;</span>
          </span>
          <button
            type="button"
            onClick={clearQuery}
            aria-label="Limpar filtro"
            className="grid h-5 w-5 place-items-center rounded-full bg-brand-100 text-brand-700 transition hover:bg-brand-200"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-border bg-surface/60 p-10 text-center text-[14px] text-muted">
          {query ? (
            <>
              Nenhum produto encontrado para{" "}
              <span className="font-semibold">&ldquo;{query}&rdquo;</span>.
              <button
                type="button"
                onClick={clearQuery}
                className="ml-2 text-brand-600 underline transition hover:text-brand-700"
              >
                Limpar busca
              </button>
            </>
          ) : (
            "Nenhum produto nessa categoria ainda."
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
