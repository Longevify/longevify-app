/**
 * Tipos da feature Social.
 *
 * Lucas (2026-05-23): "quero gameficar mais o app, colocar sistema de
 * pontos... aba nova chamada social."
 */

export type PointEventKind =
  | "daily_tasks_completed"
  | "streak_milestone"
  | "biomarker_improved"
  | "achievement_unlocked"
  | "workout_logged"
  | "running_logged"
  | "meal_logged"
  | "social_post"
  | "friend_added"
  | "level_up";

export const POINT_EVENT_LABEL: Record<PointEventKind, string> = {
  daily_tasks_completed: "Tarefas do dia",
  streak_milestone: "Streak conquistada",
  biomarker_improved: "Biomarker melhorou",
  achievement_unlocked: "Conquista desbloqueada",
  workout_logged: "Treino registrado",
  running_logged: "Corrida registrada",
  meal_logged: "Refeição registrada",
  social_post: "Post compartilhado",
  friend_added: "Amigo adicionado",
  level_up: "Subiu de nível",
};

/** Pontos por tipo de evento — referência canônica do scoring. */
export const POINTS_PER_EVENT: Record<PointEventKind, number> = {
  daily_tasks_completed: 50, // todas as tarefas do dia feitas
  streak_milestone: 100, // múltiplos de 7 dias (7, 14, 21, etc)
  biomarker_improved: 75, // status mudou pra melhor (out → normal, normal → optimal)
  achievement_unlocked: 0, // usa xp da conquista
  workout_logged: 20,
  running_logged: 30, // bonus extra (já tem workout_logged)
  meal_logged: 5,
  social_post: 10,
  friend_added: 25,
  level_up: 0, // gerado automaticamente
};

export interface HealthPoints {
  patientId: string;
  totalPoints: number;
  level: number;
  fitnessPoints: number;
  nutritionPoints: number;
  consistencyPoints: number;
  biomarkerPoints: number;
  socialPoints: number;
  updatedAt: string;
}

export interface HealthPointEvent {
  id: string;
  patientId: string;
  kind: PointEventKind;
  points: number;
  context: Record<string, unknown> | null;
  createdAt: string;
}

export interface UserLocation {
  patientId: string;
  city: string | null;
  state: string | null; // UF code
  country: string;
}

export interface SocialPrivacy {
  patientId: string;
  showInFriendFeed: boolean;
  showInFriendRanking: boolean;
  showInCityRanking: boolean;
  showInStateRanking: boolean;
  showInCountryRanking: boolean;
  consentedAt: string | null;
  consentVersion: string | null;
}

export type SocialPostKind =
  | "running"
  | "workout"
  | "achievement"
  | "level_up"
  | "biomarker"
  | "milestone";

export interface SocialPost {
  id: string;
  patientId: string;
  kind: SocialPostKind;
  payload: {
    title: string;
    body?: string;
    distanceKm?: number;
    durationSeconds?: number;
    paceSecondsPerKm?: number;
    exerciseId?: string;
    achievementId?: string;
    achievementEmoji?: string;
    achievementTier?: "common" | "rare" | "epic" | "legendary";
    imageUrl?: string;
    routePreview?: Array<[number, number]>; // simplified GPS
    level?: number;
    [key: string]: unknown;
  };
  visibility: "friends" | "public";
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  // Joined from profiles
  authorFirstName?: string;
  authorAvatarUrl?: string | null;
}

export interface RankingEntry {
  patientId: string;
  rank: number;
  totalPoints: number;
  level: number;
  firstName: string;
  city?: string | null;
  state?: string | null;
  // Métricas comparativas (mês corrente)
  monthlyKm?: number;
  monthlyWorkouts?: number;
  isCurrentUser: boolean;
}

export type RankingScope = "friends" | "city" | "state" | "country";

export const RANKING_SCOPE_LABEL: Record<RankingScope, string> = {
  friends: "Amigos",
  city: "Cidade",
  state: "Estado",
  country: "Brasil",
};

/**
 * Curva de level → label pra mostrar título qualitativo.
 * Lucas pediu "vários diferentes níveis entre amigos".
 */
export function levelTitle(level: number): string {
  if (level >= 50) return "🏆 Lendário";
  if (level >= 40) return "💎 Mestre da Longevidade";
  if (level >= 30) return "⚡ Atleta Sênior";
  if (level >= 25) return "🔥 Avançado";
  if (level >= 20) return "🎯 Veterano";
  if (level >= 15) return "💪 Forte";
  if (level >= 10) return "🌱 Em ritmo";
  if (level >= 5) return "🌿 Iniciado";
  return "🍃 Começando";
}

/** Quantos pontos pra alcançar level N (curva quadrática). */
export function pointsForLevel(level: number): number {
  // Inverso da fórmula no DB trigger
  // level = floor((sqrt(8*points/100 + 1) - 1) / 2) + 1
  // → points = (level - 1) * level / 2 * 100
  return Math.floor((level - 1) * level * 50);
}
