import { BIOMARKERS } from "@/lib/mock-data";
import {
  generateProtocolTasks,
  generateWorkingOnGoals,
} from "@/lib/protocolo/tasks";
import { ProtocoloClient } from "./protocolo-client";

export default function ProtocoloPage() {
  // Gera tasks e goals dinamicamente dos biomarcadores do paciente.
  // O protocolo agora atua como médico: deficiência de Vit D → recomenda
  // Vit D; LDL alto → Ômega 3; etc. (lógica em `lib/protocolo/tasks.ts`).
  //
  // TODO: quando virar dado real, ler biomarkers via getDadosForPatient
  // do server (lib/dados/server.ts). Por enquanto BIOMARKERS mock.
  const tasks = generateProtocolTasks(BIOMARKERS);
  const workingOn = generateWorkingOnGoals(BIOMARKERS);

  return <ProtocoloClient tasks={tasks} workingOn={workingOn} />;
}
