import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import type {
  HealthPoints,
  HealthPointEvent,
  PointEventKind,
  RankingEntry,
  RankingScope,
  RankingKind,
  SocialPost,
  SocialPrivacy,
  UserLocation,
} from "./types";
import { POINTS_PER_EVENT, RANKING_KIND_COLUMN } from "./types";

/**
 * Server helpers da feature social.
 */

// ─── Health points ────────────────────────────────────────────────────

export async function getMyHealthPoints(): Promise<HealthPoints | null> {
  if (!isSupabaseConfigured()) return null;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return null;
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data } = await supabase
    .from("user_health_points")
    .select("*")
    .eq("patient_id", userId)
    .maybeSingle();
  if (!data) {
    // Cria row default se ainda não existe
    await supabase
      .from("user_health_points")
      .upsert({ patient_id: userId, total_points: 0, level: 1 });
    return {
      patientId: userId,
      totalPoints: 0,
      level: 1,
      fitnessPoints: 0,
      nutritionPoints: 0,
      consistencyPoints: 0,
      biomarkerPoints: 0,
      socialPoints: 0,
      updatedAt: new Date().toISOString(),
    };
  }
  return mapHealthPoints(data as Record<string, unknown>);
}

function mapHealthPoints(r: Record<string, unknown>): HealthPoints {
  return {
    patientId: r.patient_id as string,
    totalPoints: (r.total_points as number) ?? 0,
    level: (r.level as number) ?? 1,
    fitnessPoints: (r.fitness_points as number) ?? 0,
    nutritionPoints: (r.nutrition_points as number) ?? 0,
    consistencyPoints: (r.consistency_points as number) ?? 0,
    biomarkerPoints: (r.biomarker_points as number) ?? 0,
    socialPoints: (r.social_points as number) ?? 0,
    updatedAt: r.updated_at as string,
  };
}

export async function getMyRecentPointEvents(
  limit = 20,
): Promise<HealthPointEvent[]> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data } = await supabase
    .from("health_point_events")
    .select("*")
    .eq("patient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    patientId: r.patient_id as string,
    kind: r.kind as PointEventKind,
    points: r.points as number,
    context: (r.context as Record<string, unknown>) ?? null,
    createdAt: r.created_at as string,
  }));
}

// ─── Daily XP / Streak (Duolingo-style) ──────────────────────────────

/** XP que o user ganhou em uma data específica (YYYY-MM-DD). */
export async function getDailyXpEarned(date?: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return 0;
  const supabase = await createSupabaseWithJwt(accessToken);

  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  // health_point_events.created_at é timestamptz — filtra pelo range do dia
  // (UTC; pra simplificar — patient_id é único, eventos não sobrepõem dias)
  const start = `${targetDate}T00:00:00Z`;
  const end = `${targetDate}T23:59:59Z`;
  const { data } = await supabase
    .from("health_point_events")
    .select("points")
    .eq("patient_id", userId)
    .gte("created_at", start)
    .lte("created_at", end);
  if (!data) return 0;
  return data.reduce((s, r) => s + ((r.points as number) ?? 0), 0);
}

/**
 * Histórico de XP diário pros últimos N dias. Retorna array em ordem
 * cronológica (antigo → hoje) com 0 nos dias sem eventos pra alimentar
 * heatmap contínuo.
 */
export async function getDailyXpHistory(
  days = 30,
): Promise<Array<{ date: string; xp: number }>> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("health_point_events")
    .select("points, created_at")
    .eq("patient_id", userId)
    .gte("created_at", `${cutoffStr}T00:00:00Z`)
    .order("created_at", { ascending: true });

  const byDate = new Map<string, number>();
  for (const r of data ?? []) {
    const d = (r.created_at as string).slice(0, 10);
    byDate.set(d, (byDate.get(d) ?? 0) + ((r.points as number) ?? 0));
  }

  // Constrói array contínuo (todos os dias, mesmo zerados)
  const out: Array<{ date: string; xp: number }> = [];
  for (let i = 0; i <= days; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (days - i));
    const dStr = d.toISOString().slice(0, 10);
    out.push({ date: dStr, xp: byDate.get(dStr) ?? 0 });
  }
  return out;
}

/**
 * Meta diária de XP (Duolingo-style). Default 50 XP/dia — equivalente a
 * 1 treino logado + 1 refeição + 1 task de protocolo + 1 sleep on-target.
 *
 * TODO: persistir em user_xp_goals quando user customizar.
 */
export const DEFAULT_DAILY_XP_GOAL = 50;

// ─── Friend streaks (Snapchat/Duolingo-style) ────────────────────────

/**
 * Lucas (2026-05-24): "crie um sistema de foguinho, no qual se você e
 * seu amigo todo dia fazem exercícios, e se vocês tiverem se
 * comprometido a fazer esse game, o foguinho cresce, igual ao snapshat
 * e igual ao duolingo."
 *
 * Compute on read: pra cada amigo, calcula dias consecutivos onde AMBOS
 * marcaram pelo menos 1 task de protocolo. Algoritmo:
 *   1. Lê task_completions de mim + cada amigo (últimos 60 dias)
 *   2. Pra cada amigo, faz interseção de datas (dias onde nós dois
 *      temos pelo menos 1 task)
 *   3. Conta dias consecutivos a partir de hoje (ou ontem se grace)
 *
 * Dep: requer policy "tc read friends" na task_completions (migration
 * 0020_friend_streaks.sql) — sem ela, retorna 0 dias pra todos os
 * amigos (degrada gracefully).
 */
export interface FriendStreak {
  friendId: string;
  currentDays: number;
  /** Última data onde ambos tiveram task. Null se nunca. */
  lastSharedDate: string | null;
  /** Se streak está em risco hoje (um dos dois ainda não fez). */
  atRisk: boolean;
}

export async function getFriendStreaks(
  friendIds: string[],
): Promise<Map<string, FriendStreak>> {
  const out = new Map<string, FriendStreak>();
  if (!isSupabaseConfigured() || friendIds.length === 0) return out;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return out;
  const supabase = await createSupabaseWithJwt(accessToken);

  // Pega últimos 60 dias de task_completions pra mim + amigos. Uma query
  // só (mais eficiente). RLS faz o filtro de quem pode ler.
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 60);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const allIds = [userId, ...friendIds];

  const { data, error } = await supabase
    .from("task_completions")
    .select("patient_id, completed_date")
    .in("patient_id", allIds)
    .gte("completed_date", cutoffStr);

  if (error || !data) return out;

  // Indexa: patient_id → Set<date>
  const byPatient = new Map<string, Set<string>>();
  for (const row of data) {
    const pid = row.patient_id as string;
    const d = row.completed_date as string;
    let set = byPatient.get(pid);
    if (!set) {
      set = new Set();
      byPatient.set(pid, set);
    }
    set.add(d);
  }

  const myDates = byPatient.get(userId) ?? new Set();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Pra cada amigo, computa shared streak
  for (const friendId of friendIds) {
    const friendDates = byPatient.get(friendId) ?? new Set();
    // Datas onde ambos têm task
    const shared = new Set<string>();
    for (const d of myDates) {
      if (friendDates.has(d)) shared.add(d);
    }
    if (shared.size === 0) {
      out.set(friendId, {
        friendId,
        currentDays: 0,
        lastSharedDate: null,
        atRisk: false,
      });
      continue;
    }

    // Encontra streak começando hoje (ou ontem se grace)
    const startFromToday = shared.has(today);
    const startFromYesterday = !startFromToday && shared.has(yesterdayStr);

    let currentDays = 0;
    if (startFromToday || startFromYesterday) {
      const start = new Date();
      if (startFromYesterday) {
        start.setUTCDate(start.getUTCDate() - 1);
      }
      for (let i = 0; i < 60; i++) {
        const d = new Date(start);
        d.setUTCDate(d.getUTCDate() - i);
        const dStr = d.toISOString().slice(0, 10);
        if (shared.has(dStr)) currentDays++;
        else break;
      }
    }

    // Lista shared ordenada decrescente pra pegar última
    const sortedShared = [...shared].sort().reverse();
    out.set(friendId, {
      friendId,
      currentDays,
      lastSharedDate: sortedShared[0] ?? null,
      atRisk:
        startFromYesterday ||
        (currentDays > 0 && !startFromToday),
    });
  }

  return out;
}

// ─── Location ─────────────────────────────────────────────────────────

export async function getMyLocation(): Promise<UserLocation | null> {
  if (!isSupabaseConfigured()) return null;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return null;
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data } = await supabase
    .from("user_location")
    .select("*")
    .eq("patient_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    patientId: data.patient_id as string,
    city: (data.city as string | null) ?? null,
    state: (data.state as string | null) ?? null,
    country: (data.country as string) ?? "BR",
  };
}

// ─── Privacy ──────────────────────────────────────────────────────────

export async function getMySocialPrivacy(): Promise<SocialPrivacy | null> {
  if (!isSupabaseConfigured()) return null;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return null;
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data } = await supabase
    .from("user_social_privacy")
    .select("*")
    .eq("patient_id", userId)
    .maybeSingle();
  if (!data) {
    return {
      patientId: userId,
      showInFriendFeed: false,
      showInFriendRanking: true,
      showInCityRanking: false,
      showInStateRanking: false,
      showInCountryRanking: false,
      consentedAt: null,
      consentVersion: null,
    };
  }
  return {
    patientId: data.patient_id as string,
    showInFriendFeed: Boolean(data.show_in_friend_feed),
    showInFriendRanking: Boolean(data.show_in_friend_ranking),
    showInCityRanking: Boolean(data.show_in_city_ranking),
    showInStateRanking: Boolean(data.show_in_state_ranking),
    showInCountryRanking: Boolean(data.show_in_country_ranking),
    consentedAt: (data.consented_at as string | null) ?? null,
    consentVersion: (data.consent_version as string | null) ?? null,
  };
}

// ─── Friends ──────────────────────────────────────────────────────────

export interface FriendSummary {
  patientId: string;
  firstName: string;
  level: number;
  totalPoints: number;
  city?: string | null;
  state?: string | null;
}

export async function getMyFriends(): Promise<FriendSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data } = await supabase
    .from("social_friendships")
    .select(
      `friend_id,
       profiles!social_friendships_friend_id_fkey(id, first_name),
       user_health_points!user_health_points_patient_id_fkey(total_points, level),
       user_location!user_location_patient_id_fkey(city, state)`,
    )
    .eq("patient_id", userId)
    .eq("status", "active");

  return (data ?? []).map((r) => {
    const prof = (r as { profiles?: { first_name?: string } }).profiles;
    const points = (r as {
      user_health_points?: { total_points?: number; level?: number };
    }).user_health_points;
    const loc = (r as {
      user_location?: { city?: string; state?: string };
    }).user_location;
    return {
      patientId: r.friend_id as string,
      firstName: prof?.first_name ?? "Anônimo",
      level: points?.level ?? 1,
      totalPoints: points?.total_points ?? 0,
      city: loc?.city ?? null,
      state: loc?.state ?? null,
    };
  });
}

// ─── Friend invites ───────────────────────────────────────────────────

export interface FriendInvite {
  id: string;
  inviterId: string;
  inviteeId: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  // Outro lado da relação (resolvido pra UI)
  otherFirstName: string;
  otherLevel: number;
  otherTotalPoints: number;
}

/** Convites pendentes que EU recebi (sou invitee). */
export async function getMyIncomingInvites(): Promise<FriendInvite[]> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data } = await supabase
    .from("social_friend_invites")
    .select(
      `id, inviter_id, invitee_id, status, message, created_at, responded_at,
       inviter:profiles!social_friend_invites_inviter_id_fkey(first_name),
       inviter_points:user_health_points!user_health_points_patient_id_fkey(total_points, level)`,
    )
    .eq("invitee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const inviter = (row.inviter as { first_name?: string }) ?? {};
    const points = (row.inviter_points as {
      total_points?: number;
      level?: number;
    }) ?? {};
    return {
      id: row.id as string,
      inviterId: row.inviter_id as string,
      inviteeId: row.invitee_id as string,
      status: row.status as FriendInvite["status"],
      message: (row.message as string | null) ?? null,
      createdAt: row.created_at as string,
      respondedAt: (row.responded_at as string | null) ?? null,
      otherFirstName: inviter.first_name ?? "Alguém",
      otherLevel: points.level ?? 1,
      otherTotalPoints: points.total_points ?? 0,
    };
  });
}

/** Convites pendentes que EU enviei (sou inviter). */
export async function getMyOutgoingInvites(): Promise<FriendInvite[]> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data } = await supabase
    .from("social_friend_invites")
    .select(
      `id, inviter_id, invitee_id, status, message, created_at, responded_at,
       invitee:profiles!social_friend_invites_invitee_id_fkey(first_name),
       invitee_points:user_health_points!user_health_points_patient_id_fkey(total_points, level)`,
    )
    .eq("inviter_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const invitee = (row.invitee as { first_name?: string }) ?? {};
    const points = (row.invitee_points as {
      total_points?: number;
      level?: number;
    }) ?? {};
    return {
      id: row.id as string,
      inviterId: row.inviter_id as string,
      inviteeId: row.invitee_id as string,
      status: row.status as FriendInvite["status"],
      message: (row.message as string | null) ?? null,
      createdAt: row.created_at as string,
      respondedAt: (row.responded_at as string | null) ?? null,
      otherFirstName: invitee.first_name ?? "Alguém",
      otherLevel: points.level ?? 1,
      otherTotalPoints: points.total_points ?? 0,
    };
  });
}

/** Resolve um único profile por ID (pra página de aceite por link). */
export async function getProfileById(
  profileId: string,
): Promise<{ firstName: string; level: number; totalPoints: number } | null> {
  if (!isSupabaseConfigured()) return null;
  const { accessToken } = await getUserIdFromCookie();
  if (!accessToken) return null;
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data } = await supabase
    .from("profiles")
    .select(
      `id, first_name,
       user_health_points!user_health_points_patient_id_fkey(total_points, level)`,
    )
    .eq("id", profileId)
    .maybeSingle();
  if (!data) return null;
  const points = (data as {
    user_health_points?: { total_points?: number; level?: number };
  }).user_health_points;
  return {
    firstName: (data.first_name as string | null) ?? "Anônimo",
    level: points?.level ?? 1,
    totalPoints: points?.total_points ?? 0,
  };
}

// ─── Posts ────────────────────────────────────────────────────────────

export async function getSocialFeed(limit = 20): Promise<SocialPost[]> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);

  // RLS já filtra "amigos OR público OR próprio". Filtra stories no
  // client porque stories vão na bandeja do topo, não no feed central.
  const { data } = await supabase
    .from("social_posts")
    .select(
      `*, profiles!social_posts_patient_id_fkey(first_name, avatar_url)`,
    )
    .neq("kind", "story")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => mapPost(r as Record<string, unknown>));
}

/**
 * Lucas (2026-05-24): "As posições e o jeito que o social vai funcionar
 * vai ser exatamente igual ao insta, no topo aparecem os stories."
 *
 * Stories ativos = kind='story' E payload.expiresAt > now(). RLS já
 * filtra visibilidade (amigos + público + próprio).
 */
export interface StoryItem {
  id: string;
  patientId: string;
  firstName: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
  expiresAt: string;
  isMine: boolean;
}

export async function getActiveStories(): Promise<StoryItem[]> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);

  const nowIso = new Date().toISOString();
  // Filtro do payload.expiresAt > now via expressão jsonb. Postgres parse
  // ISO timestamp dentro do jsonb via cast text → timestamptz.
  const { data } = await supabase
    .from("social_posts")
    .select(
      `id, patient_id, payload, created_at,
       profiles!social_posts_patient_id_fkey(first_name)`,
    )
    .eq("kind", "story")
    .gt("payload->>expiresAt", nowIso)
    .order("created_at", { ascending: false });

  if (!data) return [];

  return data
    .map((r): StoryItem | null => {
      const row = r as Record<string, unknown>;
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      const imageUrl = payload.imageUrl as string | undefined;
      if (!imageUrl) return null; // story sem foto não conta
      const prof = (row.profiles as { first_name?: string }) ?? {};
      return {
        id: row.id as string,
        patientId: row.patient_id as string,
        firstName: prof.first_name ?? "Anônimo",
        imageUrl,
        caption: (payload.body as string | null) ?? null,
        createdAt: row.created_at as string,
        expiresAt: payload.expiresAt as string,
        isMine: (row.patient_id as string) === userId,
      };
    })
    .filter((s): s is StoryItem => s !== null);
}

/** Verifica se eu tenho um story ativo (pra render avatar do user na bar). */
export async function getMyActiveStory(): Promise<StoryItem | null> {
  const stories = await getActiveStories();
  return stories.find((s) => s.isMine) ?? null;
}

/**
 * Posts CRIADOS PELO user atual — histórico próprio. Alimenta a aba
 * Perfil (Lucas 2026-05-23: "na aba social na aba perfil não tem nada.
 * Não tem os achievements, não tem os posts feitos, etc.").
 */
export async function getMyOwnPosts(limit = 30): Promise<SocialPost[]> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data } = await supabase
    .from("social_posts")
    .select(
      `*, profiles!social_posts_patient_id_fkey(first_name, avatar_url)`,
    )
    .eq("patient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => mapPost(r as Record<string, unknown>));
}

function mapPost(r: Record<string, unknown>): SocialPost {
  const prof = (r.profiles as { first_name?: string; avatar_url?: string }) ??
    {};
  return {
    id: r.id as string,
    patientId: r.patient_id as string,
    kind: r.kind as SocialPost["kind"],
    payload: (r.payload as SocialPost["payload"]) ?? { title: "" },
    visibility: (r.visibility as "friends" | "public") ?? "friends",
    likesCount: (r.likes_count as number) ?? 0,
    commentsCount: (r.comments_count as number) ?? 0,
    createdAt: r.created_at as string,
    authorFirstName: prof.first_name ?? "Anônimo",
    authorAvatarUrl: prof.avatar_url ?? null,
  };
}

// ─── Rankings ─────────────────────────────────────────────────────────

/**
 * Top users por pontos no scope. Filtra via user_social_privacy.
 *
 * Friends: top entre social_friendships do user (com show_in_friend_ranking)
 * City/State/Country: top no escopo geográfico (com show_in_X_ranking)
 *
 * Cada entry inclui rank, points, level e métricas comparativas do mês.
 */
export async function getRanking(
  scope: RankingScope,
  limit = 50,
  kind: RankingKind = "overall",
): Promise<RankingEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);
  const sortColumn = RANKING_KIND_COLUMN[kind] ?? "total_points";

  // Pega scope geográfico do user atual pra filtrar city/state
  let myCity: string | null = null;
  let myState: string | null = null;
  if (scope === "city" || scope === "state") {
    const { data: loc } = await supabase
      .from("user_location")
      .select("city, state")
      .eq("patient_id", userId)
      .maybeSingle();
    myCity = (loc?.city as string | null) ?? null;
    myState = (loc?.state as string | null) ?? null;
    if (scope === "city" && !myCity) return [];
    if (scope === "state" && !myState) return [];
  }

  // Friends: ids de amigos + eu
  let friendIds: string[] = [userId];
  if (scope === "friends") {
    const { data } = await supabase
      .from("social_friendships")
      .select("friend_id")
      .eq("patient_id", userId)
      .eq("status", "active");
    friendIds = [userId, ...((data ?? []).map((r) => r.friend_id as string))];
  }

  // Constrói query base
  let q = supabase
    .from("user_health_points")
    .select(
      `*, profiles!user_health_points_patient_id_fkey(first_name),
       user_location!user_location_patient_id_fkey(city, state),
       user_social_privacy!user_social_privacy_patient_id_fkey(show_in_friend_ranking, show_in_city_ranking, show_in_state_ranking, show_in_country_ranking)`,
    )
    .order(sortColumn, { ascending: false })
    .limit(limit);

  if (scope === "friends") {
    q = q.in("patient_id", friendIds);
  }

  const { data } = await q;
  if (!data) return [];

  // Filtra por privacy do escopo + geografia
  const filtered = (data as Array<Record<string, unknown>>).filter((r) => {
    const privacy = r.user_social_privacy as
      | {
          show_in_friend_ranking?: boolean;
          show_in_city_ranking?: boolean;
          show_in_state_ranking?: boolean;
          show_in_country_ranking?: boolean;
        }
      | null
      | undefined;
    const isMe = (r.patient_id as string) === userId;
    if (isMe) return true; // sempre mostra a si mesmo

    const loc = r.user_location as { city?: string; state?: string } | null;
    if (scope === "friends") return privacy?.show_in_friend_ranking !== false;
    if (scope === "city")
      return privacy?.show_in_city_ranking === true && loc?.city === myCity;
    if (scope === "state")
      return privacy?.show_in_state_ranking === true && loc?.state === myState;
    if (scope === "country")
      return privacy?.show_in_country_ranking === true;
    return false;
  });

  return filtered.map((r, idx) => {
    const prof = (r.profiles as { first_name?: string }) ?? {};
    const loc = (r.user_location as { city?: string; state?: string }) ?? {};
    return {
      patientId: r.patient_id as string,
      rank: idx + 1,
      totalPoints: (r.total_points as number) ?? 0,
      level: (r.level as number) ?? 1,
      firstName: prof.first_name ?? "Anônimo",
      city: loc.city ?? null,
      state: loc.state ?? null,
      isCurrentUser: (r.patient_id as string) === userId,
      nichePoints:
        kind === "overall"
          ? undefined
          : ((r as Record<string, unknown>)[sortColumn] as number) ?? 0,
    };
  });
}

// ─── Award points helper (server action friendly) ────────────────────

/**
 * Adiciona pontos pro user atual e cria event log.
 * Idempotente NÃO — caller deve garantir que não duplica.
 */
export async function awardPoints(
  kind: PointEventKind,
  context?: Record<string, unknown>,
  pointsOverride?: number,
): Promise<{ ok: boolean; pointsAdded?: number; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "supabase-off" };
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return { ok: false, error: "no-auth" };
  const points = pointsOverride ?? POINTS_PER_EVENT[kind];
  if (!points || points <= 0) return { ok: true, pointsAdded: 0 };

  const supabase = await createSupabaseWithJwt(accessToken);

  // Insere evento
  const { error: evErr } = await supabase.from("health_point_events").insert({
    patient_id: userId,
    kind,
    points,
    context: context ?? null,
  });
  if (evErr) return { ok: false, error: evErr.message };

  // Atualiza total via SQL inline (incremento atômico)
  const { data: current } = await supabase
    .from("user_health_points")
    .select("total_points")
    .eq("patient_id", userId)
    .maybeSingle();

  const newTotal = ((current?.total_points as number) ?? 0) + points;

  // Atribuir categoria via kind
  const categoryKey =
    kind === "workout_logged" || kind === "running_logged"
      ? "fitness_points"
      : kind === "meal_logged"
        ? "nutrition_points"
        : kind === "biomarker_improved"
          ? "biomarker_points"
          : kind === "social_post" || kind === "friend_added"
            ? "social_points"
            : "consistency_points";

  const { data: row } = await supabase
    .from("user_health_points")
    .select(categoryKey)
    .eq("patient_id", userId)
    .maybeSingle();

  // Cast pra Record genérico pra contornar union type estreito do Supabase
  // (que tipa `select(stringLiteral)` como union de objetos com 1 key cada).
  const rowAny = row as Record<string, unknown> | null;
  const curCat = (rowAny?.[categoryKey] as number | undefined) ?? 0;

  const updatePayload: Record<string, number> = {
    total_points: newTotal,
    [categoryKey]: curCat + points,
  };

  await supabase
    .from("user_health_points")
    .upsert({ patient_id: userId, ...updatePayload });

  return { ok: true, pointsAdded: points };
}
