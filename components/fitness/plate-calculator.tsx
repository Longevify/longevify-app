"use client";

import { useMemo, useState } from "react";
import { X, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Phase 3D — Calculadora de anilhas.
 *
 * Recebe peso total e barra (default 20kg) e mostra quais anilhas
 * colocar em cada lado. Visual com cores reais de anilhas olímpicas.
 *
 * Anilhas disponíveis: 25, 20, 15, 10, 5, 2.5, 1.25 kg (cores IWF).
 */

interface PlateCalculatorProps {
  totalKg: number;
  /** Default 20kg (barra olímpica padrão). Pode ser 15 (mulher), 10 (training), etc */
  barWeightKg?: number;
  /** Set de anilhas disponíveis (default standard IWF) */
  availablePlates?: number[];
  onClose?: () => void;
}

// IWF colors (kg → tailwind class + name)
const PLATE_COLORS: Record<number, { bg: string; text: string; name: string }> = {
  25: { bg: "bg-red-600", text: "text-white", name: "vermelho" },
  20: { bg: "bg-blue-600", text: "text-white", name: "azul" },
  15: { bg: "bg-amber-400", text: "text-zinc-900", name: "amarelo" },
  10: { bg: "bg-emerald-600", text: "text-white", name: "verde" },
  5: { bg: "bg-zinc-200", text: "text-zinc-900", name: "branco" },
  2.5: { bg: "bg-zinc-900", text: "text-white", name: "preto" },
  1.25: { bg: "bg-orange-300", text: "text-zinc-900", name: "laranja" },
};

const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export function PlateCalculator({
  totalKg,
  barWeightKg = 20,
  availablePlates = DEFAULT_PLATES,
  onClose,
}: PlateCalculatorProps) {
  const [bar, setBar] = useState(barWeightKg);
  const [plates] = useState<number[]>(availablePlates);

  const result = useMemo(() => {
    const perSide = (totalKg - bar) / 2;
    if (perSide <= 0) {
      return {
        perSide: 0,
        platesUsed: [] as number[],
        remainder: 0,
        impossible: totalKg < bar,
      };
    }
    // Greedy: pega a maior anilha que cabe
    let remainder = perSide;
    const used: number[] = [];
    const sorted = [...plates].sort((a, b) => b - a);
    for (const p of sorted) {
      while (remainder >= p - 0.001) {
        used.push(p);
        remainder -= p;
      }
    }
    return { perSide, platesUsed: used, remainder, impossible: false };
  }, [totalKg, bar, plates]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
        <h4 className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-zinc-800">
          <Calculator className="h-3.5 w-3.5 text-brand-700" />
          Anilhas pra {totalKg}kg
        </h4>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="grid h-6 w-6 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-100"
            aria-label="Fechar"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="px-4 py-3">
        {/* Barra weight selector */}
        <div className="mb-3 flex items-center gap-2 text-[11px]">
          <span className="text-zinc-500">Barra:</span>
          {[20, 15, 10].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setBar(w)}
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums transition",
                bar === w
                  ? "bg-brand-700 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
              )}
            >
              {w}kg
            </button>
          ))}
        </div>

        {result.impossible ? (
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-[11.5px] text-amber-900">
            ⚠️ Peso total ({totalKg}kg) é menor que a barra ({bar}kg).
          </div>
        ) : result.perSide === 0 ? (
          <div className="rounded-xl bg-zinc-50 px-3 py-2 text-[11.5px] text-zinc-600">
            Apenas a barra ({bar}kg) — sem anilhas necessárias.
          </div>
        ) : (
          <>
            <div className="mb-2 text-[10.5px] text-zinc-500">
              Cada lado:{" "}
              <strong className="text-zinc-900 tabular-nums">
                {result.perSide.toFixed(2)}kg
              </strong>
              {result.remainder > 0.01 && (
                <span className="ml-2 text-amber-700">
                  (sobra {result.remainder.toFixed(2)}kg sem anilha)
                </span>
              )}
            </div>

            {/* Visualização da barra (1 lado) */}
            <div className="my-3 flex items-center justify-center gap-1 overflow-x-auto pb-1">
              {/* Anilhas (maior → menor da esquerda pra fora) */}
              {result.platesUsed.map((p, i) => {
                const colors = PLATE_COLORS[p] ?? PLATE_COLORS[5];
                const heightPct = Math.min(100, 40 + (p / 25) * 60);
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex shrink-0 items-center justify-center rounded-sm font-semibold tabular-nums shadow-sm",
                      colors.bg,
                      colors.text,
                    )}
                    style={{
                      width: p >= 10 ? "18px" : "10px",
                      height: `${heightPct}px`,
                      fontSize: p < 5 ? "7px" : "9px",
                    }}
                    aria-label={`${p}kg ${colors.name}`}
                  >
                    {p}
                  </div>
                );
              })}
              {/* Barra */}
              <div className="h-2.5 w-16 shrink-0 rounded-r-md bg-gradient-to-r from-zinc-400 to-zinc-300 shadow-inner" />
            </div>

            {/* Lista textual */}
            <ul className="flex flex-wrap gap-1.5 text-[11px]">
              {Array.from(
                result.platesUsed.reduce((acc, p) => {
                  acc.set(p, (acc.get(p) ?? 0) + 1);
                  return acc;
                }, new Map<number, number>()),
              )
                .sort((a, b) => b[0] - a[0])
                .map(([weight, count]) => {
                  const colors = PLATE_COLORS[weight] ?? PLATE_COLORS[5];
                  return (
                    <li
                      key={weight}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold tabular-nums ring-1 ring-zinc-200",
                      )}
                    >
                      <span
                        className={cn("h-2 w-2 rounded-full", colors.bg)}
                        aria-hidden
                      />
                      {count}× {weight}kg
                    </li>
                  );
                })}
            </ul>
            <p className="mt-2 text-[10px] text-zinc-400">
              Use o mesmo set em cada lado da barra (simétrico).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
