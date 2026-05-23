import {
  getMyHealthPoints,
  getMyFriends,
  getRanking,
  getSocialFeed,
  getMySocialPrivacy,
  getMyLocation,
} from "@/lib/social/server";
import { SocialClient } from "./social-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Aba Social — Lucas (2026-05-23):
 *   - Postagens de corridas + achievements
 *   - Ranking entre amigos + rankings públicos (cidade/estado/país)
 *   - Sistema de pontos com níveis
 *   - Privacy consent explícito pra rankings públicos
 */
export default async function SocialPage() {
  const [points, friends, friendsRanking, feed, privacy, location] =
    await Promise.all([
      getMyHealthPoints(),
      getMyFriends(),
      getRanking("friends", 50),
      getSocialFeed(30),
      getMySocialPrivacy(),
      getMyLocation(),
    ]);

  return (
    <SocialClient
      points={points}
      friends={friends}
      friendsRanking={friendsRanking}
      feed={feed}
      privacy={privacy}
      location={location}
    />
  );
}
