import { BIOMARKERS } from "@/lib/mock-data";
import {
  generateProtocolTasks,
  generateWorkingOnGoals,
} from "@/lib/protocolo/tasks";
import { loadDadosForUser } from "@/lib/dados/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ProtocoloClient } from "./protocolo-client";

export const dynamic = "force-dynamic";

/**
 * Lucas (2026-05-20): "a aba de protocolo não está carregando direito
 * (ta demorando muito)."
 *
 * Causa: server component chamava `await generateAIProtocolForGaps` que
 * fazia fetch interno pro Anthropic (8-15s). Bloqueava RSC inteiro.
 *
 * Fix: server entrega RULE-BASED imediato (sem fetch externo). AI gen
 * vira client-side lazy no ProtocoloClient (useEffect que carrega após
 * mount, sem bloquear primeiro paint). User vê rule-based instantâneo,
 * AI fills aparecem em ~10s sem travar a UI.
 */
export default async function ProtocoloPage() {
  const user = await getCurrentUser();
  const dados = await loadDadosForUser({
    userId: user.id,
    isDemo: user.isDemo,
  });

  const biomarkers = dados.biomarkers.length > 0 ? dados.biomarkers : BIOMARKERS;

  // Rule-based primeiro (cobre os 19 curados, sem AI, instantâneo)
  const ruleBasedTasks = generateProtocolTasks(biomarkers);
  const ruleBasedGoals = generateWorkingOnGoals(biomarkers);

  // ProtocoloClient dispara AI gen client-side via useEffect (não bloqueia
  // o RSC). Passamos apenas os biomarkers — o client decide o que precisa
  // ser preenchido por AI.
  return (
    <ProtocoloClient
      tasks={ruleBasedTasks}
      workingOn={ruleBasedGoals}
      biomarkers={biomarkers}
      patient={dados.patient}
    />
  );
}
