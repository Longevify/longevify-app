"use client";

import dynamic from "next/dynamic";
import type { PatientSex } from "@/lib/mock-data";
import type { OrganStatus } from "@/components/dados/body-mannequin";

const BodyMannequin = dynamic(
  () =>
    import("@/components/dados/body-mannequin").then((m) => m.BodyMannequin),
  { ssr: false },
);

/**
 * Wrapper do BodyMannequin pros stories. Sempre renderiza no modo "all"
 * com cores por status clínico (verde/amarelo/vermelho), igual o "Todos
 * os Dados" da página /dados. É o que Lucas pediu nessa iteração — o
 * boneco branco que estava no slide "Seus pontos fortes" virou uma
 * representação visual da saúde de cada órgão.
 */
export function StoriesMannequin({
  sex,
  organStatuses,
  className,
}: {
  sex: PatientSex;
  organStatuses: Record<string, OrganStatus>;
  className?: string;
}) {
  return (
    <BodyMannequin
      sex={sex}
      activeOrgan="all"
      organStatuses={organStatuses}
      className={className}
    />
  );
}

/**
 * Converte o array `organBioAges` (ou `organScores`) do Patient mock
 * para o `organStatuses` que o BodyMannequin entende.
 *
 * Cada item tem `organ` em PT-BR ("Coração", "Pulmões"…) e `status`
 * ("optimal" | "normal" | "out"). O mannequim usa IDs internos
 * ("heart", "lungs"…), então mapeia aqui.
 */
const ORGAN_PT_TO_ID: Record<string, string> = {
  "Coração": "heart",
  "Pulmões": "lungs",
  "Fígado": "liver",
  "Pâncreas": "pancreas",
  "Rins": "kidneys",
  "Intestino": "intestine",
  "Cérebro": "brain",
};

export function buildOrganStatuses(
  organs: Array<{ organ: string; status: OrganStatus }>,
): Record<string, OrganStatus> {
  const out: Record<string, OrganStatus> = {};
  for (const o of organs) {
    const id = ORGAN_PT_TO_ID[o.organ];
    if (id) out[id] = o.status;
  }
  return out;
}
