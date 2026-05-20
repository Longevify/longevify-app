import { BIOMARKERS } from "@/lib/mock-data";
import {
  generateProtocolTasks,
  generateWorkingOnGoals,
} from "@/lib/protocolo/tasks";
import { loadDadosForUser } from "@/lib/dados/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ProtocoloClient } from "./protocolo-client";

export const dynamic = "force-dynamic";

export default async function ProtocoloPage() {
  // Lucas (2026-05-20): "os protocolos tem que mudar". Carrega biomarcadores
  // REAIS do paciente quando autenticado — protocolo gerado se baseia
  // neles (deficiência de Vit D → sugere suplemento; LDL alto → Ômega-3).
  //
  // Toda recomendação tem qualificadores de segurança (uso contínuo,
  // condição crônica, medicação concomitante → confirmar com médico).
  // Lógica em `lib/protocolo/tasks.ts`.
  const user = await getCurrentUser();
  const dados = await loadDadosForUser({
    userId: user.id,
    isDemo: user.isDemo,
  });

  // Sem exames reais ainda → cai no mock pra demonstrar o protocolo
  // estilo. Quando paciente tiver upload de exame, mudará pros dados
  // dele automaticamente.
  const biomarkers = dados.biomarkers.length > 0 ? dados.biomarkers : BIOMARKERS;

  const tasks = generateProtocolTasks(biomarkers);
  const workingOn = generateWorkingOnGoals(biomarkers);

  return <ProtocoloClient tasks={tasks} workingOn={workingOn} />;
}
