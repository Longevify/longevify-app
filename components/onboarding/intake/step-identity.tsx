"use client";

import { calcAgeFromBirthDate } from "@/lib/intake/schema";
import type { IntakeData } from "@/lib/intake/schema";
import { IntakeQuestion } from "./intake-question";
import { DateInput } from "./date-input";
import { RadioGrid, TextInput } from "./inputs";
import { ETHNICITY_OPTIONS, SEX_OPTIONS } from "./options";
import { BMIDisplay } from "./bmi-display";
import { Heading } from "./heading";

const TODAY_ISO = new Date().toISOString().slice(0, 10);

interface Props {
  data: import("@/lib/intake/schema").IntakeData;
  onPatch: (next: Partial<IntakeData>) => void;
}

export function StepIdentity({ data, onPatch }: Props) {
  const age = calcAgeFromBirthDate(data.identity.birthDate);
  const id = data.identity;
  return (
    <div className="flex flex-col gap-5">
      <Heading
        title="Identidade & antropometria"
        subtitle="Dados-base usados em quase todo cálculo do app."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <IntakeQuestion
          label="Como você prefere ser chamado(a)?"
          hint="O Concierge IA e o app vão usar esse nome. Pode ser apelido, primeiro nome ou como achar melhor."
          full
        >
          <TextInput
            value={id.preferredName ?? ""}
            onChange={(preferredName) =>
              onPatch({ identity: { ...id, preferredName } })
            }
            placeholder="Lu, Lucas, Dr. Valle…"
          />
        </IntakeQuestion>

        <IntakeQuestion label="Data de nascimento" full>
          <DateInput
            value={id.birthDate}
            onChange={(birthDate) =>
              onPatch({ identity: { ...id, birthDate } })
            }
            max={TODAY_ISO}
            min="1900-01-01"
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
            value={id.biologicalSex}
            onChange={(biologicalSex) =>
              onPatch({ identity: { ...id, biologicalSex } })
            }
          />
        </IntakeQuestion>

        <IntakeQuestion
          label="Etnia"
          hint="Usado pra contextualizar fatores de risco genéticos."
          full
        >
          <RadioGrid
            options={ETHNICITY_OPTIONS}
            value={id.ethnicity}
            onChange={(ethnicity) =>
              onPatch({ identity: { ...id, ethnicity } })
            }
            cols={3}
          />
        </IntakeQuestion>

        <IntakeQuestion label="Altura (cm)">
          <TextInput
            type="number"
            inputMode="numeric"
            value={id.heightCm?.toString() ?? ""}
            onChange={(v) =>
              onPatch({
                identity: { ...id, heightCm: v ? Number(v) : undefined },
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
            value={id.weightKg?.toString() ?? ""}
            onChange={(v) =>
              onPatch({
                identity: { ...id, weightKg: v ? Number(v) : undefined },
              })
            }
            placeholder="76"
            min={25}
            max={350}
            step={0.1}
          />
        </IntakeQuestion>

        <IntakeQuestion label="Cidade">
          <TextInput
            value={id.city ?? ""}
            onChange={(city) => onPatch({ identity: { ...id, city } })}
            placeholder="Rio de Janeiro"
          />
        </IntakeQuestion>

        <IntakeQuestion label="Estado">
          <TextInput
            value={id.state ?? ""}
            onChange={(state) => onPatch({ identity: { ...id, state } })}
            placeholder="RJ"
          />
        </IntakeQuestion>
      </div>

      <BMIDisplay heightCm={id.heightCm} weightKg={id.weightKg} />
    </div>
  );
}
