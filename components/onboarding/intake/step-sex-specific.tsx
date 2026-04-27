"use client";

import type { IntakeData } from "@/lib/intake/schema";
import { IntakeQuestion } from "./intake-question";
import { ConditionalSection } from "./conditional-section";
import { DateInput } from "./date-input";
import { RadioGrid, TextArea, TextInput, YesNo } from "./inputs";
import { CONTRACEPTIVE_OPTIONS, MENOPAUSE_OPTIONS } from "./options";
import { Heading } from "./heading";

interface Props {
  data: IntakeData;
  onPatch: (next: Partial<IntakeData>) => void;
}

const TODAY_ISO = new Date().toISOString().slice(0, 10);

export function StepSexSpecific({ data, onPatch }: Props) {
  const sex = data.identity.biologicalSex;

  if (sex === "female") return <FemaleBlock data={data} onPatch={onPatch} />;
  if (sex === "male") return <MaleBlock data={data} onPatch={onPatch} />;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-surface p-5">
      <Heading
        title="Específico por sexo"
        subtitle="Pra ver as perguntas certas, marque seu sexo biológico no Step 1."
      />
    </div>
  );
}

function FemaleBlock({ data, onPatch }: Props) {
  const f = data.female;
  return (
    <div className="flex flex-col gap-5">
      <Heading
        title="Saúde feminina"
        subtitle="Ciclo, anticoncepcional e fase reprodutiva influenciam diversos biomarcadores."
      />

      <IntakeQuestion label="Última menstruação" optional full>
        <DateInput
          value={f.lastPeriodDate}
          onChange={(lastPeriodDate) =>
            onPatch({ female: { ...f, lastPeriodDate } })
          }
          max={TODAY_ISO}
        />
      </IntakeQuestion>

      <IntakeQuestion label="Tem ciclo regular?" full>
        <YesNo
          value={f.regularCycle}
          onChange={(regularCycle) =>
            onPatch({ female: { ...f, regularCycle } })
          }
        />
      </IntakeQuestion>

      <IntakeQuestion label="Usa anticoncepcional?" full>
        <RadioGrid
          options={CONTRACEPTIVE_OPTIONS}
          value={f.contraceptive}
          onChange={(contraceptive) =>
            onPatch({ female: { ...f, contraceptive } })
          }
          cols={3}
        />
      </IntakeQuestion>

      <IntakeQuestion label="Já engravidou? Quantas vezes?" optional>
        <TextInput
          type="number"
          inputMode="numeric"
          value={f.pregnancies?.toString() ?? ""}
          onChange={(v) =>
            onPatch({
              female: { ...f, pregnancies: v ? Number(v) : undefined },
            })
          }
          placeholder="0"
          min={0}
          max={20}
        />
      </IntakeQuestion>

      <IntakeQuestion label="Fase em relação à menopausa" full>
        <RadioGrid
          options={MENOPAUSE_OPTIONS}
          value={f.menopause}
          onChange={(menopause) =>
            onPatch({ female: { ...f, menopause } })
          }
          cols={4}
        />
      </IntakeQuestion>
    </div>
  );
}

function MaleBlock({ data, onPatch }: Props) {
  const m = data.male;
  return (
    <div className="flex flex-col gap-5">
      <Heading
        title="Saúde masculina"
        subtitle="Quero entender contexto urológico e hormonal."
      />

      <IntakeQuestion label="Tem alguma queixa urológica?" full>
        <YesNo
          value={m.urologicComplaint}
          onChange={(urologicComplaint) =>
            onPatch({
              male: {
                ...m,
                urologicComplaint,
                urologicComplaintDetail: urologicComplaint
                  ? m.urologicComplaintDetail
                  : "",
              },
            })
          }
        />
      </IntakeQuestion>

      <ConditionalSection show={m.urologicComplaint === true}>
        <IntakeQuestion label="Descreva brevemente" full>
          <TextArea
            value={m.urologicComplaintDetail ?? ""}
            onChange={(urologicComplaintDetail) =>
              onPatch({ male: { ...m, urologicComplaintDetail } })
            }
            placeholder="Ex: jato fraco, urgência urinária noturna"
            rows={2}
          />
        </IntakeQuestion>
      </ConditionalSection>

      <IntakeQuestion label="Faz exame de próstata regularmente?" full>
        <YesNo
          value={m.prostateExamRegular}
          onChange={(prostateExamRegular) =>
            onPatch({ male: { ...m, prostateExamRegular } })
          }
        />
      </IntakeQuestion>

      <IntakeQuestion label="Já avaliou testosterona alguma vez?" full>
        <YesNo
          value={m.testosteroneTested}
          onChange={(testosteroneTested) =>
            onPatch({ male: { ...m, testosteroneTested } })
          }
        />
      </IntakeQuestion>
    </div>
  );
}
