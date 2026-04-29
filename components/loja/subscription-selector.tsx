"use client";

import { useId, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  FREQUENCY_PRESETS,
  formatBRL,
  recommendInterval,
  type Product,
} from "@/lib/products";
import { cn } from "@/lib/utils";

interface SubscriptionSelectorProps {
  product: Product;
  /** Estado controlado: se o user marcou "comprar como assinatura". */
  recurring: boolean;
  onRecurringChange: (recurring: boolean) => void;
  /** Estado controlado: intervalo escolhido (em dias). */
  intervalDays: number;
  onIntervalChange: (intervalDays: number) => void;
  className?: string;
}

/**
 * Cartão interativo que aparece na página do produto pra ativar compra
 * recorrente. Mostra:
 *   - Toggle "Comprar como assinatura"
 *   - Recomendação calculada por AI a partir da posologia + tamanho do
 *     frasco (ex: 60 cápsulas, 1/dia → a cada 60 dias)
 *   - Botões pra escolher frequências comuns (mensal, bimestral, etc),
 *     com a recomendada destacada
 *   - Preço com desconto da assinatura
 *
 * Em produtos sem dados de posologia/frasco (exames, wearables), retorna
 * `null` — o caller decide o que renderizar no lugar.
 */
export function SubscriptionSelector({
  product,
  recurring,
  onRecurringChange,
  intervalDays,
  onIntervalChange,
  className,
}: SubscriptionSelectorProps) {
  const recommendation = useMemo(
    () => recommendInterval(product),
    [product],
  );
  const toggleId = useId();
  const [customMode, setCustomMode] = useState(false);

  if (!recommendation) return null;

  const discountedPrice = Math.round(
    product.priceBRL * (1 - recommendation.subscriptionDiscountPct / 100),
  );

  const isRecommended = (days: number) =>
    days === recommendation.intervalDays;

  // Garante que a recomendação está sempre na lista
  const presets = (() => {
    const inList = FREQUENCY_PRESETS.find(
      (p) => p.days === recommendation.intervalDays,
    );
    if (inList) return [...FREQUENCY_PRESETS];
    return [
      ...FREQUENCY_PRESETS,
      { days: recommendation.intervalDays, label: recommendation.label },
    ].sort((a, b) => a.days - b.days);
  })();

  return (
    <Card
      className={cn(
        "flex flex-col gap-4 border-brand-200 bg-brand-50/40 p-4",
        recurring && "border-brand-400 bg-brand-50",
        className,
      )}
    >
      {/* Toggle */}
      <label
        htmlFor={toggleId}
        className="flex cursor-pointer items-start gap-3"
      >
        <input
          id={toggleId}
          type="checkbox"
          checked={recurring}
          onChange={(e) => onRecurringChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer accent-brand-700"
        />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold text-ink">
              Comprar como assinatura
            </span>
            <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[11px] font-semibold text-white">
              -{recommendation.subscriptionDiscountPct}% recorrente
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
            Entrega automática + desconto. Pause ou cancele a qualquer
            momento.
          </p>
        </div>
      </label>

      {/* AI recommendation banner */}
      <div
        className={cn(
          "flex items-start gap-2 rounded-xl border border-brand-200 bg-white px-3 py-2.5",
          !recurring && "opacity-60",
        )}
      >
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
          <Sparkles className="h-3 w-3" />
        </span>
        <div className="flex-1 text-[12.5px] leading-snug">
          <span className="font-semibold text-ink">
            Recomendado: {recommendation.label}
          </span>
          <span className="ml-1 text-muted">
            ({recommendation.reasoning})
          </span>
        </div>
      </div>

      {/* Frequency picker */}
      <fieldset
        disabled={!recurring}
        className={cn(
          "flex flex-col gap-2",
          !recurring && "pointer-events-none opacity-60",
        )}
      >
        <legend className="mb-1 text-[11.5px] font-medium uppercase tracking-[0.1em] text-muted">
          Frequência de entrega
        </legend>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const selected = !customMode && intervalDays === preset.days;
            return (
              <button
                key={preset.days}
                type="button"
                onClick={() => {
                  setCustomMode(false);
                  onIntervalChange(preset.days);
                }}
                className={cn(
                  "relative flex flex-col items-start gap-0.5 rounded-2xl border px-3 py-2 text-left transition-colors",
                  selected
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-border bg-white text-ink hover:border-brand-300",
                )}
              >
                <span className="text-[13px] font-semibold leading-tight">
                  {preset.label}
                </span>
                <span
                  className={cn(
                    "text-[11px] leading-tight",
                    selected ? "text-white/80" : "text-muted",
                  )}
                >
                  {preset.days} dias
                </span>
                {isRecommended(preset.days) ? (
                  <span
                    className={cn(
                      "absolute -top-2 right-2 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide",
                      selected
                        ? "bg-white text-brand-800"
                        : "bg-brand-700 text-white",
                    )}
                  >
                    AI
                  </span>
                ) : null}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setCustomMode((m) => !m)}
            className={cn(
              "rounded-2xl border px-3 py-2 text-[13px] font-medium transition-colors",
              customMode
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-border bg-white text-ink hover:border-brand-300",
            )}
          >
            Custom
          </button>
        </div>
        {customMode ? (
          <div className="mt-1 flex items-center gap-2 text-[13px]">
            <span className="text-muted">A cada</span>
            <input
              type="number"
              min={7}
              max={365}
              value={intervalDays}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isFinite(v)) return;
                onIntervalChange(Math.max(7, Math.min(365, Math.floor(v))));
              }}
              className="h-9 w-20 rounded-full border border-border bg-white px-3 text-[13px] text-ink outline-none focus:border-brand-400"
            />
            <span className="text-muted">dias</span>
          </div>
        ) : null}
      </fieldset>

      {/* Price summary */}
      {recurring ? (
        <div className="flex items-baseline justify-between border-t border-brand-200 pt-3">
          <span className="text-[12px] text-muted">Preço por entrega</span>
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] text-muted line-through">
              {formatBRL(product.priceBRL)}
            </span>
            <span className="text-[16px] font-semibold text-brand-800">
              {formatBRL(discountedPrice)}
            </span>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
