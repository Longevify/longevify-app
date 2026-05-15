"use client";

import {
  useRef,
  useState,
  useCallback,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Camera, ScanLine, Type, X, Loader2, CheckCircle2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  FoodItem,
  MealEntry,
  MealType,
  Nutrients,
  RecognizePhotoResponse,
  ParseTextResponse,
  BarcodeResponse,
} from "@/lib/dieta/types";
import {
  MOCK_RECOGNIZE_PHOTO,
  MOCK_PARSE_TEXT,
  MOCK_BARCODE,
} from "@/lib/dieta/mock";

type TabId = "photo" | "text" | "barcode";

interface Props {
  onClose: () => void;
  onSave: (entry: Omit<MealEntry, "id" | "patientId">) => void;
}

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Cafe da manha" },
  { value: "lunch", label: "Almoco" },
  { value: "dinner", label: "Jantar" },
  { value: "snack", label: "Lanche" },
];

function sumNutrients(items: FoodItem[]): Nutrients {
  return items.reduce<Nutrients>(
    (acc, item) => {
      const n = item.nutrients;
      return {
        calories: acc.calories + n.calories,
        protein: acc.protein + n.protein,
        carbs: acc.carbs + n.carbs,
        fat: acc.fat + n.fat,
        fiber: (acc.fiber ?? 0) + (n.fiber ?? 0),
        sugar: (acc.sugar ?? 0) + (n.sugar ?? 0),
        sodium: (acc.sodium ?? 0) + (n.sodium ?? 0),
        vitaminD: (acc.vitaminD ?? 0) + (n.vitaminD ?? 0),
        vitaminB12: (acc.vitaminB12 ?? 0) + (n.vitaminB12 ?? 0),
        iron: (acc.iron ?? 0) + (n.iron ?? 0),
        calcium: (acc.calcium ?? 0) + (n.calcium ?? 0),
        magnesium: (acc.magnesium ?? 0) + (n.magnesium ?? 0),
        omega3: (acc.omega3 ?? 0) + (n.omega3 ?? 0),
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function detectMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 14) return "lunch";
  if (h < 19) return "dinner";
  return "snack";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ParsedItemsList({
  items,
  onRemove,
}: {
  items: FoodItem[];
  onRemove: (idx: number) => void;
}) {
  if (items.length === 0) return null;
  const total = sumNutrients(items);

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 overflow-hidden">
      <ul className="divide-y divide-zinc-100">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center gap-2 px-3 py-2.5">
            <div className="flex-1 min-w-0">
              <span className="text-[14px] font-medium text-ink block truncate">
                {item.name}
              </span>
              <span className="text-[12px] text-muted">
                {item.quantity}
                {item.unit === "unit" ? " un" : item.unit} ·{" "}
                {Math.round(item.nutrients.calories)} kcal
                {item.confidence !== undefined && (
                  <span className="ml-1 text-zinc-400">
                    · {Math.round(item.confidence * 100)}%
                  </span>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-500"
              aria-label={`Remover ${item.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-zinc-200 bg-white px-3 py-2.5 flex items-center gap-3 text-[13px]">
        <span className="font-semibold text-ink">
          {Math.round(total.calories)} kcal
        </span>
        <span className="text-muted">
          P {Math.round(total.protein)}g · C {Math.round(total.carbs)}g · G{" "}
          {Math.round(total.fat)}g
        </span>
      </div>
    </div>
  );
}

function MealTypeSelect({
  value,
  onChange,
}: {
  value: MealType;
  onChange: (v: MealType) => void;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-muted mb-1.5 uppercase tracking-wider">
        Tipo de refeicao
      </label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MEAL_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              "rounded-xl border py-2 text-[13px] font-medium transition-colors",
              value === t.value
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-zinc-200 bg-white text-muted hover:border-brand-300 hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Photo Tab ─────────────────────────────────────────────────────────────────

function PhotoTab({ onConfirm }: { onConfirm: (items: FoodItem[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecognizePhotoResponse | null>(null);
  const [items, setItems] = useState<FoodItem[]>([]);

  const handleFile = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setResult(null);
    setItems([]);

    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/dieta/recognize-photo", {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error("Endpoint not ready");
      const data: RecognizePhotoResponse = await res.json();
      setResult(data);
      setItems(data.items);
    } catch {
      // Backend in flight — use mock
      setResult(MOCK_RECOGNIZE_PHOTO);
      setItems(MOCK_RECOGNIZE_PHOTO.items);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      {/* File input trigger */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Selecionar foto da refeicao"
        onChange={handleFile}
      />

      {!preview && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 py-10 text-muted transition-colors hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-700"
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white border border-zinc-200 shadow-sm">
            <Camera className="h-6 w-6" />
          </span>
          <div className="text-center">
            <p className="text-[15px] font-medium text-ink">
              Tirar foto / Escolher imagem
            </p>
            <p className="text-[13px] text-muted mt-0.5">
              Aponte a camera pra sua refeicao
            </p>
          </div>
        </button>
      )}

      {preview && (
        <div className="relative rounded-2xl overflow-hidden bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview da refeicao"
            className="w-full max-h-56 object-cover"
          />
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              setResult(null);
              setItems([]);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label="Remover foto"
          >
            <X className="h-4 w-4" />
          </button>

          {!loading && !result && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-full bg-white/90 px-4 py-2 text-[13px] font-medium text-ink"
              >
                Trocar foto
              </button>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-brand-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-[14px] font-medium">Analisando...</span>
        </div>
      )}

      {result && items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[13px] text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {items.length} item{items.length !== 1 ? "s" : ""} detectado
              {items.length !== 1 ? "s" : ""} · confianca media{" "}
              {Math.round(result.confidence * 100)}%
            </span>
          </div>
          <ParsedItemsList items={items} onRemove={removeItem} />
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={() => onConfirm(items)}
          >
            Confirmar e salvar
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Text Tab ─────────────────────────────────────────────────────────────────

function TextTab({ onConfirm }: { onConfirm: (items: FoodItem[]) => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [unparsed, setUnparsed] = useState<string[]>([]);
  const [analysed, setAnalysed] = useState(false);

  const handleAnalyse = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setItems([]);
    setUnparsed([]);
    setAnalysed(false);

    try {
      const res = await fetch("/api/dieta/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Endpoint not ready");
      const data: ParseTextResponse = await res.json();
      setItems(data.items);
      setUnparsed(data.unparsedTokens);
    } catch {
      setItems(MOCK_PARSE_TEXT.items);
      setUnparsed(MOCK_PARSE_TEXT.unparsedTokens);
    } finally {
      setLoading(false);
      setAnalysed(true);
    }
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <form onSubmit={handleAnalyse} className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (analysed) {
            setAnalysed(false);
            setItems([]);
          }
        }}
        placeholder="frango grelhado 150g, arroz integral 1 xicara, salada com azeite"
        rows={4}
        className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-[14px] text-ink placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />

      {unparsed.length > 0 && (
        <p className="text-[12px] text-amber-600">
          Nao reconhecido: {unparsed.join(", ")}
        </p>
      )}

      {!analysed && (
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full"
          disabled={!text.trim() || loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analisando...
            </>
          ) : (
            "Analisar"
          )}
        </Button>
      )}

      {analysed && items.length > 0 && (
        <div className="space-y-3">
          <ParsedItemsList items={items} onRemove={removeItem} />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAnalysed(false);
                setItems([]);
              }}
            >
              Editar texto
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              className="flex-1"
              onClick={() => onConfirm(items)}
              disabled={items.length === 0}
            >
              Salvar refeicao
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

// ─── Barcode Tab ──────────────────────────────────────────────────────────────

function BarcodeTab({ onConfirm }: { onConfirm: (items: FoodItem[]) => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BarcodeResponse | null>(null);
  const [quantity, setQuantity] = useState<number>(100);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchBarcode = async (barcodeCode: string) => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(
        `/api/dieta/barcode?code=${encodeURIComponent(barcodeCode)}`,
      );
      if (!res.ok) throw new Error("Endpoint not ready");
      const data: BarcodeResponse = await res.json();
      setResult(data);
      setQuantity(data.item.quantity);
    } catch {
      setResult(MOCK_BARCODE);
      setQuantity(MOCK_BARCODE.item.quantity);
    } finally {
      setLoading(false);
    }
  };

  const startScan = async () => {
    setScanning(true);

    // Try native BarcodeDetector first (Chrome Android, Chrome desktop 88+)
    if ("BarcodeDetector" in window) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // @ts-expect-error BarcodeDetector is not in TS lib yet
        const detector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "qr_code", "upc_a", "upc_e"],
        });

        const scan = async () => {
          if (!videoRef.current || !scanning) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const detected = barcodes[0].rawValue as string;
              stream.getTracks().forEach((t) => t.stop());
              setScanning(false);
              setCode(detected);
              await fetchBarcode(detected);
              return;
            }
          } catch {
            // continue
          }
          requestAnimationFrame(scan);
        };
        requestAnimationFrame(scan);
        return;
      } catch {
        // Camera permission denied — fall through to manual
        setScanning(false);
      }
    }

    // Fallback: dynamically import @zxing/library
    try {
      const { BrowserMultiFormatReader } = await import(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore — optional peer dep
        "@zxing/library"
      );
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (res: { getText: () => string } | null) => {
          if (res) {
            const detected = res.getText();
            reader.reset();
            setScanning(false);
            setCode(detected);
            void fetchBarcode(detected);
          }
        },
      );
      void result;
    } catch {
      // @zxing not installed — manual entry only
      setScanning(false);
    }
  };

  const stopScan = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const scaleNutrients = (n: typeof result extends null ? never : NonNullable<typeof result>["item"]["nutrients"], factor: number) => ({
    calories: n.calories * factor,
    protein: n.protein * factor,
    carbs: n.carbs * factor,
    fat: n.fat * factor,
    ...(n.fiber !== undefined && { fiber: n.fiber * factor }),
    ...(n.calcium !== undefined && { calcium: n.calcium * factor }),
  });

  const confirmWithQuantity = () => {
    if (!result) return;
    const basePer = result.item.quantity;
    const factor = quantity / basePer;
    const item: FoodItem = {
      ...result.item,
      quantity,
      nutrients: scaleNutrients(result.item.nutrients, factor),
    };
    onConfirm([item]);
  };

  return (
    <div className="space-y-4">
      {/* Camera viewfinder */}
      {scanning && (
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video
            ref={videoRef}
            className="w-full h-48 object-cover"
            muted
            playsInline
          />
          {/* Scan reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-28 w-48 rounded-xl border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
          <button
            type="button"
            onClick={stopScan}
            className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"
            aria-label="Cancelar scan"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!scanning && !result && (
        <button
          type="button"
          onClick={startScan}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 py-10 text-muted transition-colors hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-700"
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white border border-zinc-200 shadow-sm">
            <ScanLine className="h-6 w-6" />
          </span>
          <div className="text-center">
            <p className="text-[15px] font-medium text-ink">Escanear codigo</p>
            <p className="text-[13px] text-muted mt-0.5">
              EAN-13, EAN-8, QR Code
            </p>
          </div>
        </button>
      )}

      {/* Manual code input */}
      {!result && (
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ou digite o codigo manualmente"
            className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[14px] text-ink placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={!code.trim() || loading}
            onClick={() => fetchBarcode(code.trim())}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Buscar"
            )}
          </Button>
        </div>
      )}

      {/* Product result */}
      {result && (
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-[15px] font-semibold text-ink">
              {result.productName}
            </p>
            {result.brand && (
              <p className="text-[12px] text-muted">{result.brand}</p>
            )}
            <p className="mt-1 text-[13px] text-muted">
              {result.item.nutrients.calories} kcal / {result.servingSize}
            </p>
          </div>

          {/* Quantity editor */}
          <div>
            <label className="block text-[12px] font-medium text-muted mb-1.5">
              Quantidade (
              {result.item.unit === "ml" ? "ml" : "g"})
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 10))}
                className="grid h-9 w-9 place-items-center rounded-full border border-zinc-200 bg-white text-ink hover:bg-zinc-50"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-20 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-center text-[14px] tabular-nums text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 10)}
                className="grid h-9 w-9 place-items-center rounded-full border border-zinc-200 bg-white text-ink hover:bg-zinc-50"
              >
                +
              </button>
            </div>
          </div>

          {/* Scaled nutrition preview */}
          <div className="flex gap-4 text-[13px] text-muted tabular-nums">
            <span>
              {Math.round(
                (result.item.nutrients.calories / result.item.quantity) *
                  quantity,
              )}{" "}
              kcal
            </span>
            <span>
              P{" "}
              {(
                (result.item.nutrients.protein / result.item.quantity) *
                quantity
              ).toFixed(1)}
              g
            </span>
            <span>
              C{" "}
              {(
                (result.item.nutrients.carbs / result.item.quantity) *
                quantity
              ).toFixed(1)}
              g
            </span>
            <span>
              G{" "}
              {(
                (result.item.nutrients.fat / result.item.quantity) *
                quantity
              ).toFixed(1)}
              g
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setResult(null);
                setCode("");
              }}
            >
              Trocar produto
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              className="flex-1"
              onClick={confirmWithQuantity}
            >
              Salvar refeicao
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "photo", label: "Foto", icon: <Camera className="h-4 w-4" /> },
  { id: "text", label: "Texto", icon: <Type className="h-4 w-4" /> },
  { id: "barcode", label: "Codigo", icon: <ScanLine className="h-4 w-4" /> },
];

export function AddMealModal({ onClose, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("photo");
  const [mealType, setMealType] = useState<MealType>(detectMealType());
  const [pendingItems, setPendingItems] = useState<FoodItem[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = (items: FoodItem[]) => {
    setPendingItems(items);
    setConfirmed(true);
  };

  const handleSave = () => {
    if (pendingItems.length === 0) return;
    const total = sumNutrients(pendingItems);
    onSave({
      takenAt: new Date().toISOString(),
      mealType,
      inputMethod: activeTab,
      items: pendingItems,
      totalNutrients: total,
    });
    onClose();
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setPendingItems([]);
    setConfirmed(false);
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Adicionar refeicao"
    >
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative z-10 w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl bg-white shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden">
        {/* Handle (mobile) */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-zinc-200 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="text-[17px] font-semibold text-ink">
            Adicionar refeicao
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-zinc-100"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-5 pt-4">
          <div className="flex rounded-xl bg-zinc-100 p-1 gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-white text-ink shadow-sm"
                    : "text-muted hover:text-ink",
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {!confirmed && activeTab === "photo" && (
            <PhotoTab onConfirm={handleConfirm} />
          )}
          {!confirmed && activeTab === "text" && (
            <TextTab onConfirm={handleConfirm} />
          )}
          {!confirmed && activeTab === "barcode" && (
            <BarcodeTab onConfirm={handleConfirm} />
          )}

          {confirmed && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 text-[13px]">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {pendingItems.length} item
                  {pendingItems.length !== 1 ? "s" : ""} adicionado
                  {pendingItems.length !== 1 ? "s" : ""}
                </span>
              </div>
              <ParsedItemsList
                items={pendingItems}
                onRemove={(idx) => {
                  setPendingItems((prev) => prev.filter((_, i) => i !== idx));
                  if (pendingItems.length <= 1) setConfirmed(false);
                }}
              />
              <button
                type="button"
                className="text-[13px] text-brand-700 hover:text-brand-900 underline-offset-2 hover:underline"
                onClick={() => setConfirmed(false)}
              >
                Adicionar mais itens
              </button>
            </div>
          )}

          {/* Meal type selector — always visible */}
          <MealTypeSelect value={mealType} onChange={setMealType} />
        </div>

        {/* Save footer */}
        {confirmed && (
          <div className="border-t border-zinc-100 px-5 py-4">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleSave}
              disabled={pendingItems.length === 0}
            >
              Salvar refeicao
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
