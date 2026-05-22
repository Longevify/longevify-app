"use client";

import { Phone, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { SymptomRedFlagHit } from "@/lib/symptoms/types";

/**
 * Card vermelho de escalação prioritária quando paciente registra sintoma
 * com severidade acima do threshold (ex.: taquicardia ≥ 7, dor de cabeça
 * ≥ 9, etc.).
 *
 * Estratégia idêntica ao critical card do PHQ-9 (Q9 ideação suicida):
 *   - Renderiza ANTES de qualquer análise normal
 *   - Cor de alerta máximo (vermelho)
 *   - Botões clicáveis `tel:188` (CVV) e `tel:192` (SAMU)
 *   - Reforço: "Dr. Lon é IA — você precisa de profissional humano"
 *
 * Renderiza nada se `hits` está vazio (componente seguro pra colocar
 * sempre no topo do page).
 */
export function SymptomRedFlagAlert({ hits }: { hits: SymptomRedFlagHit[] }) {
  if (hits.length === 0) return null;

  return (
    <Card className="border-2 border-red-600 bg-red-50 p-6 shadow-md">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-600 text-white">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-700">
            Atenção · avaliação prioritária
          </span>
          <h2 className="mt-1 text-[20px] font-semibold leading-tight text-red-900">
            {hits.length === 1
              ? "Um sintoma que você registrou precisa de atenção imediata"
              : `${hits.length} sintomas que você registrou precisam de atenção imediata`}
          </h2>
          <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-red-900/90">
            {hits.map((h) => (
              <div
                key={h.symptomId}
                className="rounded-lg border border-red-200 bg-white/60 p-3"
              >
                <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-red-700">
                  {h.symptomLabel} · severidade {h.severity}/10
                </div>
                <p>{h.escalation}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="tel:192"
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              <Phone className="h-4 w-4" />
              SAMU 192
            </a>
            <a
              href="tel:188"
              className="inline-flex items-center gap-2 rounded-full border border-red-600 bg-white px-4 py-2 text-[13px] font-semibold text-red-700 transition hover:bg-red-100"
            >
              <Phone className="h-4 w-4" />
              CVV 188 (saúde mental)
            </a>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-red-900/70">
            O Concierge &quot;Dr. Lon&quot; é uma IA — para sintomas com essa
            intensidade você precisa de profissional humano habilitado.
            Procure pronto-socorro mais próximo se houver agravamento.
          </p>
        </div>
      </div>
    </Card>
  );
}
