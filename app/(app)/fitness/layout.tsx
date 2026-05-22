import { ExportButton } from "@/components/fitness/export-button";
import { FitnessSubTabs } from "./sub-tabs";

/**
 * Lucas (2026-05-21): "quero criar uma aba para fitness, quando entro
 * na aba fitness, tem 2 sub abas, uma aba para musculação, uma para
 * corrida e outra para demais exercícios."
 *
 * Lucas (2026-05-22): "torne essa aba do app perfeita" — adicionada
 * tab "Visão geral" como página inicial unificada.
 *
 * Lucas (2026-05-22, manhã): bug fix — sub-tabs viraram client
 * component (FitnessSubTabs) usando usePathname() pra active state
 * funcionar quando user navega entre sub-abas. O proxy.ts seta
 * x-pathname no response.headers, não request.headers — então
 * headers() em Server Component pegava sempre o fallback default,
 * e a tab "ativa" nunca trocava com a rota.
 */

export default async function FitnessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[920px] px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex items-end justify-between pb-2">
        <div>
          <span className="text-[13px] text-muted">Treino e atividade física</span>
          <h1 className="text-[28px] leading-[1.1] font-semibold tracking-tight sm:text-[34px]">
            Fitness
          </h1>
        </div>
        <ExportButton />
      </header>

      <FitnessSubTabs />

      {children}
    </div>
  );
}
