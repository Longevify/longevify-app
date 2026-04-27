"use client";

import type { IntakeData } from "@/lib/intake/schema";
import { IntakeQuestion } from "./intake-question";
import { LikertSlider } from "./likert-slider";
import { RadioGrid, YesNo } from "./inputs";
import { FATIGUE_OPTIONS } from "./options";
import { Heading } from "./heading";

interface Props {
  data: IntakeData;
  onPatch: (next: Partial<IntakeData>) => void;
}

export function StepMental({ data, onPatch }: Props) {
  const m = data.mental;
  return (
    <div className="flex flex-col gap-6">
      <Heading
        title="Saúde mental & energia"
        subtitle="Áreas frequentemente subnotificadas — sua resposta aqui guia recomendações de descanso, terapia e biomarcadores hormonais."
      />

      <IntakeQuestion label="Como classifica seu humor geral?" full>
        <LikertSlider
          min={1}
          max={10}
          value={m.moodScore}
          onChange={(moodScore) => onPatch({ mental: { ...m, moodScore } })}
          minLabel="muito baixo"
          maxLabel="excelente"
        />
      </IntakeQuestion>

      <IntakeQuestion label="Frequência de cansaço/fadiga" full>
        <RadioGrid
          options={FATIGUE_OPTIONS}
          value={m.fatigueFrequency}
          onChange={(fatigueFrequency) =>
            onPatch({ mental: { ...m, fatigueFrequency } })
          }
          cols={3}
        />
      </IntakeQuestion>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <IntakeQuestion
          label="Já recebeu diagnóstico de depressão ou ansiedade?"
          full
        >
          <YesNo
            value={m.diagnosedDepressionAnxiety}
            onChange={(diagnosedDepressionAnxiety) =>
              onPatch({ mental: { ...m, diagnosedDepressionAnxiety } })
            }
          />
        </IntakeQuestion>

        <IntakeQuestion
          label="Faz terapia ou acompanhamento psicológico?"
          full
        >
          <YesNo
            value={m.inTherapy}
            onChange={(inTherapy) => onPatch({ mental: { ...m, inTherapy } })}
          />
        </IntakeQuestion>
      </div>

      <IntakeQuestion label="Qualidade da concentração e foco" full>
        <LikertSlider
          min={1}
          max={10}
          value={m.focusScore}
          onChange={(focusScore) =>
            onPatch({ mental: { ...m, focusScore } })
          }
          minLabel="dispersa"
          maxLabel="afiada"
        />
      </IntakeQuestion>

      <IntakeQuestion
        label="Libido"
        hint="Marcador hormonal indireto — pode pular se preferir."
        optional
        full
      >
        <LikertSlider
          min={1}
          max={10}
          value={m.libidoScore}
          onChange={(libidoScore) =>
            onPatch({ mental: { ...m, libidoScore } })
          }
          minLabel="muito baixa"
          maxLabel="muito alta"
        />
      </IntakeQuestion>
    </div>
  );
}
