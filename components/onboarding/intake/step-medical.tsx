"use client";

import type { IntakeData } from "@/lib/intake/schema";
import { IntakeQuestion } from "./intake-question";
import { ConditionalSection } from "./conditional-section";
import { MultiChipSelect } from "./multi-chip-select";
import { TextArea, YesNo } from "./inputs";
import { CONDITION_OPTIONS } from "./options";
import { Heading } from "./heading";

interface Props {
  data: IntakeData;
  onPatch: (next: Partial<IntakeData>) => void;
}

export function StepMedical({ data, onPatch }: Props) {
  const m = data.medical;
  return (
    <div className="flex flex-col gap-5">
      <Heading
        title="Histórico clínico"
        subtitle="O que importa: confidencial e usado só pra te ajudar."
      />

      <IntakeQuestion
        label="Condições diagnosticadas"
        hint="Marque todas que se aplicam — ou apenas “nenhuma”."
        full
      >
        <MultiChipSelect
          options={CONDITION_OPTIONS}
          values={m.diagnosedConditions}
          onChange={(diagnosedConditions) =>
            onPatch({ medical: { ...m, diagnosedConditions } })
          }
          exclusive={["nenhuma"]}
        />
      </IntakeQuestion>

      <IntakeQuestion label="Cirurgias prévias" optional full>
        <TextArea
          value={m.surgeries ?? ""}
          onChange={(surgeries) => onPatch({ medical: { ...m, surgeries } })}
          placeholder="Ex: apendicectomia 2018, ligamento cruzado 2021"
          rows={2}
        />
      </IntakeQuestion>

      <IntakeQuestion label="Foi internado nos últimos 5 anos?" full>
        <YesNo
          value={m.hospitalized5y}
          onChange={(hospitalized5y) =>
            onPatch({
              medical: {
                ...m,
                hospitalized5y,
                hospitalizationDetails: hospitalized5y
                  ? m.hospitalizationDetails
                  : "",
              },
            })
          }
        />
      </IntakeQuestion>

      <ConditionalSection show={m.hospitalized5y === true}>
        <IntakeQuestion label="O que aconteceu?" full>
          <TextArea
            value={m.hospitalizationDetails ?? ""}
            onChange={(hospitalizationDetails) =>
              onPatch({ medical: { ...m, hospitalizationDetails } })
            }
            placeholder="Ex: pneumonia 2023, 3 dias internado"
            rows={2}
          />
        </IntakeQuestion>
      </ConditionalSection>

      <IntakeQuestion
        label="Medicações de uso contínuo"
        hint="Inclua dose e posologia se souber."
        optional
        full
      >
        <TextArea
          value={m.medications ?? ""}
          onChange={(medications) =>
            onPatch({ medical: { ...m, medications } })
          }
          placeholder="Ex: losartana 50mg/dia, atorvastatina 20mg"
          rows={2}
        />
      </IntakeQuestion>

      <IntakeQuestion label="Suplementação atual" optional full>
        <TextArea
          value={m.supplements ?? ""}
          onChange={(supplements) =>
            onPatch({ medical: { ...m, supplements } })
          }
          placeholder="Ex: D3 2000UI, ômega 3 2g, magnésio glicinato 400mg"
          rows={2}
        />
      </IntakeQuestion>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <IntakeQuestion label="Alergias medicamentosas" optional full>
          <TextArea
            value={m.drugAllergies ?? ""}
            onChange={(drugAllergies) =>
              onPatch({ medical: { ...m, drugAllergies } })
            }
            placeholder="Ex: dipirona, penicilina"
            rows={2}
          />
        </IntakeQuestion>

        <IntakeQuestion label="Alergias alimentares" optional full>
          <TextArea
            value={m.foodAllergies ?? ""}
            onChange={(foodAllergies) =>
              onPatch({ medical: { ...m, foodAllergies } })
            }
            placeholder="Ex: lactose, glúten, frutos do mar"
            rows={2}
          />
        </IntakeQuestion>
      </div>
    </div>
  );
}
