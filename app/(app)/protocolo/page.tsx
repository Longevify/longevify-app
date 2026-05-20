import { BIOMARKERS } from "@/lib/mock-data";
import {
  generateProtocolTasks,
  generateWorkingOnGoals,
} from "@/lib/protocolo/tasks";
import { generateAIProtocolForGaps } from "@/lib/protocolo/ai-gen";
import { loadDadosForUser } from "@/lib/dados/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ProtocoloClient } from "./protocolo-client";

export const dynamic = "force-dynamic";

/**
 * Lucas (2026-05-20): "tudo tem que mudar com base nessas informações
 * ... os protocolos tem que mudar."
 *
 * Estratégia híbrida:
 *  1. Tasks rule-based pros 19 biomarcadores curados (lib/protocolo/tasks.ts)
 *     — texto clínico validado, sem latência, sem custo AI
 *  2. AI gen via Claude Sonnet 4.6 pra biomarcadores fora do catálogo
 *     — cobre os ~60 do catálogo expandido (migration 0008) com geração
 *     dinâmica
 *
 * Custo: ~$0.005 por carregamento de /protocolo (1 call Sonnet por
 * paciente, se houver gap a preencher). Vale com folga em ~R$600/user/ano.
 */
export default async function ProtocoloPage() {
  const user = await getCurrentUser();
  const dados = await loadDadosForUser({
    userId: user.id,
    isDemo: user.isDemo,
  });

  const biomarkers = dados.biomarkers.length > 0 ? dados.biomarkers : BIOMARKERS;

  // Rule-based primeiro (cobre os 19 curados)
  const ruleBasedTasks = generateProtocolTasks(biomarkers);
  const ruleBasedGoals = generateWorkingOnGoals(biomarkers);

  // IDs que o rule-based cobre — passado pro AI evitar duplicação
  const ruleBasedIds = new Set(
    ruleBasedTasks
      .filter((t) => t.id.startsWith("bio-"))
      .map((t) => t.id.replace("bio-", "")),
  );

  // AI fill: gera pros biomarkers fora do catálogo (só se há gaps)
  const aiGen = await generateAIProtocolForGaps(
    biomarkers,
    dados.patient,
    ruleBasedIds,
  );

  // Combina: rule-based vem primeiro (ordem clínica curada), AI depois
  // (cobertura adicional). Lifestyle tasks ficam por último (gerada
  // dentro de generateProtocolTasks).
  const allTasks = [
    ...ruleBasedTasks.filter((t) => !t.lifestyleIcon), // sem lifestyle
    ...aiGen.tasks,
    ...ruleBasedTasks.filter((t) => t.lifestyleIcon), // lifestyle no fim
  ];
  const allGoals = [...ruleBasedGoals, ...aiGen.goals];

  return <ProtocoloClient tasks={allTasks} workingOn={allGoals} />;
}
