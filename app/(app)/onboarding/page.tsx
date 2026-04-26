"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  OnboardingStepper,
  type OnboardingStep,
} from "@/components/onboarding/stepper";
import { CalendarPicker } from "@/components/scheduling/calendar-picker";
import { LocationPicker } from "@/components/scheduling/location-picker";
import {
  bookSlot,
  type CollectionLocation,
} from "@/lib/scheduling/slots";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/products";

const ONBOARDING_KEY = "longevify.onboarding.draft";

const STEPS: OnboardingStep[] = [
  { id: "perfil", label: "Perfil" },
  { id: "historico", label: "Histórico" },
  { id: "estilo", label: "Estilo de vida" },
  { id: "objetivos", label: "Objetivos" },
  { id: "agendamento", label: "Agendamento" },
  { id: "confirmacao", label: "Pronto" },
];

const GOALS = [
  { id: "longevidade", label: "Longevidade" },
  { id: "performance", label: "Performance" },
  { id: "perda-peso", label: "Perda de peso" },
  { id: "energia", label: "Energia" },
  { id: "preventivo", label: "Preventivo" },
] as const;

const CONDITIONS = [
  { id: "nenhuma", label: "Nenhuma" },
  { id: "hipertensao", label: "Hipertensão" },
  { id: "diabetes", label: "Diabetes" },
  { id: "colesterol", label: "Colesterol alto" },
  { id: "outras", label: "Outras" },
] as const;

const FAMILY_HISTORY = [
  { id: "cardio", label: "Cardiovascular" },
  { id: "diabetes", label: "Diabetes" },
  { id: "cancer", label: "Câncer" },
  { id: "alzheimer", label: "Alzheimer/demência" },
  { id: "nenhum", label: "Nenhum relevante" },
] as const;

const ACTIVITY = [
  { id: "sedentario", label: "Sedentário" },
  { id: "leve", label: "Leve (1-2x/semana)" },
  { id: "moderado", label: "Moderado (3-4x/semana)" },
  { id: "intenso", label: "Intenso (5+x/semana)" },
] as const;

const DIETS = [
  { id: "omnivora", label: "Omnívora" },
  { id: "pesco", label: "Pescetariana" },
  { id: "vegetariana", label: "Vegetariana" },
  { id: "vegana", label: "Vegana" },
  { id: "cetogenica", label: "Cetogênica" },
  { id: "outra", label: "Outra" },
] as const;

const PRIMARY_GOALS = [
  {
    id: "ponto-partida",
    label: "Quero entender o ponto de partida da minha saúde",
  },
  {
    id: "investigar-sintomas",
    label: "Quero investigar sintomas específicos que tenho sentido",
  },
  {
    id: "otimizar-performance",
    label: "Quero otimizar performance física e cognitiva",
  },
  { id: "gestacao", label: "Quero me preparar pra gestação" },
] as const;

interface OnboardingDraft {
  step: number;
  // 1 — perfil
  fullName: string;
  age: string;
  heightCm: string;
  weightKg: string;
  goals: string[];
  // 2 — histórico
  conditions: string[];
  medications: string;
  allergies: string;
  familyHistory: string[];
  // 3 — estilo de vida
  sleepHours: number;
  activity: string;
  diet: string;
  alcohol: string;
  tobacco: string;
  // 4 — objetivos do exame
  primaryGoal: string;
  // 5 — agendamento
  location: CollectionLocation;
  selectedSlotISO: string | null;
  address: string;
  weekOffsetDays: number;
}

const INITIAL_DRAFT: OnboardingDraft = {
  step: 0,
  fullName: "",
  age: "",
  heightCm: "",
  weightKg: "",
  goals: [],
  conditions: [],
  medications: "",
  allergies: "",
  familyHistory: [],
  sleepHours: 7,
  activity: "",
  diet: "",
  alcohol: "social",
  tobacco: "nunca",
  primaryGoal: "",
  location: "home",
  selectedSlotISO: null,
  address: "",
  weekOffsetDays: 0,
};

function loadDraft(): OnboardingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...INITIAL_DRAFT, ...parsed };
  } catch {
    return null;
  }
}

export default function OnboardingPage() {
  const [draft, setDraft] = useState<OnboardingDraft>(INITIAL_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = loadDraft();
    if (saved) setDraft(saved);
    setHydrated(true);
  }, []);

  // Persiste em cada mudança (após hidratar pra não sobrescrever).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(draft));
    } catch {
      /* quota ignorada */
    }
  }, [draft, hydrated]);

  function patch(p: Partial<OnboardingDraft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function go(stepDelta: number) {
    setDraft((d) => ({
      ...d,
      step: Math.max(0, Math.min(STEPS.length - 1, d.step + stepDelta)),
    }));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function finalize() {
    if (!draft.selectedSlotISO) return;
    setSubmitting(true);
    try {
      await bookSlot(
        new Date(draft.selectedSlotISO),
        draft.location,
        draft.location === "home" ? draft.address : undefined,
      );
      toast.success({
        title: "Coleta agendada",
        description: "Te enviamos a confirmação por email.",
      });
      patch({ step: STEPS.length - 1 });
    } catch (err) {
      toast.error({
        title: "Não conseguimos confirmar",
        description: err instanceof Error ? err.message : "Tente de novo.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const current = draft.step;
  const stepValid = useMemo(() => isStepValid(draft), [draft]);

  return (
    <div className="mx-auto w-full max-w-[920px] px-6 py-10">
      <header className="pb-6">
        <span className="text-[13px] text-muted">Primeiro acesso</span>
        <h1 className="text-[34px] leading-[1.05] font-semibold tracking-tight">
          Vamos personalizar sua Longevify
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Em poucos minutos preparamos seu protocolo, agendamos a coleta e
          deixamos tudo pronto pra começar.
        </p>
      </header>

      <div className="sticky top-4 z-10 mb-6 rounded-2xl border border-border bg-white/95 p-3 shadow-[0_4px_18px_-12px_rgba(13,40,24,.18)] backdrop-blur">
        <OnboardingStepper
          steps={STEPS}
          current={current}
          onJump={(i) => i <= current && patch({ step: i })}
        />
      </div>

      <Card className="flex flex-col gap-6 p-6 sm:p-8">
        {current === 0 ? (
          <StepPerfil draft={draft} patch={patch} />
        ) : null}
        {current === 1 ? (
          <StepHistorico draft={draft} patch={patch} />
        ) : null}
        {current === 2 ? (
          <StepEstilo draft={draft} patch={patch} />
        ) : null}
        {current === 3 ? (
          <StepObjetivos draft={draft} patch={patch} />
        ) : null}
        {current === 4 ? (
          <StepAgendamento draft={draft} patch={patch} />
        ) : null}
        {current === 5 ? <StepConfirmacao draft={draft} /> : null}

        <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
          <Button
            variant="ghost"
            size="md"
            onClick={() => go(-1)}
            disabled={current === 0 || submitting}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          {current < 4 ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => go(1)}
              disabled={!stepValid}
            >
              Continuar
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : null}

          {current === 4 ? (
            <Button
              variant="dark"
              size="md"
              onClick={finalize}
              disabled={!stepValid || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirmando…
                </>
              ) : (
                <>
                  Confirmar agendamento
                  <Check className="h-4 w-4" />
                </>
              )}
            </Button>
          ) : null}

          {current === 5 ? (
            <Link href="/home">
              <Button variant="primary" size="md">
                Ir pra plataforma
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Steps
// ─────────────────────────────────────────────────────────────────────

function StepPerfil({
  draft,
  patch,
}: {
  draft: OnboardingDraft;
  patch: (p: Partial<OnboardingDraft>) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Heading
        title="Quem é você?"
        subtitle="A base do seu protocolo: dados antropométricos e objetivos."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nome completo" full>
          <TextInput
            value={draft.fullName}
            onChange={(v) => patch({ fullName: v })}
            placeholder="João da Silva"
          />
        </Field>
        <Field label="Idade">
          <TextInput
            value={draft.age}
            onChange={(v) => patch({ age: v })}
            type="number"
            placeholder="34"
          />
        </Field>
        <Field label="Altura (cm)">
          <TextInput
            value={draft.heightCm}
            onChange={(v) => patch({ heightCm: v })}
            type="number"
            placeholder="178"
          />
        </Field>
        <Field label="Peso (kg)">
          <TextInput
            value={draft.weightKg}
            onChange={(v) => patch({ weightKg: v })}
            type="number"
            placeholder="76"
          />
        </Field>
      </div>

      <Field label="Principais objetivos (escolha um ou mais)" full>
        <PillMulti
          options={GOALS}
          values={draft.goals}
          onChange={(values) => patch({ goals: values })}
        />
      </Field>
    </div>
  );
}

function StepHistorico({
  draft,
  patch,
}: {
  draft: OnboardingDraft;
  patch: (p: Partial<OnboardingDraft>) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Heading
        title="Histórico clínico"
        subtitle="Compartilhe o que for relevante. Vai pro Concierge IA, não pra ninguém mais."
      />

      <Field label="Condições conhecidas" full>
        <PillMulti
          options={CONDITIONS}
          values={draft.conditions}
          onChange={(values) => patch({ conditions: values })}
        />
      </Field>

      <Field label="Medicações em uso" full>
        <TextArea
          value={draft.medications}
          onChange={(v) => patch({ medications: v })}
          placeholder="Liste medicações, suplementos ou hormônios em uso contínuo."
        />
      </Field>

      <Field label="Alergias" full>
        <TextArea
          value={draft.allergies}
          onChange={(v) => patch({ allergies: v })}
          placeholder="Medicamentosas, alimentares ou ambientais."
        />
      </Field>

      <Field label="Histórico familiar" full>
        <PillMulti
          options={FAMILY_HISTORY}
          values={draft.familyHistory}
          onChange={(values) => patch({ familyHistory: values })}
        />
      </Field>
    </div>
  );
}

function StepEstilo({
  draft,
  patch,
}: {
  draft: OnboardingDraft;
  patch: (p: Partial<OnboardingDraft>) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Heading
        title="Estilo de vida"
        subtitle="Sono, movimento e dieta — os pilares que mais movem biomarcadores."
      />

      <Field
        label={`Sono médio: ${draft.sleepHours}h por noite`}
        hint="Use o slider pra ajustar"
        full
      >
        <input
          type="range"
          min={3}
          max={12}
          step={0.5}
          value={draft.sleepHours}
          onChange={(e) => patch({ sleepHours: Number(e.target.value) })}
          className="w-full accent-brand-600"
          aria-label="Horas de sono médias"
        />
      </Field>

      <Field label="Atividade física" full>
        <RadioGrid
          name="activity"
          options={ACTIVITY}
          value={draft.activity}
          onChange={(v) => patch({ activity: v })}
        />
      </Field>

      <Field label="Dieta" full>
        <RadioGrid
          name="diet"
          options={DIETS}
          value={draft.diet}
          onChange={(v) => patch({ diet: v })}
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Álcool">
          <RadioColumn
            name="alcohol"
            options={[
              { id: "nunca", label: "Nunca" },
              { id: "social", label: "Social (1-3/semana)" },
              { id: "frequente", label: "Frequente (4+/semana)" },
            ]}
            value={draft.alcohol}
            onChange={(v) => patch({ alcohol: v })}
          />
        </Field>
        <Field label="Tabaco">
          <RadioColumn
            name="tobacco"
            options={[
              { id: "nunca", label: "Nunca" },
              { id: "ex", label: "Ex-fumante" },
              { id: "atual", label: "Fumante atual" },
            ]}
            value={draft.tobacco}
            onChange={(v) => patch({ tobacco: v })}
          />
        </Field>
      </div>
    </div>
  );
}

function StepObjetivos({
  draft,
  patch,
}: {
  draft: OnboardingDraft;
  patch: (p: Partial<OnboardingDraft>) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Heading
        title="Qual o seu objetivo principal com o exame?"
        subtitle="Escolha o que mais combina com você — vamos calibrar a leitura inicial."
      />
      <div className="flex flex-col gap-2">
        {PRIMARY_GOALS.map((opt) => {
          const selected = draft.primaryGoal === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => patch({ primaryGoal: opt.id })}
              aria-pressed={selected}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors",
                selected
                  ? "border-brand-700 bg-brand-50 shadow-[0_8px_24px_-12px_rgba(13,40,24,.18)]"
                  : "border-border bg-white hover:border-brand-300 hover:bg-brand-50/40",
              )}
            >
              <span className="text-[14px] font-medium text-ink">
                {opt.label}
              </span>
              <span
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                  selected
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-border",
                )}
              >
                {selected ? <Check className="h-3 w-3" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepAgendamento({
  draft,
  patch,
}: {
  draft: OnboardingDraft;
  patch: (p: Partial<OnboardingDraft>) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + draft.weekOffsetDays);
    return d;
  }, [draft.weekOffsetDays, today]);

  const selected = draft.selectedSlotISO ? new Date(draft.selectedSlotISO) : null;

  return (
    <div className="flex flex-col gap-5">
      <Heading
        title="Agende sua coleta"
        subtitle="Escolha local e horário. Você pode reagendar até 24h antes."
      />

      <Field label="Local da coleta" full>
        <LocationPicker
          value={draft.location}
          onChange={(loc) =>
            patch({ location: loc, selectedSlotISO: null })
          }
        />
      </Field>

      {draft.location === "home" ? (
        <Field label="Endereço para coleta domiciliar" full>
          <TextArea
            value={draft.address}
            onChange={(v) => patch({ address: v })}
            placeholder="Rua, número, complemento, bairro, cidade"
          />
        </Field>
      ) : null}

      <Field label="Horário disponível" full>
        <CalendarPicker
          weekStart={weekStart}
          location={draft.location}
          selected={selected}
          onSelect={(slot) =>
            patch({ selectedSlotISO: slot.toISOString() })
          }
          onShiftWeek={(d) =>
            patch({
              weekOffsetDays: Math.max(0, draft.weekOffsetDays + d),
            })
          }
        />
      </Field>

      {selected ? (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-[13px] text-brand-900">
          Selecionado:{" "}
          <strong>
            {selected.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              weekday: "long",
            })}{" "}
            às {selected.getHours()}h
          </strong>
          {draft.location === "home" ? (
            <> · em domicílio (+{formatBRL(120)})</>
          ) : (
            <> · laboratório parceiro</>
          )}
        </div>
      ) : null}
    </div>
  );
}

function StepConfirmacao({ draft }: { draft: OnboardingDraft }) {
  const slot = draft.selectedSlotISO ? new Date(draft.selectedSlotISO) : null;
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-brand-700">
        <PartyPopper className="h-6 w-6" />
      </span>
      <h2 className="text-[22px] font-semibold leading-tight">
        Tudo pronto, {draft.fullName.split(" ")[0] || "bem-vindo"}!
      </h2>
      <p className="max-w-md text-[13.5px] text-muted">
        Te encaminhamos os próximos passos por email — instruções de jejum,
        endereço (se em laboratório) e o link da plataforma. Sua coleta está
        agendada
        {slot ? (
          <>
            {" "}
            para{" "}
            <strong>
              {slot.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
              })}{" "}
              às {slot.getHours()}h
            </strong>
            .
          </>
        ) : (
          "."
        )}
      </p>
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-[12px] text-muted">
        <Sparkles className="h-3.5 w-3.5 text-brand-600" />
        Seu Concierge IA já está sendo personalizado com seus dados.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Helpers/UI
// ─────────────────────────────────────────────────────────────────────

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-[20px] font-semibold leading-tight">{title}</h2>
      <p className="text-[13px] text-muted">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  full,
  hint,
  children,
}: {
  label: string;
  full?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex flex-col gap-1.5 text-[12px]",
        full ? "sm:col-span-2" : "",
      )}
    >
      <span className="font-medium text-ink">{label}</span>
      {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10 rounded-full border border-border bg-brand-50/30 px-4 text-[14px] text-ink outline-none transition-colors focus:border-brand-400 focus:bg-white"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      rows={3}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="resize-y rounded-2xl border border-border bg-brand-50/30 px-4 py-3 text-[14px] text-ink outline-none transition-colors focus:border-brand-400 focus:bg-white"
    />
  );
}

function PillMulti({
  options,
  values,
  onChange,
}: {
  options: readonly { id: string; label: string }[];
  values: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(id: string) {
    if (values.includes(id)) {
      onChange(values.filter((v) => v !== id));
    } else {
      onChange([...values, id]);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = values.includes(opt.id);
        return (
          <button
            type="button"
            key={opt.id}
            onClick={() => toggle(opt.id)}
            aria-pressed={selected}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
              selected
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-border bg-white text-ink hover:border-brand-400 hover:bg-brand-50",
            )}
          >
            {selected ? <Check className="h-3 w-3" /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function RadioGrid({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            type="button"
            key={opt.id}
            role="radio"
            aria-checked={selected}
            data-name={name}
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded-2xl border px-3 py-3 text-[12.5px] font-medium transition-colors",
              selected
                ? "border-brand-700 bg-brand-50 text-brand-900"
                : "border-border bg-white text-ink hover:border-brand-300 hover:bg-brand-50/40",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function RadioColumn({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <label
            key={opt.id}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-[12.5px] transition-colors",
              selected
                ? "border-brand-700 bg-brand-50 text-brand-900"
                : "border-border bg-white text-ink hover:border-brand-300",
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.id}
              checked={selected}
              onChange={() => onChange(opt.id)}
              className="accent-brand-600"
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function isStepValid(d: OnboardingDraft): boolean {
  switch (d.step) {
    case 0:
      return Boolean(
        d.fullName.trim() &&
          d.age &&
          d.heightCm &&
          d.weightKg &&
          d.goals.length > 0,
      );
    case 1:
      return d.conditions.length > 0;
    case 2:
      return Boolean(d.activity && d.diet);
    case 3:
      return Boolean(d.primaryGoal);
    case 4:
      return Boolean(
        d.selectedSlotISO &&
          (d.location !== "home" || d.address.trim().length > 5),
      );
    default:
      return true;
  }
}
