"use client";

import type { IntakeData } from "@/lib/intake/schema";
import { IntakeQuestion } from "./intake-question";
import { MultiChipSelect } from "./multi-chip-select";
import { FAMILY_EARLY_OPTIONS } from "./options";
import { Heading } from "./heading";

interface Props {
  data: IntakeData;
  onPatch: (next: Partial<IntakeData>) => void;
}

export function StepFamily({ data, onPatch }: Props) {
  const f = data.family;
  return (
    <div className="flex flex-col gap-5">
      <Heading
        title="Histórico familiar"
        subtitle="Eventos antes dos 60 anos em pais ou irmãos contam como fator de risco genético importante."
      />

      <IntakeQuestion
        label="Algum dos pais ou irmãos teve antes dos 60 anos?"
        hint="Marque todos os eventos que se aplicam — ou apenas “nenhum”."
        full
      >
        <MultiChipSelect
          options={FAMILY_EARLY_OPTIONS}
          values={f.earlyEvents}
          onChange={(earlyEvents) =>
            onPatch({ family: { ...f, earlyEvents } })
          }
          exclusive={["nenhuma"]}
        />
      </IntakeQuestion>

      <p className="text-[12px] leading-relaxed text-muted">
        Por que perguntamos: histórico familiar precoce de infarto, AVC e
        certos cânceres muda quais biomarcadores priorizamos no seu painel.
      </p>
    </div>
  );
}
