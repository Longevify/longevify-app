"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Repeat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  OnboardingStepper,
  type OnboardingStep,
} from "@/components/onboarding/stepper";
import { PathChooser } from "@/components/onboarding/path-chooser";
import {
  StepQuickHabits,
  StepQuickIdentity,
} from "@/components/onboarding/intake/step-quick";
import { StepIdentity } from "@/components/onboarding/intake/step-identity";
import { StepMedical } from "@/components/onboarding/intake/step-medical";
import { StepFamily } from "@/components/onboarding/intake/step-family";
import { StepLifestyle } from "@/components/onboarding/intake/step-lifestyle";
import { StepMental } from "@/components/onboarding/intake/step-mental";
import { StepSexSpecific } from "@/components/onboarding/intake/step-sex-specific";
import { StepGoals } from "@/components/onboarding/intake/step-goals";
import { StepScheduling } from "@/components/onboarding/intake/step-scheduling";
import { StepSummary } from "@/components/onboarding/intake/step-summary";
import {
  createEmptyRecord,
  loadIntake,
  saveIntake,
} from "@/lib/intake/storage";
import {
  type IntakeData,
  type IntakeRecord,
  type IntakeVariant,
} from "@/lib/intake/schema";
import { bookSlot } from "@/lib/scheduling/slots";
import { toast } from "@/lib/toast";

// ─── State machine ─────────────────────────────────────────────────────────
// Steps por variante. "choose" é o splash; "schedule" e "done" são compartilhados.

type StepId =
  | "choose"
  | "quick-1"
  | "quick-2"
  | "comp-1"
  | "comp-2"
  | "comp-3"
  | "comp-4"
  | "comp-5"
  | "comp-6"
  | "comp-7"
  | "schedule"
  | "done";

const QUICK_FLOW: StepId[] = ["quick-1", "quick-2", "schedule", "done"];

const COMPREHENSIVE_FLOW: StepId[] = [
  "comp-1",
  "comp-2",
  "comp-3",
  "comp-4",
  "comp-5",
  "comp-6",
  "comp-7",
  "schedule",
  "done",
];

const STEP_LABEL: Record<StepId, string> = {
  choose: "Início",
  "quick-1": "Você",
  "quick-2": "Hábitos",
  "comp-1": "Identidade",
  "comp-2": "Histórico clínico",
  "comp-3": "Histórico familiar",
  "comp-4": "Estilo de vida",
  "comp-5": "Mental",
  "comp-6": "Específico",
  "comp-7": "Objetivos",
  schedule: "Agendamento",
  done: "Pronto",
};

// Quantas perguntas cada step tem (pra "Pergunta X de Y" honesto).
const STEP_QUESTION_COUNT: Record<StepId, number> = {
  choose: 0,
  "quick-1": 4,
  "quick-2": 4,
  "comp-1": 7,
  "comp-2": 7,
  "comp-3": 1,
  "comp-4": 11,
  "comp-5": 6,
  "comp-6": 5,
  "comp-7": 4,
  schedule: 0,
  done: 0,
};

export default function OnboardingPage() {
  const [record, setRecord] = useState<IntakeRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loaded = loadIntake();
    setRecord(loaded);
    setHydrated(true);
  }, []);

  // Auto-save a cada mudança (após hidratar pra não sobrescrever).
  useEffect(() => {
    if (!hydrated || !record) return;
    saveIntake(record);
  }, [record, hydrated]);

  function patchData(next: Partial<IntakeData>) {
    setRecord((r) => (r ? { ...r, data: { ...r.data, ...next } } : r));
  }

  function setStep(step: StepId) {
    setRecord((r) => (r ? { ...r, step } : r));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function chooseVariant(variant: IntakeVariant) {
    setRecord((r) => {
      if (!r) return createEmptyRecord(variant);
      // preserva data acumulada — só troca variant + step inicial
      return {
        ...r,
        variant,
        step: variant === "quick" ? "quick-1" : "comp-1",
      };
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function switchVariant() {
    if (!record) return;
    const next: IntakeVariant =
      record.variant === "quick" ? "comprehensive" : "quick";
    setRecord((r) =>
      r
        ? {
            ...r,
            variant: next,
            step: next === "quick" ? "quick-1" : "comp-1",
          }
        : r,
    );
  }

  async function submitScheduling() {
    if (!record) return;
    const { scheduling } = record.data;
    if (!scheduling.selectedSlotISO || !scheduling.location) return;
    setSubmitting(true);
    try {
      const result = await bookSlot(
        new Date(scheduling.selectedSlotISO),
        scheduling.location,
        scheduling.location === "home" ? scheduling.address : undefined,
      );
      const completedAt = new Date().toISOString();
      setRecord((r) =>
        r
          ? {
              ...r,
              data: {
                ...r.data,
                scheduling: {
                  ...r.data.scheduling,
                  bookingId: result.id,
                  bookingConfirmedAt: result.confirmedAt,
                },
              },
              step: "done",
              completedAt,
            }
          : r,
      );
      toast.success({
        title: "Coleta agendada",
        description: "Te enviamos a confirmação por email.",
      });
    } catch (err) {
      toast.error({
        title: "Não conseguimos confirmar",
        description: err instanceof Error ? err.message : "Tente de novo.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-[920px] items-center justify-center px-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  // Sem record carregado → splash.
  if (!record) {
    return (
      <div className="mx-auto w-full max-w-[1080px] px-6 py-10 sm:py-12">
        <PathChooser onSelect={chooseVariant} />
      </div>
    );
  }

  const stepId = record.step as StepId;

  if (stepId === "choose") {
    return (
      <div className="mx-auto w-full max-w-[1080px] px-6 py-10 sm:py-12">
        <PathChooser selected={record.variant} onSelect={chooseVariant} />
      </div>
    );
  }

  const flow = record.variant === "quick" ? QUICK_FLOW : COMPREHENSIVE_FLOW;
  const stepIndex = Math.max(0, flow.indexOf(stepId));
  const isFirst = stepIndex === 0;
  const isLast = stepId === "done";

  // Pergunta atual / total — só conta steps com perguntas.
  const totalQuestions = flow.reduce(
    (acc, s) => acc + STEP_QUESTION_COUNT[s],
    0,
  );
  const questionsBefore = flow
    .slice(0, stepIndex)
    .reduce((acc, s) => acc + STEP_QUESTION_COUNT[s], 0);
  const showProgress = STEP_QUESTION_COUNT[stepId] > 0;

  const stepperSteps: OnboardingStep[] = flow.map((id) => ({
    id,
    label: STEP_LABEL[id],
  }));

  const valid = isStepValid(stepId, record);

  return (
    <div className="mx-auto w-full max-w-[920px] px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-end sm:justify-between sm:pb-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium uppercase tracking-wide text-brand-700">
            {record.variant === "quick"
              ? "Cadastro Rápido"
              : "Cadastro Completo"}
          </span>
          {showProgress ? (
            <p className="text-[13px] text-muted">
              Pergunta{" "}
              <span className="font-semibold text-ink">
                {questionsBefore + 1}–
                {questionsBefore + STEP_QUESTION_COUNT[stepId]}
              </span>{" "}
              de {totalQuestions}
            </p>
          ) : (
            <p className="text-[13px] text-muted">
              {stepId === "schedule"
                ? "Agendamento da coleta"
                : "Confirmação"}
            </p>
          )}
        </div>
        {!isLast ? (
          <button
            type="button"
            onClick={switchVariant}
            className="inline-flex items-center gap-1.5 self-start rounded-full border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:border-brand-400 hover:text-ink sm:self-end"
          >
            <Repeat className="h-3.5 w-3.5" />
            Trocar pra{" "}
            {record.variant === "quick" ? "Cadastro Completo" : "Cadastro Rápido"}
          </button>
        ) : null}
      </header>

      {!isLast ? (
        <div className="sticky top-3 z-10 mb-5 rounded-2xl border border-border bg-white/95 p-3 shadow-[0_4px_18px_-12px_rgba(13,40,24,.18)] backdrop-blur sm:mb-6">
          <OnboardingStepper
            steps={stepperSteps}
            current={stepIndex}
            onJump={(i) => i <= stepIndex && setStep(flow[i])}
          />
        </div>
      ) : null}

      <Card className="flex flex-col gap-6 p-5 sm:p-7">
        <StepBody
          stepId={stepId}
          record={record}
          onPatch={patchData}
          onEdit={() =>
            setStep(record.variant === "quick" ? "quick-1" : "comp-1")
          }
        />

        {!isLast ? (
          <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                if (isFirst) {
                  setStep("choose");
                } else {
                  setStep(flow[stepIndex - 1]);
                }
              }}
              disabled={submitting}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>

            {stepId === "schedule" ? (
              <Button
                variant="dark"
                size="md"
                onClick={submitScheduling}
                disabled={!valid || submitting}
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
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => setStep(flow[stepIndex + 1])}
                disabled={!valid}
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

// ─── Step body dispatcher ──────────────────────────────────────────────────

function StepBody({
  stepId,
  record,
  onPatch,
  onEdit,
}: {
  stepId: StepId;
  record: IntakeRecord;
  onPatch: (next: Partial<IntakeData>) => void;
  onEdit: () => void;
}) {
  const data = record.data;
  switch (stepId) {
    case "quick-1":
      return <StepQuickIdentity data={data} onPatch={onPatch} />;
    case "quick-2":
      return <StepQuickHabits data={data} onPatch={onPatch} />;
    case "comp-1":
      return <StepIdentity data={data} onPatch={onPatch} />;
    case "comp-2":
      return <StepMedical data={data} onPatch={onPatch} />;
    case "comp-3":
      return <StepFamily data={data} onPatch={onPatch} />;
    case "comp-4":
      return <StepLifestyle data={data} onPatch={onPatch} />;
    case "comp-5":
      return <StepMental data={data} onPatch={onPatch} />;
    case "comp-6":
      return <StepSexSpecific data={data} onPatch={onPatch} />;
    case "comp-7":
      return <StepGoals data={data} onPatch={onPatch} />;
    case "schedule":
      return <StepScheduling data={data} onPatch={onPatch} />;
    case "done":
      return <StepSummary record={record} onEdit={onEdit} />;
    default:
      return null;
  }
}

// ─── Validation ────────────────────────────────────────────────────────────

function isStepValid(stepId: StepId, record: IntakeRecord): boolean {
  const d = record.data;
  switch (stepId) {
    case "quick-1":
      return Boolean(
        d.identity.birthDate &&
          d.identity.biologicalSex &&
          d.identity.heightCm &&
          d.identity.weightKg,
      );
    case "quick-2":
      return Boolean(
        d.lifestyle.smokingStatus &&
          d.lifestyle.alcoholFrequency &&
          d.lifestyle.exerciseDaysPerWeek != null &&
          d.medical.hasChronicCondition !== undefined,
      );
    case "comp-1":
      return Boolean(
        d.identity.birthDate &&
          d.identity.biologicalSex &&
          d.identity.heightCm &&
          d.identity.weightKg,
      );
    case "comp-2":
      return d.medical.diagnosedConditions.length > 0;
    case "comp-3":
      return d.family.earlyEvents.length > 0;
    case "comp-4":
      return Boolean(
        d.lifestyle.exerciseDaysPerWeek != null &&
          d.lifestyle.sleepHours != null &&
          d.lifestyle.sleepQuality != null &&
          d.lifestyle.perceivedStress != null &&
          d.lifestyle.smokingStatus &&
          d.lifestyle.alcoholFrequency &&
          d.lifestyle.diet &&
          d.lifestyle.refinedSugar,
      );
    case "comp-5":
      return Boolean(
        d.mental.moodScore != null &&
          d.mental.fatigueFrequency &&
          d.mental.diagnosedDepressionAnxiety !== undefined &&
          d.mental.inTherapy !== undefined &&
          d.mental.focusScore != null,
      );
    case "comp-6":
      if (d.identity.biologicalSex === "female") {
        return Boolean(
          d.female.regularCycle !== undefined &&
            d.female.contraceptive &&
            d.female.menopause,
        );
      }
      if (d.identity.biologicalSex === "male") {
        return Boolean(
          d.male.urologicComplaint !== undefined &&
            d.male.prostateExamRegular !== undefined &&
            d.male.testosteroneTested !== undefined,
        );
      }
      return false;
    case "comp-7":
      return Boolean(d.goals.primaryGoal && d.goals.acquisition);
    case "schedule":
      return Boolean(
        d.scheduling.selectedSlotISO &&
          d.scheduling.location &&
          (d.scheduling.location !== "home" ||
            (d.scheduling.address ?? "").trim().length > 5),
      );
    default:
      return true;
  }
}
