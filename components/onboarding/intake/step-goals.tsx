"use client";

import type { IntakeData } from "@/lib/intake/schema";
import { IntakeQuestion } from "./intake-question";
import { ConditionalSection } from "./conditional-section";
import { MultiChipSelect } from "./multi-chip-select";
import { RadioGrid, TextArea, TextInput } from "./inputs";
import {
  ACQUISITION_OPTIONS,
  IMPORTANT_VALUE_OPTIONS,
  PRIMARY_GOAL_OPTIONS,
} from "./options";
import { Heading } from "./heading";

interface Props {
  data: IntakeData;
  onPatch: (next: Partial<IntakeData>) => void;
}

export function StepGoals({ data, onPatch }: Props) {
  const g = data.goals;
  return (
    <div className="flex flex-col gap-5">
      <Heading
        title="Objetivos & contexto"
        subtitle="Última seção. Define a calibração do seu protocolo."
      />

      <IntakeQuestion label="Qual seu objetivo primário com a Longevify?" full>
        <RadioGrid
          options={PRIMARY_GOAL_OPTIONS}
          value={g.primaryGoal}
          onChange={(primaryGoal) =>
            onPatch({ goals: { ...g, primaryGoal } })
          }
          cols={3}
        />
      </IntakeQuestion>

      <ConditionalSection show={g.primaryGoal === "outro"}>
        <IntakeQuestion label="Conta um pouco mais" full>
          <TextInput
            value={g.primaryGoalOther ?? ""}
            onChange={(primaryGoalOther) =>
              onPatch({ goals: { ...g, primaryGoalOther } })
            }
            placeholder="Ex: preparar pra ultramaratona"
          />
        </IntakeQuestion>
      </ConditionalSection>

      <IntakeQuestion
        label="O que mais te importa?"
        hint="Selecione todos os valores que ressoam — vamos pesar isso na priorização."
        full
      >
        <MultiChipSelect
          options={IMPORTANT_VALUE_OPTIONS}
          values={g.importantValues}
          onChange={(importantValues) =>
            onPatch({ goals: { ...g, importantValues } })
          }
        />
      </IntakeQuestion>

      <IntakeQuestion label="Como conheceu a Longevify?" full>
        <RadioGrid
          options={ACQUISITION_OPTIONS}
          value={g.acquisition}
          onChange={(acquisition) =>
            onPatch({ goals: { ...g, acquisition } })
          }
          cols={3}
        />
      </IntakeQuestion>

      <ConditionalSection show={g.acquisition === "outro"}>
        <IntakeQuestion label="Conta como" full>
          <TextInput
            value={g.acquisitionOther ?? ""}
            onChange={(acquisitionOther) =>
              onPatch({ goals: { ...g, acquisitionOther } })
            }
            placeholder="Ex: feira de saúde corporativa"
          />
        </IntakeQuestion>
      </ConditionalSection>

      <IntakeQuestion
        label="Algo importante que não foi perguntado?"
        optional
        full
      >
        <TextArea
          value={g.freeNote ?? ""}
          onChange={(freeNote) => onPatch({ goals: { ...g, freeNote } })}
          placeholder="Sintomas específicos, contextos, histórico que ache relevante..."
          rows={3}
        />
      </IntakeQuestion>
    </div>
  );
}
