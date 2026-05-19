"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ContraceptiveKind,
  CycleRegularity,
  ReproductiveStatus,
} from "@/lib/menstrual/types";
import {
  CONTRACEPTIVE_LABEL,
  REGULARITY_LABEL,
  REPRODUCTIVE_STATUS_LABEL,
} from "@/lib/menstrual/types";

/**
 * Wizard de onboarding pra ciclo menstrual.
 *
 * Lucas (2026-05-18): "Ao clicar na aba de Tracking do ciclo menstrual,
 * peça para ela responder a algumas perguntas chaves para montar essa
 * aba personalizada para o usuário."
 *
 * 6 slides, 1 pergunta cada — UX inspirada em Flo/Clue: tela cheia,
 * progresso visual, voltar disponível. Tom acolhedor, não-clínico.
 */

interface OnboardingState {
  lastPeriodStart: string; // YYYY-MM-DD
  avgCycleDays: number;
  avgPeriodDays: number;
  cycleRegularity: CycleRegularity;
  contraceptiveKind: ContraceptiveKind;
  reproductiveStatus: ReproductiveStatus;
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Props {
  onComplete: () => void;
  onCancel?: () => void;
}

export function MenstrualOnboardingWizard({ onComplete, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<OnboardingState>({
    lastPeriodStart: todayYmd(),
    avgCycleDays: 28,
    avgPeriodDays: 5,
    cycleRegularity: "regular",
    contraceptiveKind: "none",
    reproductiveStatus: "regular",
  });

  const totalSteps = 6;
  const progress = ((step + 1) / totalSteps) * 100;

  const next = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/menstrual/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_enabled: true,
          last_period_start: state.lastPeriodStart,
          avg_cycle_days: state.avgCycleDays,
          avg_period_days: state.avgPeriodDays,
          cycle_regularity: state.cycleRegularity,
          contraceptive_kind: state.contraceptiveKind,
          reproductive_status: state.reproductiveStatus,
          mark_onboarded: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-rose-50 via-white to-amber-50">
      {/* Header com progresso */}
      <div className="flex items-center gap-3 px-5 pt-[max(env(safe-area-inset-top),16px)] pb-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={back}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-zinc-700 transition hover:bg-white"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="h-9 w-9" />
        )}
        <div className="flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full bg-gradient-to-r from-rose-400 to-amber-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 text-center text-[11px] font-medium text-zinc-500">
            {step + 1} / {totalSteps}
          </div>
        </div>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-[12px] font-medium text-zinc-400 hover:text-zinc-600"
          >
            Pular
          </button>
        ) : (
          <div className="h-9 w-9" />
        )}
      </div>

      {/* Body — slides */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-24">
        {step === 0 && <SlideWelcome />}
        {step === 1 && (
          <SlideLastPeriod
            value={state.lastPeriodStart}
            onChange={(v) => setState({ ...state, lastPeriodStart: v })}
          />
        )}
        {step === 2 && (
          <SlideCycleLength
            value={state.avgCycleDays}
            onChange={(v) => setState({ ...state, avgCycleDays: v })}
          />
        )}
        {step === 3 && (
          <SlidePeriodLength
            value={state.avgPeriodDays}
            onChange={(v) => setState({ ...state, avgPeriodDays: v })}
          />
        )}
        {step === 4 && (
          <SlideRegularity
            regularity={state.cycleRegularity}
            onChangeRegularity={(v) =>
              setState({ ...state, cycleRegularity: v })
            }
          />
        )}
        {step === 5 && (
          <SlideContextual
            contraceptive={state.contraceptiveKind}
            onChangeContraceptive={(v) =>
              setState({ ...state, contraceptiveKind: v })
            }
            reproductive={state.reproductiveStatus}
            onChangeReproductive={(v) =>
              setState({ ...state, reproductiveStatus: v })
            }
          />
        )}
      </div>

      {/* Footer CTA */}
      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-white via-white to-transparent px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-6">
        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={step === totalSteps - 1 ? submit : next}
          disabled={saving}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-6 py-4 text-[15px] font-semibold text-white shadow-lg shadow-zinc-900/20 transition",
            "hover:bg-zinc-800 disabled:opacity-60",
          )}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : step === totalSteps - 1 ? (
            <>
              <Check className="h-4 w-4" />
              Concluir
            </>
          ) : (
            <>
              Continuar
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Slide 1: Welcome ──────────────────────────────────────────────────────

function SlideWelcome() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="text-[64px]">🌸</div>
      <h1 className="mt-4 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900">
        Tracking do ciclo
      </h1>
      <p className="mt-3 max-w-xs text-[14.5px] leading-relaxed text-zinc-600">
        Vamos personalizar essa aba pra você em 1 minuto. As respostas ficam
        privadas e ajudam a Longevify a interpretar com mais precisão o seu
        humor, energia, sono e sintomas ao longo do mês.
      </p>
    </div>
  );
}

// ─── Slide 2: DUM (data da última menstruação) ─────────────────────────────

function SlideLastPeriod({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex w-full max-w-xs flex-col items-center text-center">
      <div className="text-[48px]">📅</div>
      <h2 className="mt-3 text-[22px] font-semibold tracking-tight text-zinc-900">
        Quando começou seu último período?
      </h2>
      <p className="mt-2 text-[13px] text-zinc-500">
        Use a data do primeiro dia. Se não lembra exato, aproxime — você pode
        ajustar depois.
      </p>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        max={todayYmd()}
        className="mt-6 w-full rounded-2xl border-2 border-zinc-200 bg-white px-4 py-4 text-center text-[16px] font-medium text-zinc-800 focus:border-rose-400 focus:outline-none"
      />
    </div>
  );
}

// ─── Slide 3: Cycle length ────────────────────────────────────────────────

function SlideCycleLength({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex w-full max-w-xs flex-col items-center text-center">
      <div className="text-[48px]">🔄</div>
      <h2 className="mt-3 text-[22px] font-semibold tracking-tight text-zinc-900">
        Duração média do ciclo
      </h2>
      <p className="mt-2 text-[13px] text-zinc-500">
        Do primeiro dia da menstruação até o dia anterior do próximo período.
        Média típica: 28 dias.
      </p>
      <div className="mt-8 flex items-baseline gap-2 tabular-nums">
        <span className="text-[64px] font-bold text-rose-600">{value}</span>
        <span className="text-[16px] font-medium text-zinc-500">dias</span>
      </div>
      <input
        type="range"
        min={21}
        max={45}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-4 w-full accent-rose-500"
      />
      <div className="mt-1 flex w-full justify-between text-[10.5px] text-zinc-400">
        <span>21d</span>
        <span>28d (padrão)</span>
        <span>45d</span>
      </div>
    </div>
  );
}

// ─── Slide 4: Period length ───────────────────────────────────────────────

function SlidePeriodLength({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex w-full max-w-xs flex-col items-center text-center">
      <div className="text-[48px]">🩸</div>
      <h2 className="mt-3 text-[22px] font-semibold tracking-tight text-zinc-900">
        Duração média da menstruação
      </h2>
      <p className="mt-2 text-[13px] text-zinc-500">
        Quantos dias dura o sangramento, em média.
      </p>
      <div className="mt-8 flex items-baseline gap-2 tabular-nums">
        <span className="text-[64px] font-bold text-rose-600">{value}</span>
        <span className="text-[16px] font-medium text-zinc-500">dias</span>
      </div>
      <input
        type="range"
        min={2}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-4 w-full accent-rose-500"
      />
      <div className="mt-1 flex w-full justify-between text-[10.5px] text-zinc-400">
        <span>2d</span>
        <span>5d (padrão)</span>
        <span>10d</span>
      </div>
    </div>
  );
}

// ─── Slide 5: Regularity ──────────────────────────────────────────────────

function SlideRegularity({
  regularity,
  onChangeRegularity,
}: {
  regularity: CycleRegularity;
  onChangeRegularity: (v: CycleRegularity) => void;
}) {
  const options: CycleRegularity[] = [
    "regular",
    "variable",
    "irregular",
    "unknown",
  ];
  return (
    <div className="flex w-full max-w-xs flex-col items-center text-center">
      <div className="text-[48px]">📊</div>
      <h2 className="mt-3 text-[22px] font-semibold tracking-tight text-zinc-900">
        Seu ciclo é regular?
      </h2>
      <p className="mt-2 text-[13px] text-zinc-500">
        Isso nos ajuda a ajustar a precisão das previsões.
      </p>
      <div className="mt-6 flex w-full flex-col gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChangeRegularity(opt)}
            className={cn(
              "rounded-2xl border-2 px-4 py-3 text-left text-[14px] font-medium transition",
              regularity === opt
                ? "border-rose-500 bg-rose-50 text-rose-900"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300",
            )}
          >
            {REGULARITY_LABEL[opt]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Slide 6: Contraceptive + reproductive status ─────────────────────────

function SlideContextual({
  contraceptive,
  onChangeContraceptive,
  reproductive,
  onChangeReproductive,
}: {
  contraceptive: ContraceptiveKind;
  onChangeContraceptive: (v: ContraceptiveKind) => void;
  reproductive: ReproductiveStatus;
  onChangeReproductive: (v: ReproductiveStatus) => void;
}) {
  const repOpts: ReproductiveStatus[] = [
    "regular",
    "trying_to_conceive",
    "pregnant",
    "postpartum",
    "perimenopause",
    "menopause",
    "unknown",
  ];
  const contraceptiveOpts: ContraceptiveKind[] = [
    "none",
    "pill",
    "iud_hormonal",
    "iud_copper",
    "implant",
    "injection",
    "patch",
    "ring",
    "condom_only",
    "natural",
    "sterilization",
    "other",
  ];

  return (
    <div className="flex w-full max-w-sm flex-col text-center">
      <div className="text-[44px]">💭</div>
      <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-zinc-900">
        Última pergunta
      </h2>
      <p className="mt-2 text-[12.5px] text-zinc-500">
        Esses dados afetam predição e interpretação dos sintomas.
      </p>

      <div className="mt-5 text-left">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Momento atual
        </label>
        <select
          value={reproductive}
          onChange={(e) =>
            onChangeReproductive(e.target.value as ReproductiveStatus)
          }
          className="mt-1.5 w-full rounded-xl border-2 border-zinc-200 bg-white px-3 py-2.5 text-[14px] font-medium text-zinc-800 focus:border-rose-400 focus:outline-none"
        >
          {repOpts.map((opt) => (
            <option key={opt} value={opt}>
              {REPRODUCTIVE_STATUS_LABEL[opt]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 text-left">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Contraceptivo em uso
        </label>
        <select
          value={contraceptive}
          onChange={(e) =>
            onChangeContraceptive(e.target.value as ContraceptiveKind)
          }
          className="mt-1.5 w-full rounded-xl border-2 border-zinc-200 bg-white px-3 py-2.5 text-[14px] font-medium text-zinc-800 focus:border-rose-400 focus:outline-none"
        >
          {contraceptiveOpts.map((opt) => (
            <option key={opt} value={opt}>
              {CONTRACEPTIVE_LABEL[opt]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
