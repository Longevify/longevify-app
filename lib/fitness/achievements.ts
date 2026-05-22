import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import type {
  Achievement,
  AchievementCategory,
  AchievementCriterion,
  AchievementTier,
  UserAchievement,
} from "./types";
import { getActivityHeatmap, computeStreak } from "./dashboard";

/**
 * Server helpers do sistema de conquistas (Phase 3C).
 *
 * Catálogo é seedado via migration 0016 (31 conquistas em 5 categorias).
 * User unlocks ficam em user_achievements.
 *
 * Estratégia: NÃO usar triggers SQL (complica testes/migrations). Em
 * vez disso, ao logar set/run/other, server action chama
 * `evaluateAchievements()` que computa quais novas conquistas o user
 * destrancou e insere as faltantes.
 *
 * Trade-off: roda ~30ms extra após cada log, mas dá flexibilidade pra
 * adicionar conquistas novas sem alter de schema.
 */

function mapAchievementRow(r: Record<string, unknown>): Achievement {
  return {
    id: r.id as string,
    category: r.category as AchievementCategory,
    title: r.title as string,
    description: r.description as string,
    criterion: r.criterion as AchievementCriterion,
    tier: r.tier as AchievementTier,
    xp: r.xp as number,
    emoji: r.emoji as string,
  };
}

/**
 * Lista TODAS as conquistas do catálogo + flag se user destrancou.
 */
export async function getAchievementsWithProgress(): Promise<
  Array<Achievement & { unlocked: boolean; unlockedAt?: string }>
> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);

  const [{ data: catalog }, { data: userUnlocks }] = await Promise.all([
    supabase.from("achievement_catalog").select("*").order("xp"),
    supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at")
      .eq("patient_id", userId),
  ]);

  if (!catalog) return [];

  const unlockedMap = new Map<string, string>();
  for (const u of userUnlocks ?? []) {
    unlockedMap.set(
      u.achievement_id as string,
      u.unlocked_at as string,
    );
  }

  return catalog.map((r) => {
    const a = mapAchievementRow(r);
    return {
      ...a,
      unlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id),
    };
  });
}

/**
 * User achievements recentes (top N, mais recentes primeiro), com
 * detalhes do catálogo já hidratados.
 */
export async function getRecentUserAchievements(
  limit = 5,
): Promise<UserAchievement[]> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);

  const { data } = await supabase
    .from("user_achievements")
    .select(
      `id, patient_id, achievement_id, unlocked_at, context,
       achievement_catalog!inner(id, category, title, description, criterion, tier, xp, emoji)`,
    )
    .eq("patient_id", userId)
    .order("unlocked_at", { ascending: false })
    .limit(limit);

  if (!data) return [];

  return data.map((r) => {
    // Supabase pode devolver achievement_catalog como objeto OU array
    // (depende do shape do FK no select). Coerção segura via unknown.
    const catRaw = (r as unknown as {
      achievement_catalog?:
        | Record<string, unknown>
        | Array<Record<string, unknown>>;
    }).achievement_catalog;
    const cat = Array.isArray(catRaw) ? catRaw[0] : catRaw;
    return {
      id: r.id as string,
      patientId: r.patient_id as string,
      achievementId: r.achievement_id as string,
      unlockedAt: r.unlocked_at as string,
      context: (r.context as Record<string, unknown> | null) ?? null,
      achievement: cat ? mapAchievementRow(cat) : undefined,
    };
  });
}

/**
 * XP total do user — soma do xp das conquistas destrancadas.
 */
export async function getUserXp(): Promise<{
  xp: number;
  level: number;
  xpToNextLevel: number;
  progressPct: number;
}> {
  if (!isSupabaseConfigured())
    return { xp: 0, level: 1, xpToNextLevel: 100, progressPct: 0 };
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken)
    return { xp: 0, level: 1, xpToNextLevel: 100, progressPct: 0 };
  const supabase = await createSupabaseWithJwt(accessToken);

  const { data } = await supabase
    .from("user_achievements")
    .select(`achievement_catalog!inner(xp)`)
    .eq("patient_id", userId);

  let xp = 0;
  for (const r of data ?? []) {
    const cat = (r as { achievement_catalog?: { xp?: number } })
      .achievement_catalog;
    xp += cat?.xp ?? 0;
  }

  // Curva: level N requer N×(N+1)/2 × 100 XP — simples e crescente
  // Level 1: 100, Level 2: 300, Level 3: 600, Level 4: 1000, ...
  let level = 1;
  while ((level * (level + 1) * 50) <= xp) level++;
  const xpForCurrentLevel = ((level - 1) * level * 50);
  const xpForNextLevel = level * (level + 1) * 50;
  const xpInLevel = xp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;

  return {
    xp,
    level,
    xpToNextLevel: xpForNextLevel - xp,
    progressPct: Math.min(100, (xpInLevel / xpNeeded) * 100),
  };
}

/**
 * Computa quais conquistas o user destrancou agora e insere as novas
 * em user_achievements. Idempotente — não duplica.
 *
 * Chamada DEPOIS de logar set/run/other.
 *
 * Retorna lista das NOVAS conquistas desbloqueadas (pra mostrar toast
 * de "Nova conquista desbloqueada").
 */
export async function evaluateAchievements(): Promise<Achievement[]> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);

  // 1) Pega catálogo + unlocks atuais
  const [{ data: catalog }, { data: userUnlocks }] = await Promise.all([
    supabase.from("achievement_catalog").select("*"),
    supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("patient_id", userId),
  ]);

  if (!catalog) return [];

  const alreadyUnlocked = new Set(
    (userUnlocks ?? []).map((u) => u.achievement_id as string),
  );
  const pending = catalog
    .map(mapAchievementRow)
    .filter((a) => !alreadyUnlocked.has(a.id));

  if (pending.length === 0) return [];

  // 2) Computa contadores agregados que vão alimentar avaliação
  // Estratégia: faz queries específicas só pros critérios usados nas
  // pending. Evita over-fetch.

  const needs = {
    strengthSetsTotal: false,
    strengthVolumeTotal: false,
    exerciseMaxes: new Set<string>(), // ids
    runningTotal: false,
    runningMaxDist: false,
    runningBestPace: false,
    runningKmMonth: false,
    streak: false,
    otherTotal: false,
    otherDistinct: false,
  };
  for (const a of pending) {
    switch (a.criterion.kind) {
      case "strength_sets_total":
        needs.strengthSetsTotal = true;
        break;
      case "strength_volume_total":
        needs.strengthVolumeTotal = true;
        break;
      case "exercise_max_weight":
      case "exercise_max_reps":
        needs.exerciseMaxes.add(a.criterion.exerciseId);
        break;
      case "running_total":
        needs.runningTotal = true;
        break;
      case "running_max_distance":
        needs.runningMaxDist = true;
        break;
      case "running_best_pace":
        needs.runningBestPace = true;
        break;
      case "running_km_month":
        needs.runningKmMonth = true;
        break;
      case "streak":
        needs.streak = true;
        break;
      case "other_total":
        needs.otherTotal = true;
        break;
      case "other_distinct_types":
        needs.otherDistinct = true;
        break;
    }
  }

  // ─── Fetch agregados ──────────────────────────────────────────────
  let strengthSetsTotal = 0;
  let strengthVolumeTotal = 0;
  const exerciseMaxWeight = new Map<string, number>();
  const exerciseMaxReps = new Map<string, number>();
  let runningSessionsCount = 0;
  let runningMaxDist = 0;
  let runningBestPace: number | null = null;
  let runningKmThisMonth = 0;
  let currentStreak = 0;
  let otherSessionsCount = 0;
  const otherDistinctTypes = new Set<string>();

  if (
    needs.strengthSetsTotal ||
    needs.strengthVolumeTotal ||
    needs.exerciseMaxes.size > 0
  ) {
    const { data } = await supabase
      .from("workout_sets")
      .select(
        `exercise_id, weight_kg, reps,
         workout_sessions!inner(patient_id, kind)`,
      )
      .eq("workout_sessions.patient_id", userId)
      .eq("workout_sessions.kind", "strength");
    for (const r of data ?? []) {
      strengthSetsTotal += 1;
      const w = (r.weight_kg as number | null) ?? 0;
      const reps = r.reps as number;
      strengthVolumeTotal += w * reps;
      const exId = r.exercise_id as string;
      if (needs.exerciseMaxes.has(exId)) {
        if (w > (exerciseMaxWeight.get(exId) ?? 0))
          exerciseMaxWeight.set(exId, w);
        if (reps > (exerciseMaxReps.get(exId) ?? 0))
          exerciseMaxReps.set(exId, reps);
      }
    }
  }

  if (
    needs.runningTotal ||
    needs.runningMaxDist ||
    needs.runningBestPace ||
    needs.runningKmMonth
  ) {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    )
      .toISOString()
      .slice(0, 10);
    const { data } = await supabase
      .from("running_sessions")
      .select(
        `distance_km, avg_pace_seconds_per_km,
         workout_sessions!inner(patient_id, session_date)`,
      )
      .eq("workout_sessions.patient_id", userId);
    for (const r of data ?? []) {
      runningSessionsCount += 1;
      const km = (r.distance_km as number | null) ?? 0;
      const pace = r.avg_pace_seconds_per_km as number | null;
      const date = (
        r as { workout_sessions?: { session_date?: string } }
      ).workout_sessions?.session_date;
      if (km > runningMaxDist) runningMaxDist = km;
      if (
        pace !== null &&
        pace > 0 &&
        km >= 1 && // só conta sub-pace se a corrida ≥ 1km
        (runningBestPace === null || pace < runningBestPace)
      ) {
        runningBestPace = pace;
      }
      if (date && date >= startOfMonth) runningKmThisMonth += km;
    }
  }

  if (needs.streak) {
    const heatmap = await getActivityHeatmap(365);
    currentStreak = computeStreak(heatmap).current;
  }

  if (needs.otherTotal || needs.otherDistinct) {
    const { data } = await supabase
      .from("other_workouts")
      .select(
        `activity_type,
         workout_sessions!inner(patient_id)`,
      )
      .eq("workout_sessions.patient_id", userId);
    for (const r of data ?? []) {
      otherSessionsCount += 1;
      otherDistinctTypes.add(r.activity_type as string);
    }
  }

  // ─── Evaluate ─────────────────────────────────────────────────────
  const unlocked: Achievement[] = [];
  for (const a of pending) {
    const c = a.criterion;
    let pass = false;
    switch (c.kind) {
      case "strength_sets_total":
        pass = strengthSetsTotal >= c.threshold;
        break;
      case "strength_volume_total":
        pass = strengthVolumeTotal >= c.threshold;
        break;
      case "exercise_max_weight":
        pass = (exerciseMaxWeight.get(c.exerciseId) ?? 0) >= c.threshold;
        break;
      case "exercise_max_reps":
        pass = (exerciseMaxReps.get(c.exerciseId) ?? 0) >= c.threshold;
        break;
      case "running_total":
        pass = runningSessionsCount >= c.threshold;
        break;
      case "running_max_distance":
        pass = runningMaxDist >= c.threshold;
        break;
      case "running_best_pace":
        pass = runningBestPace !== null && runningBestPace <= c.threshold;
        break;
      case "running_km_month":
        pass = runningKmThisMonth >= c.threshold;
        break;
      case "streak":
        pass = currentStreak >= c.threshold;
        break;
      case "other_total":
        pass = otherSessionsCount >= c.threshold;
        break;
      case "other_distinct_types":
        pass = otherDistinctTypes.size >= c.threshold;
        break;
    }
    if (pass) unlocked.push(a);
  }

  if (unlocked.length === 0) return [];

  // ─── Insert na user_achievements ──────────────────────────────────
  const rows = unlocked.map((a) => ({
    patient_id: userId,
    achievement_id: a.id,
  }));
  const { error } = await supabase
    .from("user_achievements")
    .insert(rows)
    .select();
  if (error) {
    // Pode falhar se houver race condition (unique constraint).
    // Ignora — não bloqueia o log do treino.
    console.error("[evaluateAchievements] insert", error);
    return [];
  }

  return unlocked;
}
