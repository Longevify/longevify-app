import {
  getMonthlyWorkoutSessions,
  getActiveWorkoutProgram,
  hydrateProgramExerciseNames,
  getTodaysWorkout,
} from "@/lib/fitness/server";
import { CalendarioClient } from "./calendario-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Lucas (2026-05-25): "quero que você crie uma aba visual com calendário
 * para mostrar os treinos, quando você clica no dia aparece a rotina de
 * exercícios desse dia."
 *
 * Calendário mensal de treinos:
 *  - Mês atual exibido com dots verdes nos dias treinados
 *  - Click no dia → painel com exercícios + sets do treino feito
 *  - Click em hoje (sem treino) → mostra próximo treino do programa +
 *    botão "Treinar agora" pra ir pro logger
 *  - Setas pra navegar entre meses (fetch dinâmico via search param)
 */
interface PageProps {
  searchParams: Promise<{ y?: string; m?: string }>;
}

export default async function CalendarioPage({ searchParams }: PageProps) {
  const { y, m } = await searchParams;
  const now = new Date();
  const year = y ? parseInt(y, 10) : now.getUTCFullYear();
  const monthZero = m ? parseInt(m, 10) - 1 : now.getUTCMonth(); // search param 1-12

  const [sessions, program, todays] = await Promise.all([
    getMonthlyWorkoutSessions(year, monthZero),
    getActiveWorkoutProgram().then((p) =>
      p ? hydrateProgramExerciseNames(p) : null,
    ),
    getTodaysWorkout(),
  ]);

  return (
    <CalendarioClient
      year={year}
      monthZero={monthZero}
      sessions={sessions}
      program={program}
      todaysDayIndex={todays?.dayIndex ?? null}
    />
  );
}
