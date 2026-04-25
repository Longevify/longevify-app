"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  AdminProduct,
  AdminProductStatus,
  ProductInput,
} from "@/lib/admin/types";
import type { ProductBadge, ProductCategory } from "@/lib/products";
import { CATEGORY_LABELS } from "@/lib/products";

interface ProductFormProps {
  initial?: AdminProduct;
  onSubmit: (data: ProductInput) => Promise<void> | void;
  onCancel?: () => void;
}

const BADGES: ProductBadge[] = ["Top", "Novo", "Exclusivo", "Curadoria"];

export function ProductForm({ initial, onSubmit, onCancel }: ProductFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [category, setCategory] = useState<ProductCategory>(
    initial?.category ?? "suplemento",
  );
  const [badge, setBadge] = useState<ProductBadge | "">(initial?.badge ?? "");
  const [price, setPrice] = useState(String(initial?.priceBRL ?? ""));
  const [shortDescription, setShort] = useState(
    initial?.shortDescription ?? "",
  );
  const [longDescription, setLong] = useState(initial?.longDescription ?? "");
  const [benefits, setBenefits] = useState((initial?.benefits ?? []).join("\n"));
  const [usage, setUsage] = useState(initial?.usage ?? "");
  const [targets, setTargets] = useState(
    (initial?.targetsBiomarkers ?? []).join(", "),
  );
  const [status, setStatus] = useState<AdminProductStatus>(
    initial?.status ?? "ativo",
  );
  const [stock, setStock] = useState(String(initial?.stock ?? ""));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({
      name,
      brand,
      category,
      badge: badge === "" ? undefined : badge,
      priceBRL: Number(price) || 0,
      shortDescription,
      longDescription,
      benefits: benefits
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      usage,
      targetsBiomarkers: targets
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      status,
      stock: stock === "" ? undefined : Number(stock),
    });
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Nome do produto">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Marca">
          <input
            required
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Categoria">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory)}
            className={inputCls}
          >
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Selo (opcional)">
          <select
            value={badge}
            onChange={(e) => setBadge(e.target.value as ProductBadge | "")}
            className={inputCls}
          >
            <option value="">Nenhum</option>
            {BADGES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Preço (BRL)">
          <input
            required
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Descrição curta">
        <textarea
          rows={2}
          value={shortDescription}
          onChange={(e) => setShort(e.target.value)}
          className={textareaCls}
        />
      </Field>

      <Field label="Descrição completa">
        <textarea
          rows={4}
          value={longDescription}
          onChange={(e) => setLong(e.target.value)}
          className={textareaCls}
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Benefícios (um por linha)">
          <textarea
            rows={4}
            value={benefits}
            onChange={(e) => setBenefits(e.target.value)}
            className={textareaCls}
          />
        </Field>
        <Field label="Modo de uso">
          <textarea
            rows={4}
            value={usage}
            onChange={(e) => setUsage(e.target.value)}
            className={textareaCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Biomarcadores alvo (ids, separados por vírgula)">
          <input
            value={targets}
            onChange={(e) => setTargets(e.target.value)}
            placeholder="ldl, hdl, vitd…"
            className={inputCls}
          />
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as AdminProductStatus)
            }
            className={inputCls}
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </Field>
        <Field label="Estoque">
          <input
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Salvando…" : initial ? "Salvar" : "Criar produto"}
        </Button>
      </div>
    </form>
  );
}

const inputCls =
  "h-10 w-full rounded-full border border-border bg-white px-4 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";
const textareaCls =
  "w-full rounded-[12px] border border-border bg-white p-3 text-[13px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-y";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px]">
      <span className="font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
