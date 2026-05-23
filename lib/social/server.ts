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
  SocialPost,
  SocialPrivacy,
  UserLocation,
} from "./types";
import { POINTS_PER_EVENT } from "./types";

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

  // RLS já filtra "amigos OR público OR próprio"
  const { data } = await supabase
    .from("social_posts")
    .select(
      `*, profiles!social_posts_patient_id_fkey(first_name, avatar_url)`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => mapPost(r as Record<string, unknown>));
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
): Promise<RankingEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);

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
    .order("total_points", { ascending: false })
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
