"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  HeartHandshake,
  Lock,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  OnboardingStepper,
  type OnboardingStep,
} from "@/components/onboarding/stepper";
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
import { syncIntake } from "./actions";

// ─── State machine ─────────────────────────────────────────────────────────
//
// Lucas (2026-05-21): "só tenha 1 opção de anamenese". Removida a
// variante "quick" — todos passam pelo flow único (comprehensive
// renomeado pra só "anamnese"). PathChooser não é mais chamada.
//
// Reordenação inspirada em recomendação do agent medico-longevify:
// fácil → engajamento → sensível no meio → fácil no fim.
//   1. Identity (quick win)
//   2. Goals (engajamento — dá propósito)
//   3. Medical history
//   4. Family history
//   5. Lifestyle
//   6. Mental health (com banner CVV 188 antes)
//   7. Sex-specific
//   8. Schedule + Done

type StepId =
  | "comp-1"
  | "comp-2"
  | "comp-3"
  | "comp-4"
  | "comp-5"
  | "comp-6"
  | "comp-7"
  | "schedule"
  | "done";

const COMPREHENSIVE_FLOW: StepId[] = [
  "comp-1",
  "comp-7", // Goals reordenado pra logo após Identity
  "comp-2",
  "comp-3",
  "comp-4",
  "comp-5",
  "comp-6",
  "schedule",
  "done",
];

const STEP_LABEL: Record<StepId, string> = {
  "comp-1": "Identidade",
  "comp-2": "Histórico clínico",
  "comp-3": "Histórico familiar",
  "comp-4": "Estilo de vida",
  "comp-5": "Saúde mental",
  "comp-6": "Específico",
  "comp-7": "Objetivos",
  schedule: "Agendamento",
  done: "Pronto",
};

// Quantas perguntas cada step tem (pra "Pergunta X de Y" honesto).
const STEP_QUESTION_COUNT: Record<StepId, number> = {
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
    // Lucas (2026-05-21): unifica. Se record tem variant "quick"
    // (legado), reseta pra comprehensive na hidratação — não tem mais
    // path chooser pro user trocar.
    if (loaded) {
      const needsMigration = (loaded as IntakeRecord & { variant?: string })
        .variant === "quick";
      if (needsMigration) {
        setRecord({
          ...loaded,
          variant: "comprehensive",
          step:
            (loaded.step as string).startsWith("quick-")
              ? "comp-1"
              : loaded.step,
        });
      } else {
        setRecord(loaded);
      }
    } else {
      // Sem record salvo → cria comprehensive direto, sem path chooser
      setRecord(createEmptyRecord("comprehensive"));
    }
    setHydrated(true);
  }, []);

  // Auto-save a cada mudança (após hidratar pra não sobrescrever).
  useEffect(() => {
    if (!hydrated || !record) return;
    saveIntake(record);
  }, [record, hydrated]);

  // Sync periódico pro Supabase. Debounced 1.5s pra não martelar a cada
  // tecla. Best-effort — se falhar, o localStorage ainda preserva tudo.
  useEffect(() => {
    if (!hydrated || !record) return;
    const t = window.setTimeout(() => {
      void syncIntake(record);
    }, 1500);
    return () => window.clearTimeout(t);
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
      let finalRecord: IntakeRecord | null = null;
      setRecord((r) => {
        if (!r) return r;
        finalRecord = {
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
        };
        return finalRecord;
      });
      // Sync imediato pro Supabase quando o intake está completo —
      // garante que profiles.intake_completed_at fica setado (libera o
      // user do redirect-to-onboarding no layout).
      if (finalRecord) {
        void syncIntake(finalRecord);
      }
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

  if (!hydrated || !record) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-[920px] items-center justify-center px-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  const stepId = record.step as StepId;
  const flow = COMPREHENSIVE_FLOW;
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

  // Lucas (2026-05-21): mostra banner CFM/LGPD no primeiro step
  // (após user clicar Continuar do step 1, esconde — já validado o
  // consentimento implícito). Banner CVV aparece ANTES do step
  // saúde mental (recomendação do medico-longevify agent).
  const showConsentBanner = stepId === "comp-1";
  const showMentalHealthBanner = stepId === "comp-5";

  return (
    <div className="mx-auto w-full max-w-[920px] px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-2 pb-4 sm:pb-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium uppercase tracking-wide text-brand-700">
            Anamnese
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
      </header>

      {/* Banner LGPD + CFM 2.314/2022 — só no primeiro step.
          Recomendado pelo medico-longevify agent (2026-05-21) por
          base legal de dados sensíveis (Art. 11 §1º) + clareza que
          isso não é ato médico. */}
      {showConsentBanner && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-[12.5px] leading-relaxed text-brand-900">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
          <div>
            <strong className="font-semibold">Seus dados são protegidos.</strong>{" "}
            Esta avaliação é educacional e não constitui ato médico
            (CFM 2.314/2022). Tratamento de dados de saúde sob LGPD
            Art. 11. Você pode pausar, editar ou excluir suas respostas
            a qualquer momento.
          </div>
        </div>
      )}

      {/* Banner CVV 188 antes do step Saúde Mental — recomendado pelo
          medico-longevify agent. Próximas perguntas tratam de humor,
          ansiedade e podem desconfortar. Acesso a apoio imediato. */}
      {showMentalHealthBanner && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] leading-relaxed text-amber-900">
          <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <strong className="font-semibold">As próximas perguntas tratam de saúde mental.</strong>{" "}
            Se sentir desconforto, pode pausar. Em momentos de crise:{" "}
            <a
              href="tel:188"
              className="font-semibold underline underline-offset-2 hover:text-amber-700"
            >
              CVV 188
            </a>{" "}
            (24h, gratuito) ou SAMU 192.
          </div>
        </div>
      )}

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
          onEdit={() => setStep("comp-1")}
        />

        {!isLast ? (
          <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                // Voltar do primeiro step não tem destino — só desabilita
                if (!isFirst) setStep(flow[stepIndex - 1]);
              }}
              disabled={isFirst || submitting}
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
