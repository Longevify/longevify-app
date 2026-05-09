import type { LucideIcon } from "lucide-react";

interface TimelineStep {
  weeks: string;
  label: string;
  detail: string;
  icon: LucideIcon;
}

interface ProtocolTimelineProps {
  steps: TimelineStep[];
}

/**
 * Linha do tempo visual do protocolo — mostra ao paciente quando vai ver
 * resultado de cada intervenção. Hands-on: cards conectados por linha
 * gradiente, cada um com icone + janela temporal + descrição curta.
 *
 * Em desktop: horizontal com linha conectora.
 * Em mobile: vertical com timeline lateral.
 */
export function ProtocolTimeline({ steps }: ProtocolTimelineProps) {
  return (
    <div className="relative">
      {/* Desktop — grid horizontal com linha conectora */}
      <div className="hidden md:block">
        <div className="relative grid grid-cols-4 gap-4">
          {/* Linha conectora atrás dos cards */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-7 h-px bg-gradient-to-r from-brand-200 via-brand-400 to-brand-700"
          />

          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="relative flex flex-col gap-3">
                {/* Bolinha do step */}
                <div className="relative z-10 flex justify-center">
                  <div className="grid h-14 w-14 place-items-center rounded-full border border-brand-200 bg-surface shadow-[0_4px_12px_rgba(31,93,63,0.08)]">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-50 to-brand-100">
                      <Icon className="h-5 w-5 text-brand-700" />
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-brand-700">
                    {step.weeks}
                  </div>
                  <div className="mt-1 text-[14px] font-semibold text-ink">
                    {step.label}
                  </div>
                  <p className="mt-1 text-[12px] leading-snug text-muted">
                    {step.detail}
                  </p>
                </div>

                {/* Indicador de passo (idx) abaixo */}
                <div className="flex justify-center">
                  <span className="text-[10px] font-medium text-muted/60">
                    {idx === 0
                      ? "agora"
                      : idx === steps.length - 1
                        ? "marco final"
                        : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile — vertical com linha lateral */}
      <ol className="flex flex-col gap-5 md:hidden">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isLast = idx === steps.length - 1;
          return (
            <li key={step.label} className="relative flex gap-4">
              {/* Linha vertical conectora */}
              {!isLast && (
                <div
                  aria-hidden
                  className="absolute left-[27px] top-[56px] h-[calc(100%+20px)] w-px bg-gradient-to-b from-brand-300 to-brand-100"
                />
              )}

              <div className="relative z-10 flex shrink-0">
                <div className="grid h-14 w-14 place-items-center rounded-full border border-brand-200 bg-surface shadow-[0_4px_12px_rgba(31,93,63,0.08)]">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-50 to-brand-100">
                    <Icon className="h-5 w-5 text-brand-700" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <div className="text-[11px] font-medium uppercase tracking-wider text-brand-700">
                  {step.weeks}
                </div>
                <div className="text-[15px] font-semibold text-ink">
                  {step.label}
                </div>
                <p className="text-[13px] leading-snug text-muted">
                  {step.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
