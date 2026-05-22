import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import { getActivityHeatmap, computeStreak } from "./dashboard";

/**
 * Phase 3E — Insights de saúde fitness computados localmente.
 *
 * VO2max estimado a partir de corridas (sem precisar de HR monitor) +
 * recovery score baseado em volume/streak/repouso.
 *
 * NÃO é uma medida médica. Estimativas atléticas pra dar feedback
 * direcional ao usuário. Disclaimers no UI.
 */

// ─── VO2max ───────────────────────────────────────────────────────────

export interface Vo2MaxEstimate {
  value: number; // ml/kg/min
  /** Tier qualitativo baseado em idade × sexo. Pra MVP, usa só value. */
  tier: "low" | "fair" | "good" | "excellent" | "elite";
  /** Como foi calculado pra mostrar no detail */
  basedOn: {
    distanceKm: number;
    paceSecondsPerKm: number;
    sessionDate: string;
  };
}

/**
 * Estima VO2max a partir da melhor corrida ≥ 5km nos últimos 90 dias.
 *
 * Fórmula simplificada (Daniels-style, ajustada): com pace em s/km
 * convertido pra m/min:
 *   speed_m_per_min = 1000 / (paceSecondsPerKm / 60)
 *                   = 60000 / paceSecondsPerKm
 *
 *   VO2max ≈ 0.2 × speed + 3.5 + (intensity_factor)
 *
 * Onde intensity_factor é 0 pra threshold pace, +5 pra all-out 5K, etc.
 * Pra estimativa rough, usamos só a velocidade (assume corrida sub-VO2).
 *
 * Mais conservador que Cooper test (que assume 12min all-out).
 *
 * Resultado é uma aproximação — disclaimer no UI.
 */
export async function estimateVo2Max(): Promise<Vo2MaxEstimate | null> {
  if (!isSupabaseConfigured()) return null;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return null;
  const supabase = await createSupabaseWithJwt(accessToken);

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("running_sessions")
    .select(
      `distance_km, avg_pace_seconds_per_km, duration_seconds,
       workout_sessions!inner(patient_id, session_date)`,
    )
    .eq("workout_sessions.patient_id", userId)
    .gte("workout_sessions.session_date", cutoffStr);
  if (!data || data.length === 0) return null;

  // Pega a corrida ≥ 3km com melhor pace (mais consistente que 5km — algumas
  // pessoas correm distâncias menores rápido)
  let best: typeof data[number] | null = null;
  for (const r of data) {
    const km = (r.distance_km as number | null) ?? 0;
    const pace = r.avg_pace_seconds_per_km as number | null;
    if (km < 3 || !pace || pace <= 0) continue;
    if (
      !best ||
      (best.avg_pace_seconds_per_km as number) > pace
    ) {
      best = r;
    }
  }
  if (!best) return null;

  const pace = best.avg_pace_seconds_per_km as number;
  const km = best.distance_km as number;
  // velocity m/min
  const speedMperMin = 60000 / pace;
  // Fórmula simplificada: VO2 = 0.2 × speed + 3.5 (cost of running)
  // Bonifica se foi corrida longa (5K+) — assume effort sub-vo2 nessas
  let vo2 = 0.2 * speedMperMin + 3.5;
  if (km >= 5 && km < 10) vo2 += 3;
  else if (km >= 10 && km < 21) vo2 += 5;
  else if (km >= 21) vo2 += 8;

  // Cap em 80 (elite humano absurdo)
  vo2 = Math.min(80, vo2);

  const tier: Vo2MaxEstimate["tier"] =
    vo2 < 30
      ? "low"
      : vo2 < 40
        ? "fair"
        : vo2 < 50
          ? "good"
          : vo2 < 60
            ? "excellent"
            : "elite";

  const sessionDate =
    (best as { workout_sessions?: { session_date?: string } }).workout_sessions
      ?.session_date ?? "";

  return {
    value: Math.round(vo2 * 10) / 10,
    tier,
    basedOn: {
      distanceKm: km,
      paceSecondsPerKm: pace,
      sessionDate,
    },
  };
}

// ─── Recovery Score ───────────────────────────────────────────────────

export interface RecoveryScore {
  /** 0-100. 100 = bem descansado, 0 = sobretreinamento */
  score: number;
  tier: "low" | "fair" | "good" | "great";
  recommendation: string;
  /** Volume desta semana (kg*reps strength + km*100 corrida) */
  thisWeekLoad: number;
  /** Média das últimas 4 semanas */
  avgWeeklyLoad: number;
  /** Streak atual */
  streakDays: number;
  /** Última atividade — dias atrás */
  daysSinceLastWorkout: number;
}

/**
 * Recovery score sintético baseado em:
 *  - Volume desta semana vs média histórica (acute:chronic ratio)
 *  - Streak (cansaço acumulado)
 *  - Dias desde último treino (descanso recente)
 *
 * Não é medida médica — proxy comportamental.
 *
 * Retorna null se sem histórico suficiente (< 7 dias).
 */
export async function computeRecoveryScore(): Promise<RecoveryScore | null> {
  if (!isSupabaseConfigured()) return null;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return null;

  // Pega heatmap 30 dias pra calcular load chronic vs acute
  const heatmap = await getActivityHeatmap(28); // 4 semanas
  if (heatmap.length < 7) return null;

  const supabase = await createSupabaseWithJwt(accessToken);

  // Computa load por semana
  const last7 = heatmap.slice(-7);
  const prev21 = heatmap.slice(-28, -7);

  const computeLoad = (
    days: typeof heatmap,
  ): { load: number; dayCount: number } => {
    let load = 0;
    let dayCount = 0;
    for (const d of days) {
      const dayLoad = d.strengthVolume / 100 + d.runningKm * 5 + d.otherMinutes / 6;
      load += dayLoad;
      if (dayLoad > 0) dayCount += 1;
    }
    return { load, dayCount };
  };

  const { load: acute } = computeLoad(last7);
  const { load: chronic21 } = computeLoad(prev21);
  const chronic = chronic21 / 3; // média por semana

  // Acute:Chronic Workload Ratio (ACWR) — 0.8-1.3 é zona ideal, > 1.5 risco
  const acwr = chronic > 0 ? acute / chronic : 1;

  // Streak
  const streak = computeStreak(heatmap).current;

  // Days since last workout (incluindo hoje)
  let daysSinceLastWorkout = 0;
  for (let i = heatmap.length - 1; i >= 0; i--) {
    if (heatmap[i].intensity > 0) {
      break;
    }
    daysSinceLastWorkout += 1;
  }
  // Suppress queue against unused — TODO actual usage of supabase
  void supabase;

  // Score base = 100. Penaliza ACWR > 1.3 (sobrecarga), bonifica descanso.
  let score = 100;
  if (acwr > 1.5) score -= 30;
  else if (acwr > 1.3) score -= 15;
  else if (acwr > 1.0) score -= 5;
  if (streak > 6) score -= 10;
  if (streak > 14) score -= 15;
  if (daysSinceLastWorkout === 0 && streak > 0) score -= 5;
  // Bonus de descanso
  if (daysSinceLastWorkout >= 1) score += Math.min(10, daysSinceLastWorkout * 3);

  score = Math.max(0, Math.min(100, Math.round(score)));

  const tier: RecoveryScore["tier"] =
    score >= 85 ? "great" : score >= 65 ? "good" : score >= 40 ? "fair" : "low";

  let recommendation = "";
  if (score >= 85) {
    recommendation = "Você tá descansado — bom dia pra puxar pesado ou correr longo.";
  } else if (score >= 65) {
    recommendation = "Recuperação OK. Treino moderado é seguro.";
  } else if (score >= 40) {
    recommendation =
      "Considere um treino mais leve hoje, ou um dia de mobilidade/cardio aeróbico.";
  } else {
    recommendation =
      "Sinais de sobrecarga. Descanso de 1-2 dias ajuda a evitar lesão e maximiza adaptação.";
  }

  return {
    score,
    tier,
    recommendation,
    thisWeekLoad: Math.round(acute),
    avgWeeklyLoad: Math.round(chronic),
    streakDays: streak,
    daysSinceLastWorkout,
  };
}
