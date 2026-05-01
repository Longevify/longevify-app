"use client";

import { calcAgeFromBirthDate } from "@/lib/intake/schema";
import type { IntakeData } from "@/lib/intake/schema";
import { IntakeQuestion } from "./intake-question";
import { ConditionalSection } from "./conditional-section";
import { DateInput } from "./date-input";
import {
  RadioGrid,
  TextArea,
  TextInput,
  YesNo,
} from "./inputs";
import {
  ACTIVITY_OPTIONS,
  ALCOHOL_OPTIONS,
  SEX_OPTIONS,
  SMOKING_OPTIONS,
} from "./options";
import { BMIDisplay } from "./bmi-display";

interface StepProps {
  data: IntakeData;
  onPatch: (next: Partial<IntakeData>) => void;
}

const TODAY_ISO = new Date().toISOString().slice(0, 10);
const MIN_BIRTH_ISO = "1900-01-01";

export function StepQuickIdentity({ data, onPatch }: StepProps) {
  const age = calcAgeFromBirthDate(data.identity.birthDate);
  return (
    <div className="flex flex-col gap-5">
      <Heading
        title="Quem é você?"
        subtitle="Quatro dados essenciais pra calibrar tudo."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <IntakeQuestion
          label="Como você prefere ser chamado(a)?"
          hint="O Concierge IA e o app vão usar esse nome."
          full
        >
          <TextInput
            value={data.identity.preferredName ?? ""}
            onChange={(preferredName) =>
              onPatch({ identity: { ...data.identity, preferredName } })
            }
            placeholder="Lu, Lucas, Dr. Valle…"
          />
        </IntakeQuestion>

        <IntakeQuestion label="Data de nascimento" full>
          <DateInput
            value={data.identity.birthDate}
            onChange={(birthDate) =>
              onPatch({ identity: { ...data.identity, birthDate } })
            }
            max={TODAY_ISO}
            min={MIN_BIRTH_ISO}
          />
          {age != null ? (
            <span className="mt-1 text-[12px] text-muted">
              Você tem <strong>{age}</strong> anos.
            </span>
          ) : null}
        </IntakeQuestion>

        <IntakeQuestion label="Sexo biológico" full>
          <RadioGrid
            options={SEX_OPTIONS}
            value={data.identity.biologicalSex}
            onChange={(biologicalSex) =>
              onPatch({ identity: { ...data.identity, biologicalSex } })
            }
          />
        </IntakeQuestion>

        <IntakeQuestion label="Altura (cm)">
          <TextInput
            type="number"
            inputMode="numeric"
            value={data.identity.heightCm?.toString() ?? ""}
            onChange={(v) =>
              onPatch({
                identity: {
                  ...data.identity,
                  heightCm: v ? Number(v) : undefined,
                },
              })
            }
            placeholder="178"
            min={80}
            max={230}
          />
        </IntakeQuestion>

        <IntakeQuestion label="Peso (kg)">
          <TextInput
            type="number"
            inputMode="decimal"
            value={data.identity.weightKg?.toString() ?? ""}
            onChange={(v) =>
              onPatch({
                identity: {
                  ...data.identity,
                  weightKg: v ? Number(v) : undefined,
                },
              })
            }
            placeholder="76"
            min={25}
            max={350}
            step={0.1}
          />
        </IntakeQuestion>
      </div>

      <BMIDisplay
        heightCm={data.identity.heightCm}
        weightKg={data.identity.weightKg}
      />
    </div>
  );
}

export function StepQuickHabits({ data, onPatch }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <Heading
        title="Hábitos & saúde"
        subtitle="Quatro perguntas rápidas que mudam o protocolo inicial."
      />

      <IntakeQuestion label="Você fuma?" full>
        <RadioGrid
          options={SMOKING_OPTIONS}
          value={data.lifestyle.smokingStatus}
          onChange={(smokingStatus) =>
            onPatch({ lifestyle: { ...data.lifestyle, smokingStatus } })
          }
          cols={3}
        />
      </IntakeQuestion>

      <IntakeQuestion label="Frequência de álcool" full>
        <RadioGrid
          options={ALCOHOL_OPTIONS}
          value={data.lifestyle.alcoholFrequency}
          onChange={(alcoholFrequency) =>
            onPatch({
              lifestyle: { ...data.lifestyle, alcoholFrequency },
            })
          }
          cols={4}
        />
      </IntakeQuestion>

      <IntakeQuestion label="Atividade física" full>
        <RadioGrid
          options={ACTIVITY_OPTIONS}
          value={
            data.lifestyle.exerciseDaysPerWeek == null
              ? undefined
              : mapActivityFromDays(data.lifestyle.exerciseDaysPerWeek)
          }
          onChange={(level) =>
            onPatch({
              lifestyle: {
                ...data.lifestyle,
                exerciseDaysPerWeek: mapActivityToDays(level),
              },
            })
          }
        />
      </IntakeQuestion>

      <IntakeQuestion label="Tem alguma doença crônica diagnosticada?" full>
        <YesNo
          value={data.medical.hasChronicCondition}
          onChange={(hasChronicCondition) =>
            onPatch({
              medical: {
                ...data.medical,
                hasChronicCondition,
                chronicConditionDetail: hasChronicCondition
                  ? data.medical.chronicConditionDetail
                  : "",
              },
            })
          }
        />
      </IntakeQuestion>

      <ConditionalSection show={data.medical.hasChronicCondition === true}>
        <IntakeQuestion label="Quais? (uma por linha)" full>
          <TextArea
            value={data.medical.chronicConditionDetail ?? ""}
            onChange={(chronicConditionDetail) =>
              onPatch({
                medical: { ...data.medical, chronicConditionDetail },
              })
            }
            placeholder="Ex: Hipertensão controlada com losartana 50mg"
          />
        </IntakeQuestion>
      </ConditionalSection>
    </div>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-[20px] font-semibold leading-tight text-ink sm:text-[22px]">
        {title}
      </h2>
      <p className="text-[13px] text-muted">{subtitle}</p>
    </div>
  );
}

// Mapeia entre ActivityLevel (radio) e dias/semana — Quick mapeia pra
// poder reaproveitar quando o user troca pra Comprehensive.
function mapActivityToDays(
  level: "sedentary" | "light" | "moderate" | "intense",
): number {
  switch (level) {
    case "sedentary":
      return 0;
    case "light":
      return 2;
    case "moderate":
      return 4;
    case "intense":
      return 6;
  }
}

function mapActivityFromDays(
  days: number,
): "sedentary" | "light" | "moderate" | "intense" {
  if (days <= 0) return "sedentary";
  if (days <= 2) return "light";
  if (days <= 4) return "moderate";
  return "intense";
}
