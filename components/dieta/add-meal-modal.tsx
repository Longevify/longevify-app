"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  FileText,
  Barcode,
  ScanLine,
  X,
  Loader2,
  Check,
  Trash2,
  Pencil,
  Plus,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { FoodItem, MealType, Nutrients } from "@/lib/dieta/types";
import { MEAL_TYPE_ICON, MEAL_TYPE_LABEL } from "@/lib/dieta/types";
import { BarcodeScanner } from "./barcode-scanner";

/**
 * Lucas (2026-05-20): "Ao tirar uma foto de uma refeição, caso o modelo
 * tenha errado na análise de qualquer coisa, coloque opções para
 * adicionar alimentos, mudar a porção da refeição/alimento/unidades de
 * alimento." → edição inline (lápis abre form com nome/quantidade/unidade)
 * + botão "Adicionar item" que faz lookup via /api/dieta/parse-text e
 * cai pra item zerado se não reconhecer. Nutrientes reescalam
 * proporcionalmente quando user muda a quantidade.
 */

/** Reescala todos os nutrientes pelo fator dado (newQty / oldQty). */
function scaleNutrients(nutrients: Nutrients, factor: number): Nutrients {
  const result = { ...nutrients };
  for (const key of Object.keys(result) as (keyof Nutrients)[]) {
    const val = result[key];
    if (typeof val === "number") {
      result[key] = val * factor;
    }
  }
  return result;
}

const UNIT_OPTIONS: { value: FoodItem["unit"]; label: string }[] = [
  { value: "g", label: "g" },
  { value: "ml", label: "ml" },
  { value: "unit", label: "unidade" },
  { value: "tbsp", label: "colher" },
  { value: "cup", label: "xícara" },
];

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
  /** Estado do save (POST /api/dieta/meals). */
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  /**
   * Reset + close wrapper. Antes esse reset estava num useEffect que
   * dependia de `open` virar false — o linter ficou bravo (setState
   * dentro de effect = cascading renders). Agora reset roda só no
   * handler que de fato fecha o modal.
   */
  const handleClose = useCallback(() => {
    setItems([]);
    setTotalNutrients(null);
    setError(null);
    setLoading(false);
    setSaving(false);
    setSavedOk(false);
    onClose();
  }, [onClose]);

  // ESC fecha
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      // recalcula totals
      const totals = sumLocal(next);
      setTotalNutrients(totals);
      return next;
    });
  }, []);

  /**
   * Atualiza um item existente. Se o usuário muda a QUANTIDADE, a gente
   * reescala os nutrientes proporcionalmente (linear — funciona pra
   * gramatura; pra unit/colher/xícara é heurístico mas é o melhor
   * possível sem unit conversion completa).
   *
   * Se o usuário muda só o NOME ou a UNIDADE, mantemos nutrientes —
   * trocar arroz por farofa via edit não vai mudar kcal automaticamente.
   * Pra trocar de fato o alimento, o usuário deve deletar e adicionar
   * de novo (que aí faz lookup no parse-text).
   */
  const updateItem = useCallback(
    (
      id: string,
      patch: {
        name?: string;
        quantity?: number;
        unit?: FoodItem["unit"];
      },
    ) => {
      setItems((prev) => {
        const next = prev.map((item) => {
          if (item.id !== id) return item;
          let nutrients = item.nutrients;
          if (
            typeof patch.quantity === "number" &&
            patch.quantity !== item.quantity &&
            item.quantity > 0
          ) {
            const factor = patch.quantity / item.quantity;
            nutrients = scaleNutrients(item.nutrients, factor);
          }
          return {
            ...item,
            ...patch,
            nutrients,
          };
        });
        setTotalNutrients(sumLocal(next));
        return next;
      });
    },
    [],
  );

  /**
   * Adiciona um item manual. Tenta resolver nutrientes via
   * /api/dieta/parse-text (keyword DB). Se não reconhecer:
   *   - `opts.force === false` (default): NÃO adiciona, devolve
   *     `{ added: false, recognized: false }` pro form mostrar warning.
   *   - `opts.force === true`: adiciona com kcal=0 (usuário aceitou).
   *
   * Esse "two-step" evita ghost items zerados aparecerem no list quando
   * o user só queria experimentar uma busca.
   */
  const addManualItem = useCallback(
    async (
      name: string,
      quantity: number,
      unit: FoodItem["unit"],
      opts: { force?: boolean } = {},
    ): Promise<{ added: boolean; recognized: boolean }> => {
      let nutrients: Nutrients = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
      let recognized = false;
      // Lookup só faz sentido pra unidades de massa/volume — "1 unidade"
      // gera ambiguidade pro keyword parser.
      try {
        const lookupText =
          unit === "g" || unit === "ml"
            ? `${name} ${quantity}${unit}`
            : name;
        const res = await fetch("/api/dieta/parse-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: lookupText }),
        });
        if (res.ok) {
          const data = await res.json();
          const first = data?.items?.[0];
          if (first?.nutrients) {
            nutrients = first.nutrients;
            recognized = true;
          }
        }
      } catch {
        // Sem rede / 500 → segue com nutrientes zerados.
      }

      if (!recognized && !opts.force) {
        return { added: false, recognized: false };
      }

      const newItem: FoodItem = {
        id: `manual-${Date.now()}`,
        name: name.trim(),
        quantity,
        unit,
        nutrients,
        source: "manual",
      };
      setItems((prev) => {
        const next = [...prev, newItem];
        setTotalNutrients(sumLocal(next));
        return next;
      });
      return { added: true, recognized };
    },
    [],
  );

  const [addingManual, setAddingManual] = useState(false);

  /**
   * Salva a refeição via POST /api/dieta/meals.
   *
   * Lucas (2026-05-18): "a análise está acertando, porém não estão sendo
   * salvos esses dados novos (não precisa salvar as fotos tiradas)".
   * Antes era um mock que dava alert(). Agora persiste no Supabase
   * (tabela meal_entries com RLS).
   */
  const handleSave = useCallback(async () => {
    if (!items.length || !totalNutrients) return;
    setSaving(true);
    setError(null);

    // input_method = source do primeiro item (todos vêm da mesma origem).
    const inputMethod = items[0]?.source ?? "manual";

    try {
      const res = await fetch("/api/dieta/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_type: mealType,
          input_method: inputMethod,
          items,
          total_nutrients: totalNutrients,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(
          data?.error ?? `Erro ao salvar refeição (HTTP ${res.status})`,
        );
      }
      setSavedOk(true);
      // Fecha após breve flash de "salvo" → UX mais clara que alert
      setTimeout(() => {
        handleClose();
      }, 800);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro inesperado ao salvar",
      );
    } finally {
      setSaving(false);
    }
  }, [handleClose, items, mealType, totalNutrients]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
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
            onClick={handleClose}
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
                  <EditableFoodItemRow
                    key={item.id}
                    item={item}
                    onUpdate={(patch) => updateItem(item.id, patch)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
                {addingManual && (
                  <AddManualItemForm
                    onAdd={addManualItem}
                    onCancel={() => setAddingManual(false)}
                    onDone={() => setAddingManual(false)}
                  />
                )}
              </ul>

              {/* Botão "+ Adicionar item manualmente" — pra quando o AI
                  errou ou esqueceu de algo */}
              {!addingManual && (
                <button
                  type="button"
                  onClick={() => setAddingManual(true)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-300 bg-brand-50/40 px-3 py-2.5 text-[12px] font-semibold text-brand-700 transition hover:border-brand-500 hover:bg-brand-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar item manualmente
                </button>
              )}

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
                  disabled={saving || savedOk}
                  className={cn(
                    "mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14px] font-semibold text-white transition",
                    savedOk
                      ? "bg-emerald-600"
                      : "bg-brand-700 hover:bg-brand-800 disabled:opacity-60",
                  )}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : savedOk ? (
                    <>
                      <Check className="h-4 w-4" />
                      Salvo!
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Salvar refeição
                    </>
                  )}
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
  const [scannerOpen, setScannerOpen] = useState(false);

  const lookup = useCallback(
    async (theCode: string, theGrams: string) => {
      if (!/^\d{8,14}$/.test(theCode)) {
        setError("Código deve ter 8 a 14 dígitos.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/dieta/barcode?code=${theCode}&grams=${theGrams}`,
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        setItems([data.item]);
        setTotalNutrients(data.item.nutrients);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao buscar produto",
        );
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setItems, setTotalNutrients],
  );

  const submit = () => lookup(code, grams);

  const handleScanned = (scannedCode: string) => {
    setCode(scannedCode);
    setScannerOpen(false);
    // Auto-lookup imediatamente — esse é o ponto do scan: o user não quer
    // digitar nem clicar "buscar" depois.
    lookup(scannedCode, grams);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* CTA Escanear — destaque visual, esse é o caminho preferido */}
      <button
        type="button"
        onClick={() => setScannerOpen(true)}
        disabled={loading}
        className="group relative flex items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 px-5 py-3.5 text-[14px] font-semibold text-white shadow-md transition active:scale-[0.98] disabled:opacity-50"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-1 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,.18),transparent_50%)]"
        />
        <ScanLine className="relative h-5 w-5" />
        <span className="relative">Escanear código de barras</span>
      </button>

      {/* Divider "ou digitar" */}
      <div className="flex items-center gap-3 py-1 text-[10.5px] uppercase tracking-wider text-zinc-400">
        <div className="h-px flex-1 bg-zinc-200" />
        ou digitar
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

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
        className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
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

      {/* Scanner fullscreen */}
      {scannerOpen && (
        <BarcodeScanner
          onDetected={handleScanned}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
}

// ─── EditableFoodItemRow ───────────────────────────────────────────────────
//
// Linha de item com modo "leitura" e modo "edição inline". Cada row
// gerencia seu próprio rascunho — o pai só fica sabendo via onUpdate
// quando user clica "Salvar".

interface EditableFoodItemRowProps {
  item: FoodItem;
  onUpdate: (patch: {
    name?: string;
    quantity?: number;
    unit?: FoodItem["unit"];
  }) => void;
  onRemove: () => void;
}

function EditableFoodItemRow({
  item,
  onUpdate,
  onRemove,
}: EditableFoodItemRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [draftName, setDraftName] = useState(item.name);
  const [draftQty, setDraftQty] = useState(String(item.quantity));
  const [draftUnit, setDraftUnit] = useState<FoodItem["unit"]>(item.unit);

  // Resincroniza drafts quando item externamente muda (ex: outro lugar
  // edita o mesmo item — improvável, mas mantém o componente honesto).
  useEffect(() => {
    if (!expanded) {
      setDraftName(item.name);
      setDraftQty(String(item.quantity));
      setDraftUnit(item.unit);
    }
  }, [item.name, item.quantity, item.unit, expanded]);

  function commit() {
    const qty = parseFloat(draftQty.replace(",", "."));
    if (Number.isNaN(qty) || qty <= 0) return;
    const trimmedName = draftName.trim() || item.name;
    onUpdate({
      name: trimmedName,
      quantity: qty,
      unit: draftUnit,
    });
    setExpanded(false);
  }

  function cancel() {
    setDraftName(item.name);
    setDraftQty(String(item.quantity));
    setDraftUnit(item.unit);
    setExpanded(false);
  }

  if (!expanded) {
    return (
      <li className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2">
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
          onClick={() => setExpanded(true)}
          aria-label="Editar"
          className="grid h-7 w-7 place-items-center rounded-full text-zinc-400 transition hover:bg-brand-50 hover:text-brand-700"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover"
          className="grid h-7 w-7 place-items-center rounded-full text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </li>
    );
  }

  const qtyChanged = parseFloat(draftQty.replace(",", ".")) !== item.quantity;

  return (
    <li className="rounded-xl border border-brand-300 bg-brand-50/40 px-3 py-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="Nome do alimento"
          className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover item"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Quantidade
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={draftQty}
            onChange={(e) => setDraftQty(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] tabular-nums text-zinc-900 focus:border-brand-400 focus:outline-none"
          />
        </div>
        <div className="w-[112px]">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Unidade
          </label>
          <select
            value={draftUnit}
            onChange={(e) =>
              setDraftUnit(e.target.value as FoodItem["unit"])
            }
            className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[13px] text-zinc-900 focus:border-brand-400 focus:outline-none"
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="mt-2 text-[10.5px] leading-relaxed text-zinc-500">
        {qtyChanged
          ? "💡 Os nutrientes serão reescalados proporcionalmente."
          : "Trocar o nome não muda os nutrientes automaticamente — pra trocar de alimento, remova e adicione de novo."}
      </p>
      <div className="mt-2.5 flex justify-end gap-2">
        <button
          type="button"
          onClick={cancel}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-600 transition hover:bg-zinc-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={commit}
          className="rounded-lg bg-brand-700 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-brand-800"
        >
          Salvar
        </button>
      </div>
    </li>
  );
}

// ─── AddManualItemForm ─────────────────────────────────────────────────────
//
// Form inline pra adicionar item manual. Tenta resolver nutrientes via
// /api/dieta/parse-text (keyword DB). Mostra feedback se não reconheceu —
// nesse caso o item é criado zerado e o usuário sabe que pode editar
// quantidade pra escalar (não vai escalar nada, claro, pois 0 * fator = 0
// — mas a UX fica honesta).

interface AddManualItemFormProps {
  onAdd: (
    name: string,
    quantity: number,
    unit: FoodItem["unit"],
    opts?: { force?: boolean },
  ) => Promise<{ added: boolean; recognized: boolean }>;
  onCancel: () => void;
  onDone: () => void;
}

function AddManualItemForm({ onAdd, onCancel, onDone }: AddManualItemFormProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("100");
  const [unit, setUnit] = useState<FoodItem["unit"]>("g");
  const [submitting, setSubmitting] = useState(false);
  const [notRecognized, setNotRecognized] = useState(false);

  async function submit() {
    const qty = parseFloat(quantity.replace(",", "."));
    if (!name.trim() || Number.isNaN(qty) || qty <= 0) return;
    setSubmitting(true);
    setNotRecognized(false);
    try {
      const result = await onAdd(name.trim(), qty, unit);
      if (result.added) {
        onDone();
      } else {
        // Não reconhecido — pedimos ao usuário se quer adicionar mesmo
        // assim (sem nutrientes) ou tentar com outro nome.
        setNotRecognized(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function addAnyway() {
    const qty = parseFloat(quantity.replace(",", "."));
    if (!name.trim() || Number.isNaN(qty) || qty <= 0) return;
    setSubmitting(true);
    try {
      await onAdd(name.trim(), qty, unit, { force: true });
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li className="rounded-xl border border-brand-300 border-dashed bg-brand-50/40 px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
          Adicionar item
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar"
          className="grid h-6 w-6 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <input
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (notRecognized) setNotRecognized(false);
        }}
        placeholder="Ex: Filé de frango grelhado"
        autoFocus
        className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
      />
      <div className="mt-2 flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Quantidade
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] tabular-nums text-zinc-900 focus:border-brand-400 focus:outline-none"
          />
        </div>
        <div className="w-[112px]">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Unidade
          </label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as FoodItem["unit"])}
            className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[13px] text-zinc-900 focus:border-brand-400 focus:outline-none"
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {notRecognized ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-800">
          ⚠️ Não conseguimos identificar os nutrientes desse item. Tente
          outro nome ou adicione mesmo assim (com kcal = 0).
        </p>
      ) : (
        <p className="mt-2 text-[10.5px] leading-relaxed text-zinc-500">
          Tentamos preencher os nutrientes automaticamente a partir do
          nome (base TACO/USDA).
        </p>
      )}
      <div className="mt-2.5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-600 transition hover:bg-zinc-50"
        >
          Cancelar
        </button>
        {notRecognized ? (
          <>
            <button
              type="button"
              onClick={addAnyway}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-[12px] font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Adicionar mesmo assim
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!name.trim() || submitting}
              className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-brand-800 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Tentar de novo
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim() || submitting}
            className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-brand-800 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Adicionar
          </button>
        )}
      </div>
    </li>
  );
}
