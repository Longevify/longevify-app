import {
  getMyHealthPoints,
  getMyFriends,
  getRanking,
  getSocialFeed,
  getMySocialPrivacy,
  getMyLocation,
  getMyIncomingInvites,
  getMyOutgoingInvites,
  getMyOwnPosts,
  getDailyXpEarned,
  getDailyXpHistory,
  DEFAULT_DAILY_XP_GOAL,
} from "@/lib/social/server";
import { getRecentUserAchievements } from "@/lib/fitness/achievements";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import {
  getStreakDays,
  getTaskCompletionsHistory,
} from "@/lib/protocolo/streak";
import { SocialClient } from "./social-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Aba Social — Lucas (2026-05-23):
 *   - Postagens de corridas + achievements
 *   - Ranking entre amigos + rankings públicos (cidade/estado/país)
 *   - Sistema de pontos com níveis
 *   - Privacy consent explícito pra rankings públicos
 *   - Adicionar amigo via busca por nome + link de convite
 *   - Aba Perfil mostra achievements + posts próprios + breakdown
 */
export default async function SocialPage() {
  const { userId } = await getUserIdFromCookie();
  const [
    points,
    friends,
    friendsRanking,
    feed,
    privacy,
    location,
    incomingInvites,
    outgoingInvites,
    myPosts,
    myAchievements,
    xpToday,
    xpHistory,
    streakDays,
    completionsToday,
  ] = await Promise.all([
    getMyHealthPoints(),
    getMyFriends(),
    getRanking("friends", 50),
    getSocialFeed(30),
    getMySocialPrivacy(),
    getMyLocation(),
    getMyIncomingInvites(),
    getMyOutgoingInvites(),
    getMyOwnPosts(30),
    getRecentUserAchievements(50),
    getDailyXpEarned(),
    getDailyXpHistory(84), // 12 semanas
    userId ? getStreakDays(userId) : Promise.resolve(0),
    userId
      ? getTaskCompletionsHistory(userId, 1)
      : Promise.resolve([] as Array<{ date: string; count: number }>),
  ]);

  // "Completed today" = qualquer task de protocolo marcada hoje
  const today = new Date().toISOString().slice(0, 10);
  const completedToday = (completionsToday ?? []).some(
    (r) => r.date === today && r.count > 0,
  );

  return (
    <SocialClient
      points={points}
      friends={friends}
      friendsRanking={friendsRanking}
      feed={feed}
      privacy={privacy}
      location={location}
      incomingInvites={incomingInvites}
      outgoingInvites={outgoingInvites}
      myUserId={userId ?? null}
      myPosts={myPosts}
      myAchievements={myAchievements}
      xpToday={xpToday}
      xpGoal={DEFAULT_DAILY_XP_GOAL}
      xpHistory={xpHistory}
      streakDays={streakDays}
      completedToday={completedToday}
    />
  );
}
