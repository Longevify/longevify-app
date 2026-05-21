import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";

/**
 * Calcula a sequência ("streak") de dias consecutivos com pelo menos 1
 * task de protocolo marcada como feita.
 *
 * Algoritmo:
 *   1. Busca DISTINCT(completed_date) das últimas 60 datas
 *      (60 = limite prático — streak >60d virou rare badge)
 *   2. Conta dias consecutivos a partir de hoje OU ontem (graça de 1
 *      dia pra usuário que ainda não checkou hoje mas marcou ontem)
 *   3. Para no primeiro gap
 *
 * Lucas (2026-05-20): "tem que ser bem gameficado, o cara tem que
 * gostar de usar o app para ver que ta melhorando." → streak real é
 * a métrica mais viciante de retenção (Duolingo, Strava).
 *
 * Retorna 0 se:
 * - Sem Supabase / não autenticado
 * - User nunca completou nada
 * - Última completion foi há > 1 dia (perdeu o streak)
 */
export async function getStreakDays(userId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const { accessToken } = await getUserIdFromCookie();
  if (!accessToken) return 0;

  const supabase = await createSupabaseWithJwt(accessToken);

  // Query: pega últimas 60 datas distintas com completions
  const { data, error } = await supabase
    .from("task_completions")
    .select("completed_date")
    .eq("patient_id", userId)
    .order("completed_date", { ascending: false })
    .limit(200); // cap baixo — se user fizer 200+ tasks num dia, ainda assim só conta DISTINCT

  if (error || !data || data.length === 0) return 0;

  // Distinct dates (mantém ordem desc)
  const seen = new Set<string>();
  const dates: string[] = [];
  for (const row of data) {
    const d = row.completed_date as string;
    if (!seen.has(d)) {
      seen.add(d);
      dates.push(d);
    }
  }

  // Conta consecutividade a partir de hoje (UTC).
  // Graça: se última completion foi ontem mas não hoje, ainda conta
  // (streak não quebra no meio do dia atual).
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);

  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Streak válido tem que começar em hoje ou ontem
  if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  // Ponteiro de "esperado" começa do dia mais recente que aparece nos dados
  const expected = new Date(dates[0] + "T00:00:00.000Z");

  for (const d of dates) {
    const expectedStr = expected.toISOString().slice(0, 10);
    if (d === expectedStr) {
      streak++;
      expected.setUTCDate(expected.getUTCDate() - 1);
    } else {
      // gap → streak quebra
      break;
    }
  }

  return streak;
}

/**
 * Retorna count de tasks completadas POR DIA nos últimos N dias.
 * Usado pelo calendar heatmap no popup de tasks da home.
 *
 * Lucas (2026-05-21): popup pros cards "Feitas hoje" / "A fazer" com
 * histórico de completions tipo GitHub contributions.
 */
export async function getTaskCompletionsHistory(
  userId: string,
  days = 30,
): Promise<Array<{ date: string; count: number }>> {
  if (!isSupabaseConfigured()) return [];

  const { accessToken } = await getUserIdFromCookie();
  if (!accessToken) return [];

  const supabase = await createSupabaseWithJwt(accessToken);

  // Calcula cutoff date
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("task_completions")
    .select("completed_date")
    .eq("patient_id", userId)
    .gte("completed_date", cutoffStr)
    .order("completed_date", { ascending: true });

  if (error || !data) return [];

  // Agrega por date
  const byDate = new Map<string, number>();
  for (const row of data) {
    const d = row.completed_date as string;
    byDate.set(d, (byDate.get(d) ?? 0) + 1);
  }

  // Constrói array com TODOS os dias (mesmo sem completions), pra
  // alimentar grid contínuo no heatmap.
  const out: Array<{ date: string; count: number }> = [];
  for (let i = 0; i <= days; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (days - i));
    const dStr = d.toISOString().slice(0, 10);
    out.push({ date: dStr, count: byDate.get(dStr) ?? 0 });
  }

  return out;
}
