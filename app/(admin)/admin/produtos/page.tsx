"use client";

import { useEffect, useMemo, useState } from "react";
import { PlusCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/admin/product-form";
import { formatBRL, CATEGORY_LABELS } from "@/lib/products";
import {
  createProduct,
  getProducts,
  updateProduct,
} from "@/lib/admin/storage";
import type { AdminProduct, ProductInput } from "@/lib/admin/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    let mounted = true;
    getProducts().then((p) => mounted && setProducts(p));
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!products) return [];
    if (category === "all") return products;
    return products.filter((p) => p.category === category);
  }, [products, category]);

  async function handleCreate(data: ProductInput) {
    const p = await createProduct(data);
    setProducts((prev) => (prev ? [p, ...prev] : [p]));
    setDrawerOpen(false);
  }

  async function handleEdit(data: ProductInput) {
    if (!editing) return;
    await updateProduct(editing.id, {
      ...data,
    });
    const next = await getProducts();
    setProducts(next);
    setEditing(null);
    setDrawerOpen(false);
  }

  async function toggleStatus(id: string, current: AdminProduct["status"]) {
    const next = current === "ativo" ? "inativo" : "ativo";
    await updateProduct(id, { status: next });
    setProducts((prev) =>
      prev
        ? prev.map((p) => (p.id === id ? { ...p, status: next } : p))
        : prev,
    );
  }

  async function handleInline(
    id: string,
    patch: Partial<AdminProduct>,
  ) {
    await updateProduct(id, patch);
    setProducts((prev) =>
      prev ? prev.map((p) => (p.id === id ? { ...p, ...patch } : p)) : prev,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted">
            Catálogo
          </span>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
            Produtos
          </h1>
          <p className="mt-1 text-[14px] text-muted">
            Suplementos, wearables e originais Longevify — inline-edit de
            nome, preço e status.
          </p>
        </div>
        <Button
          variant="dark"
          className="gap-2"
          onClick={() => {
            setEditing(null);
            setDrawerOpen(true);
          }}
        >
          <PlusCircle className="h-4 w-4" /> Novo produto
        </Button>
      </header>

      <div className="inline-flex flex-wrap rounded-full border border-border bg-white p-1 text-[12px]">
        <CategoryChip
          active={category === "all"}
          onClick={() => setCategory("all")}
        >
          Todos
        </CategoryChip>
        {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
          <CategoryChip
            key={id}
            active={category === id}
            onClick={() => setCategory(id)}
          >
            {label}
          </CategoryChip>
        ))}
      </div>

      {products === null ? (
        <div className="h-[360px] animate-pulse rounded-[16px] border border-border bg-surface" />
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-border bg-surface">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <thead className="border-b border-border bg-[#F7FAF8] text-[11px] font-medium uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3 text-right">Preço</th>
                <th className="px-4 py-3 text-center">Estoque</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted"
                  >
                    Nenhum produto nesta categoria.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/70 last:border-b-0 hover:bg-brand-50/50"
                  >
                    <td className="px-4 py-3">
                      <input
                        defaultValue={p.name}
                        onBlur={(e) =>
                          e.target.value !== p.name &&
                          handleInline(p.id, { name: e.target.value })
                        }
                        className="w-full bg-transparent font-medium text-ink outline-none focus:underline"
                      />
                      <div className="text-[11px] text-muted">{p.brand}</div>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {CATEGORY_LABELS[p.category]}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        defaultValue={p.priceBRL}
                        type="number"
                        min={0}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v) && v !== p.priceBRL) {
                            handleInline(p.id, { priceBRL: v });
                          }
                        }}
                        className="h-8 w-24 rounded-full border border-transparent bg-transparent px-3 text-right tabular-nums outline-none hover:border-border focus:border-brand-500 focus:bg-white"
                      />
                      <div className="text-[10px] text-muted">
                        {formatBRL(p.priceBRL)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-muted">
                      {p.stock ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleStatus(p.id, p.status)}
                        className={cn(
                          "inline-flex h-7 items-center rounded-full px-3 text-[11px] font-medium transition-colors",
                          p.status === "ativo"
                            ? "bg-[#DFF5E9] text-[#0E7B45] hover:bg-[#C8EBD5]"
                            : "bg-[#EEF2F0] text-muted hover:bg-[#E2E7E4]",
                        )}
                      >
                        {p.status === "ativo" ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setEditing(p);
                          setDrawerOpen(true);
                        }}
                        className="text-[12px] font-medium text-brand-700 hover:underline"
                      >
                        Editar completo
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
          <button
            onClick={() => {
              setDrawerOpen(false);
              setEditing(null);
            }}
            className="absolute inset-0"
            aria-label="Fechar"
          />
          <div className="relative flex h-full w-full max-w-[640px] flex-col overflow-y-auto bg-surface shadow-2xl">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted">
                  {editing ? "Editar produto" : "Novo produto"}
                </div>
                <h2 className="text-[16px] font-semibold">
                  {editing ? editing.name : "Catálogo Longevify"}
                </h2>
              </div>
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  setEditing(null);
                }}
                className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="px-6 py-5">
              <ProductForm
                initial={editing ?? undefined}
                onSubmit={editing ? handleEdit : handleCreate}
                onCancel={() => {
                  setDrawerOpen(false);
                  setEditing(null);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 font-medium transition-colors",
        active
          ? "bg-brand-900 text-white"
          : "text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
