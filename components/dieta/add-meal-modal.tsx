"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  FileText,
  Barcode,
  X,
  Loader2,
  Check,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { FoodItem, MealType, Nutrients } from "@/lib/dieta/types";
import { MEAL_TYPE_ICON, MEAL_TYPE_LABEL } from "@/lib/dieta/types";

type Tab = "photo" | "text" | "barcode";

interface AddMealModalProps {
  open: boolean;
  onClose: () => void;
}

function fmt(n: number, d = 0): string {
  return n.toFixed(d).replace(".", ",");
}

export function AddMealModal({ open, onClose }: AddMealModalProps) {
  const [tab, setTab] = useState<Tab>("photo");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [items, setItems] = useState<FoodItem[]>([]);
  const [totalNutrients, setTotalNutrients] = useState<Nutrients | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setItems([]);
      setTotalNutrients(null);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  // ESC fecha
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      // recalcula totals
      const totals = sumLocal(next);
      setTotalNutrients(totals);
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    // TODO: POST /api/dieta/meals quando endpoint estiver pronto.
    // Por enquanto fecha o modal (mock save).
    alert(
      `Refeição "${MEAL_TYPE_LABEL[mealType]}" salva! ${items.length} items, ${fmt(totalNutrients?.calories ?? 0)} kcal.`,
    );
    onClose();
  }, [items.length, mealType, onClose, totalNutrients]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-white shadow-2xl",
          "sm:max-w-[560px] sm:rounded-[20px]",
          "rounded-t-[20px]",
        )}
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-[16px] font-semibold text-zinc-900">
            Adicionar refeição
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Tabs */}
        <div className="flex shrink-0 gap-1 px-5 pt-4">
          {[
            { id: "photo" as Tab, label: "Foto", Icon: Camera },
            { id: "text" as Tab, label: "Texto", Icon: FileText },
            { id: "barcode" as Tab, label: "Código", Icon: Barcode },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setItems([]);
                setTotalNutrients(null);
                setError(null);
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-semibold transition",
                tab === id
                  ? "bg-brand-700 text-white shadow-sm"
                  : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-5">
          {tab === "photo" && (
            <PhotoInput
              loading={loading}
              setLoading={setLoading}
              setError={setError}
              setItems={setItems}
              setTotalNutrients={setTotalNutrients}
            />
          )}
          {tab === "text" && (
            <TextInput
              loading={loading}
              setLoading={setLoading}
              setError={setError}
              setItems={setItems}
              setTotalNutrients={setTotalNutrients}
            />
          )}
          {tab === "barcode" && (
            <BarcodeInput
              loading={loading}
              setLoading={setLoading}
              setError={setError}
              setItems={setItems}
              setTotalNutrients={setTotalNutrients}
            />
          )}

          {error && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {error}
            </div>
          )}

          {/* Items detectados */}
          {items.length > 0 && (
            <section className="mt-5">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Detectado · {items.length} item{items.length !== 1 ? "s" : ""}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-zinc-900">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {fmt(item.quantity)}
                        {item.unit} · {fmt(item.nutrients.calories)} kcal · P{" "}
                        {fmt(item.nutrients.protein, 1)}g
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label="Remover"
                      className="grid h-7 w-7 place-items-center rounded-full text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>

              {/* Totais */}
              {totalNutrients && (
                <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[22px] font-semibold tabular-nums text-brand-800">
                      {fmt(totalNutrients.calories)}
                    </span>
                    <span className="text-[12px] text-brand-600">kcal</span>
                  </div>
                  <div className="mt-1 grid grid-cols-3 gap-2 text-[11px]">
                    <span className="text-emerald-700">
                      P{" "}
                      <span className="font-semibold tabular-nums">
                        {fmt(totalNutrients.protein, 1)}g
                      </span>
                    </span>
                    <span className="text-amber-700">
                      C{" "}
                      <span className="font-semibold tabular-nums">
                        {fmt(totalNutrients.carbs, 1)}g
                      </span>
                    </span>
                    <span className="text-rose-700">
                      G{" "}
                      <span className="font-semibold tabular-nums">
                        {fmt(totalNutrients.fat, 1)}g
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {/* Tipo de refeição + Save */}
              <div className="mt-4">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Tipo de refeição
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map(
                    (mt) => (
                      <button
                        key={mt}
                        type="button"
                        onClick={() => setMealType(mt)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[12px] font-medium transition",
                          mealType === mt
                            ? "border-brand-700 bg-brand-700 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-brand-300",
                        )}
                      >
                        <span>{MEAL_TYPE_ICON[mt]}</span>
                        {MEAL_TYPE_LABEL[mt]}
                      </button>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-brand-800"
                >
                  <Check className="h-4 w-4" />
                  Salvar refeição
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helper: soma local pra recalcular totals quando remove item ────────────

function sumLocal(items: FoodItem[]): Nutrients {
  const totals: Nutrients = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    vitaminD: 0,
    vitaminB12: 0,
    iron: 0,
    calcium: 0,
    magnesium: 0,
    omega3: 0,
    zinc: 0,
  };
  for (const i of items) {
    for (const key of Object.keys(totals) as (keyof Nutrients)[]) {
      const val = i.nutrients[key];
      if (typeof val === "number") {
        totals[key] = (totals[key] ?? 0) + val;
      }
    }
  }
  return totals;
}

// ─── PhotoInput ────────────────────────────────────────────────────────────

interface InputProps {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  setItems: (v: FoodItem[]) => void;
  setTotalNutrients: (v: Nutrients) => void;
}

function PhotoInput({
  loading,
  setLoading,
  setError,
  setItems,
  setTotalNutrients,
}: InputProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/dieta/recognize-photo", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      // Surface "nenhum alimento identificado" como erro pro user trocar foto
      if (data.note && (data.items?.length ?? 0) === 0) {
        setError(data.note);
      }
      setItems(data.items ?? []);
      setTotalNutrients(data.totalNutrients);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao reconhecer foto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {!preview ? (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/40 px-6 py-12 transition hover:border-brand-500 hover:bg-brand-50/70"
          >
            <Camera className="h-10 w-10 text-brand-600" strokeWidth={1.5} />
            <div>
              <div className="text-[14px] font-semibold text-brand-700">
                Tirar foto ou escolher imagem
              </div>
              <div className="mt-1 text-[11.5px] text-zinc-500">
                IA identifica os alimentos e calcula nutrientes
              </div>
            </div>
          </button>
          <input
            ref={inputRef}
            type="file"
            // Restringe ao que a OpenAI vision aceita. Em iOS Safari,
            // isso força conversão automática de HEIC → JPEG na hora
            // do upload (workaround pra Lucas 2026-05-18 que recebia
            // "The string did not match the expected pattern" ao
            // mandar foto do iPhone — OpenAI não aceita HEIC).
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </>
      ) : (
        <div className="w-full">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-zinc-200">
            <Image
              src={preview}
              alt="Prato"
              fill
              className="object-cover"
              unoptimized
            />
            {loading && (
              <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-sm">
                <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-medium text-zinc-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando...
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              setItems([]);
              setError(null);
            }}
            className="mt-3 w-full rounded-xl border border-zinc-200 px-4 py-2 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Trocar foto
          </button>
        </div>
      )}
    </div>
  );
}

// ─── TextInput ─────────────────────────────────────────────────────────────

function TextInput({
  loading,
  setLoading,
  setError,
  setItems,
  setTotalNutrients,
}: InputProps) {
  const [text, setText] = useState("");

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dieta/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.items.length === 0) {
        setError(data.note ?? "Nenhum alimento reconhecido.");
      }
      setItems(data.items ?? []);
      setTotalNutrients(data.totalNutrients);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ex: frango grelhado 150g, arroz integral, brócolis, azeite"
        rows={4}
        className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={loading || !text.trim()}
        className="flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-800 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? "Analisando..." : "Analisar"}
      </button>
      <p className="text-[11px] leading-relaxed text-zinc-500">
        💡 Dica: especifique gramas quando souber (ex: &ldquo;200g de
        arroz&rdquo;). Sem quantidade, usamos porção padrão.
      </p>
    </div>
  );
}

// ─── BarcodeInput ──────────────────────────────────────────────────────────

function BarcodeInput({
  loading,
  setLoading,
  setError,
  setItems,
  setTotalNutrients,
}: InputProps) {
  const [code, setCode] = useState("");
  const [grams, setGrams] = useState("100");

  const submit = async () => {
    if (!/^\d{8,14}$/.test(code)) {
      setError("Código deve ter 8 a 14 dígitos.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dieta/barcode?code=${code}&grams=${grams}`,
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setItems([data.item]);
      setTotalNutrients(data.item.nutrients);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Código de barras
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="7891234567890"
          maxLength={14}
          className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[14px] tabular-nums text-zinc-800 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Quantidade consumida (g)
        </label>
        <input
          type="number"
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
          min={1}
          className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[14px] tabular-nums text-zinc-800 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
        />
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={loading || !code}
        className="flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-800 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? "Buscando..." : "Buscar produto"}
      </button>
      <p className="text-[11px] leading-relaxed text-zinc-500">
        🌍 Usamos a base{" "}
        <a
          href="https://world.openfoodfacts.org"
          target="_blank"
          rel="noopener"
          className="underline"
        >
          Open Food Facts
        </a>{" "}
        — cobertura BR ~80% dos produtos industrializados.
      </p>
    </div>
  );
}
