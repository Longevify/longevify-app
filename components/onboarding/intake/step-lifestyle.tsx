"use client";

import type { IntakeData } from "@/lib/intake/schema";
import { IntakeQuestion } from "./intake-question";
import { ConditionalSection } from "./conditional-section";
import { LikertSlider } from "./likert-slider";
import { MultiChipSelect } from "./multi-chip-select";
import { RadioGrid, TextInput } from "./inputs";
import {
  ALCOHOL_OPTIONS,
  DIET_OPTIONS,
  EXERCISE_TYPE_OPTIONS,
  SMOKING_OPTIONS,
  SUGAR_OPTIONS,
} from "./options";
import { Heading } from "./heading";

interface Props {
  data: IntakeData;
  onPatch: (next: Partial<IntakeData>) => void;
}

export function StepLifestyle({ data, onPatch }: Props) {
  const l = data.lifestyle;
  return (
    <div className="flex flex-col gap-6">
      <Heading
        title="Estilo de vida"
        subtitle="Sono, movimento, dieta e estresse — os pilares que mais movem biomarcadores."
      />

      <IntakeQuestion
        label="Treina quantos dias por semana?"
        hint="Conta qualquer atividade estruturada de pelo menos 30min."
        full
      >
        <LikertSlider
          min={0}
          max={7}
          value={l.exerciseDaysPerWeek}
          onChange={(exerciseDaysPerWeek) =>
            onPatch({ lifestyle: { ...l, exerciseDaysPerWeek } })
          }
          unit="dias"
          minLabel="0"
          maxLabel="7"
        />
      </IntakeQuestion>

      <IntakeQuestion label="Tipos de atividade que você faz" optional full>
        <MultiChipSelect
          options={EXERCISE_TYPE_OPTIONS}
          values={l.exerciseTypes}
          onChange={(exerciseTypes) =>
            onPatch({ lifestyle: { ...l, exerciseTypes } })
          }
        />
      </IntakeQuestion>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <IntakeQuestion label="Horas médias de sono por noite" full>
          <LikertSlider
            min={4}
            max={12}
            step={0.5}
            value={l.sleepHours ?? 7}
            onChange={(sleepHours) =>
              onPatch({ lifestyle: { ...l, sleepHours } })
            }
            unit="h"
            minLabel="4h"
            maxLabel="12h"
          />
        </IntakeQuestion>

        <IntakeQuestion label="Qualidade percebida do sono" full>
          <LikertSlider
            min={1}
            max={10}
            value={l.sleepQuality}
            onChange={(sleepQuality) =>
              onPatch({ lifestyle: { ...l, sleepQuality } })
            }
            minLabel="ruim"
            maxLabel="ótimo"
          />
        </IntakeQuestion>
      </div>

      <IntakeQuestion label="Estresse percebido no dia a dia" full>
        <LikertSlider
          min={1}
          max={10}
          value={l.perceivedStress}
          onChange={(perceivedStress) =>
            onPatch({ lifestyle: { ...l, perceivedStress } })
          }
          minLabel="zero"
          maxLabel="máximo"
        />
      </IntakeQuestion>

      <IntakeQuestion label="Tabagismo" full>
        <RadioGrid
          options={SMOKING_OPTIONS}
          value={l.smokingStatus}
          onChange={(smokingStatus) =>
            onPatch({ lifestyle: { ...l, smokingStatus } })
          }
          cols={3}
        />
      </IntakeQuestion>

      <ConditionalSection show={l.smokingStatus === "former"}>
        <IntakeQuestion label="Há quantos anos parou?" full>
          <TextInput
            type="number"
            inputMode="numeric"
            value={l.smokingQuitYearsAgo?.toString() ?? ""}
            onChange={(v) =>
              onPatch({
                lifestyle: {
                  ...l,
                  smokingQuitYearsAgo: v ? Number(v) : undefined,
                },
              })
            }
            placeholder="Ex: 4"
            min={0}
            max={80}
          />
        </IntakeQuestion>
      </ConditionalSection>

      <ConditionalSection show={l.smokingStatus === "current"}>
        <IntakeQuestion label="Quantos cigarros por dia?" full>
          <TextInput
            type="number"
            inputMode="numeric"
            value={l.smokingCigsPerDay?.toString() ?? ""}
            onChange={(v) =>
              onPatch({
                lifestyle: {
                  ...l,
                  smokingCigsPerDay: v ? Number(v) : undefined,
                },
              })
            }
            placeholder="Ex: 10"
            min={0}
            max={80}
          />
        </IntakeQuestion>
      </ConditionalSection>

      <IntakeQuestion label="Frequência de álcool" full>
        <RadioGrid
          options={ALCOHOL_OPTIONS}
          value={l.alcoholFrequency}
          onChange={(alcoholFrequency) =>
            onPatch({ lifestyle: { ...l, alcoholFrequency } })
          }
          cols={4}
        />
      </IntakeQuestion>

      <ConditionalSection
        show={
          l.alcoholFrequency === "weekly" || l.alcoholFrequency === "daily"
        }
      >
        <IntakeQuestion
          label="Doses por semana (1 dose = 1 lata, 1 taça ou 1 dose de destilado)"
          full
        >
          <LikertSlider
            min={0}
            max={30}
            value={l.alcoholDosesPerWeek}
            onChange={(alcoholDosesPerWeek) =>
              onPatch({ lifestyle: { ...l, alcoholDosesPerWeek } })
            }
            unit="doses"
            minLabel="0"
            maxLabel="30"
          />
        </IntakeQuestion>
      </ConditionalSection>

      <IntakeQuestion label="Dieta dominante" full>
        <RadioGrid
          options={DIET_OPTIONS}
          value={l.diet}
          onChange={(diet) => onPatch({ lifestyle: { ...l, diet } })}
          cols={3}
        />
      </IntakeQuestion>

      <IntakeQuestion label="Consumo de açúcar refinado" full>
        <RadioGrid
          options={SUGAR_OPTIONS}
          value={l.refinedSugar}
          onChange={(refinedSugar) =>
            onPatch({ lifestyle: { ...l, refinedSugar } })
          }
          cols={3}
        />
      </IntakeQuestion>

      <IntakeQuestion label="Hidratação: copos de água por dia" full>
        <LikertSlider
          min={0}
          max={15}
          value={l.waterCupsPerDay}
          onChange={(waterCupsPerDay) =>
            onPatch({ lifestyle: { ...l, waterCupsPerDay } })
          }
          unit="copos"
          minLabel="0"
          maxLabel="15+"
        />
      </IntakeQuestion>
    </div>
  );
}
