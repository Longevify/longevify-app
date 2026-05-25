"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Users,
  Globe,
  Plus,
  Heart,
  MessageCircle,
  Share2,
  MapPin,
  Sparkles,
  Lock,
  Settings,
  Footprints,
  Dumbbell,
  Zap,
  Crown,
  Medal,
  ChevronRight,
  PencilLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type HealthPoints,
  type SocialPost,
  type SocialPrivacy,
  type UserLocation,
  type RankingEntry,
  type RankingScope,
  type RankingKind,
  type SocialPostKind,
  RANKING_SCOPE_LABEL,
  RANKING_KIND_LABEL,
  levelTitle,
  pointsForLevel,
} from "@/lib/social/types";
import type {
  FriendSummary,
  FriendInvite,
  StoryItem,
} from "@/lib/social/server";
import type { UserAchievement } from "@/lib/fitness/types";
import { PrivacyConsentModal } from "./privacy-consent-modal";
import { AddFriendSheet } from "./add-friend-sheet";
import {
  respondToInviteAction,
  cancelInviteAction,
} from "./actions";
import { StreakHero } from "@/components/social/streak-hero";
import { XpDailyGoal } from "@/components/social/xp-daily-goal";
import { ActivityHeatmap } from "@/components/social/activity-heatmap";
import { FriendStreakBadge } from "@/components/social/friend-streak-badge";
import { PostComposerModal } from "@/components/social/post-composer-modal";
import { StoriesBar } from "@/components/social/stories-bar";

/**
 * Cliente da aba Social — 4 tabs:
 *  1. Feed — runs/achievements de amigos
 *  2. Ranking — entre amigos / cidade / estado / nacional
 *  3. Amigos — lista + convidar
 *  4. Perfil — meus pontos / level / breakdown
 *
 * Cuidado privacidade: rankings public exigem consent explícito via
 * PrivacyConsentModal. Default: opt-in só em "friends".
 */

interface SocialClientProps {
  points: HealthPoints | null;
  friends: FriendSummary[];
  friendsRanking: RankingEntry[];
  feed: SocialPost[];
  privacy: SocialPrivacy | null;
  location: UserLocation | null;
  incomingInvites: FriendInvite[];
  outgoingInvites: FriendInvite[];
  myUserId: string | null;
  myPosts: SocialPost[];
  myAchievements: UserAchievement[];
  /** Lucas (2026-05-24): foundation Duolingo */
  xpToday: number;
  xpGoal: number;
  xpHistory: Array<{ date: string; xp: number }>;
  streakDays: number;
  completedToday: boolean;
  /** Lucas (2026-05-24): foguinho compartilhado por amigo */
  friendStreaks: Record<string, { currentDays: number; atRisk: boolean }>;
  /** Lucas (2026-05-24): stories Insta-style no topo do feed */
  activeStories: StoryItem[];
  myFirstName: string;
}

type Tab = "feed" | "ranking" | "friends" | "me";

export function SocialClient({
  points,
  friends,
  friendsRanking,
  feed,
  privacy,
  location,
  incomingInvites,
  outgoingInvites,
  myUserId,
  myPosts,
  myAchievements,
  xpToday,
  xpGoal,
  xpHistory,
  streakDays,
  completedToday,
  friendStreaks,
  activeStories,
  myFirstName,
}: SocialClientProps) {
  const [tab, setTab] = useState<Tab>("feed");
  const [rankingScope, setRankingScope] = useState<RankingScope>("friends");
  const [rankingKind, setRankingKind] = useState<RankingKind>("overall");
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [requestedScope, setRequestedScope] = useState<RankingScope | null>(
    null,
  );

  // Fetch ranking on-demand quando troca scope OU kind (lazy via API client)
  const [scopedRanking, setScopedRanking] =
    useState<RankingEntry[]>(friendsRanking);
  const [loadingRanking, setLoadingRanking] = useState(false);

  const fetchRanking = async (scope: RankingScope, kind: RankingKind) => {
    setLoadingRanking(true);
    try {
      const res = await fetch(
        `/api/social/ranking?scope=${scope}&kind=${kind}`,
      );
      const data = (await res.json()) as { ranking?: RankingEntry[] };
      setScopedRanking(data.ranking ?? []);
    } catch {
      setScopedRanking([]);
    } finally {
      setLoadingRanking(false);
    }
  };

  const switchScope = async (scope: RankingScope) => {
    setRankingScope(scope);
    // Pra escopos públicos, exige consent
    if (scope !== "friends") {
      const optedIn =
        scope === "city"
          ? privacy?.showInCityRanking
          : scope === "state"
            ? privacy?.showInStateRanking
            : privacy?.showInCountryRanking;
      if (!optedIn) {
        setRequestedScope(scope);
        setConsentModalOpen(true);
        return;
      }
    }
    await fetchRanking(scope, rankingKind);
  };

  const switchKind = async (kind: RankingKind) => {
    setRankingKind(kind);
    await fetchRanking(rankingScope, kind);
  };

  return (
    <div className="mx-auto w-full max-w-[920px] px-4 py-6 sm:px-6 sm:py-10">
      <header className="pb-2">
        <span className="text-[13px] text-muted">Comunidade Longevify</span>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-[28px] leading-[1.1] font-semibold tracking-tight sm:text-[34px]">
            Social
          </h1>
          <Link
            href="/social/chats"
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-200"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Conversas
          </Link>
        </div>
      </header>

      {/* User hero — points + level */}
      {points && <PointsHero points={points} />}

      {/* Tabs */}
      <nav className="sticky top-3 z-10 mt-5 mb-5 rounded-2xl border border-border bg-white/95 p-1.5 shadow-[0_4px_18px_-12px_rgba(13,40,24,.12)] backdrop-blur">
        <ul className="grid grid-cols-4 gap-1">
          <TabBtn label="Feed" Icon={Heart} active={tab === "feed"} onClick={() => setTab("feed")} />
          <TabBtn label="Ranking" Icon={Trophy} active={tab === "ranking"} onClick={() => setTab("ranking")} />
          <TabBtn label="Amigos" Icon={Users} active={tab === "friends"} onClick={() => setTab("friends")} />
          <TabBtn label="Perfil" Icon={Sparkles} active={tab === "me"} onClick={() => setTab("me")} />
        </ul>
      </nav>

      {/* Content por tab */}
      {tab === "feed" && (
        <FeedView
          feed={feed}
          activeStories={activeStories}
          myFirstName={myFirstName}
        />
      )}
      {tab === "ranking" && (
        <RankingView
          scope={rankingScope}
          kind={rankingKind}
          ranking={scopedRanking}
          loading={loadingRanking}
          onSwitch={switchScope}
          onSwitchKind={switchKind}
          location={location}
        />
      )}
      {tab === "friends" && (
        <FriendsView
          friends={friends}
          incomingInvites={incomingInvites}
          outgoingInvites={outgoingInvites}
          myUserId={myUserId}
          friendStreaks={friendStreaks}
        />
      )}
      {tab === "me" && points && (
        <ProfileView
          points={points}
          myPosts={myPosts}
          myAchievements={myAchievements}
          xpToday={xpToday}
          xpGoal={xpGoal}
          xpHistory={xpHistory}
          streakDays={streakDays}
          completedToday={completedToday}
          myFirstName={myFirstName}
          friendsCount={friends.length}
        />
      )}

      {/* Privacy modal */}
      {consentModalOpen && requestedScope && (
        <PrivacyConsentModal
          scope={requestedScope}
          onClose={() => {
            setConsentModalOpen(false);
            setRequestedScope(null);
          }}
          onConsented={async () => {
            setConsentModalOpen(false);
            await fetchRanking(requestedScope, rankingKind);
            setRequestedScope(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────

function TabBtn({
  label,
  Icon,
  active,
  onClick,
}: {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex w-full items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[12px] font-semibold transition-colors sm:px-3 sm:text-[13px]",
          active
            ? "bg-brand-700 text-white shadow-sm"
            : "text-zinc-600 hover:bg-zinc-50",
        )}
      >
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    </li>
  );
}

function PointsHero({ points }: { points: HealthPoints }) {
  const nextLevelPoints = pointsForLevel(points.level + 1);
  const currentLevelPoints = pointsForLevel(points.level);
  const progressInLevel = points.totalPoints - currentLevelPoints;
  const levelRange = nextLevelPoints - currentLevelPoints;
  const pct = Math.min(100, Math.round((progressInLevel / levelRange) * 100));

  return (
    <section className="overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 text-white shadow-md">
      <div className="px-5 py-5">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
            <Trophy className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/70">
              Level {points.level} · {levelTitle(points.level)}
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">
                {points.totalPoints.toLocaleString("pt-BR")}
              </span>
              <span className="text-[12px] font-medium text-white/70">pontos</span>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10.5px] tabular-nums text-white/70">
            {nextLevelPoints - points.totalPoints} pts pro Level {points.level + 1}
          </p>
        </div>
      </div>
    </section>
  );
}

function FeedView({
  feed,
  activeStories,
  myFirstName,
}: {
  feed: SocialPost[];
  activeStories: StoryItem[];
  myFirstName: string;
}) {
  // Lucas (2026-05-24): layout exatamente como Insta — stories bar no
  // topo (com + sobreposto pra criar), feed central, botão + flutuante
  // pra postar foto no feed.
  const [composerMode, setComposerMode] = useState<"post" | "story" | null>(
    null,
  );

  const hasMyStory = activeStories.some((s) => s.isMine);

  return (
    <>
      {/* Stories bar — topo do feed */}
      <StoriesBar
        stories={activeStories}
        myFirstName={myFirstName}
        hasMyStory={hasMyStory}
        onCreateStory={() => setComposerMode("story")}
      />

      {/* Feed cards */}
      {feed.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-8 w-8 text-zinc-300" />}
          title="Nada no feed ainda"
          body="Adicione amigos e veja as conquistas deles aparecerem aqui."
        />
      ) : (
        <ul className="flex flex-col gap-3 pb-24">
          {feed.map((post) => (
            <li key={post.id}>
              <FeedPostCard post={post} />
            </li>
          ))}
        </ul>
      )}

      {/* FAB pra postar foto no feed — Lucas: "+ abaixo é para postar
          foto no feed". Fica fixo bottom-right, ícone + grande sem
          texto. */}
      <button
        type="button"
        onClick={() => setComposerMode("post")}
        aria-label="Publicar foto no feed"
        className="fixed bottom-6 right-6 z-30 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-brand-700 to-brand-800 text-white shadow-[0_8px_24px_-4px_rgba(31,93,63,0.5)] transition active:scale-95 hover:shadow-[0_12px_28px_-4px_rgba(31,93,63,0.6)]"
      >
        <PencilLine className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {composerMode && (
        <PostComposerModal
          open
          mode={composerMode}
          onClose={() => setComposerMode(null)}
          onPosted={() => {
            window.location.reload();
          }}
        />
      )}
    </>
  );
}

function FeedPostCard({ post }: { post: SocialPost }) {
  const KIND_META: Record<
    SocialPostKind,
    { Icon: typeof Heart; accent: string; label: string }
  > = {
    running: { Icon: Footprints, accent: "bg-orange-50 text-orange-700", label: "Corrida" },
    workout: { Icon: Dumbbell, accent: "bg-brand-50 text-brand-700", label: "Treino" },
    achievement: { Icon: Medal, accent: "bg-amber-50 text-amber-700", label: "Conquista" },
    level_up: { Icon: Crown, accent: "bg-purple-50 text-purple-700", label: "Level up" },
    biomarker: { Icon: Zap, accent: "bg-emerald-50 text-emerald-700", label: "Biomarker" },
    milestone: { Icon: Sparkles, accent: "bg-sky-50 text-sky-700", label: "Marco" },
    story: { Icon: Sparkles, accent: "bg-fuchsia-50 text-fuchsia-700", label: "Story" },
  };
  const meta = KIND_META[post.kind] ?? KIND_META.workout;
  const { Icon } = meta;

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 shadow-[0_2px_8px_-4px_rgba(13,40,24,.06)]">
      <header className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-[14px] font-semibold text-brand-700">
          {post.authorFirstName?.[0]?.toUpperCase() ?? "?"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-zinc-900">
            {post.authorFirstName}
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-zinc-500">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
                meta.accent,
              )}
            >
              <Icon className="h-2.5 w-2.5" />
              {meta.label}
            </span>
            <span>·</span>
            <span>{relativeTime(post.createdAt)}</span>
          </div>
        </div>
      </header>

      <div className="mt-3">
        {post.payload.title && post.payload.title !== "Compartilhou um momento" && (
          <h3 className="text-[14px] font-semibold text-zinc-900">
            {post.payload.title}
          </h3>
        )}
        {post.payload.body && (
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-700 whitespace-pre-wrap">
            {post.payload.body}
          </p>
        )}

        {/* Foto anexada (Lucas 2026-05-24: stories/fotos no feed) */}
        {post.payload.imageUrl && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.payload.imageUrl}
              alt={post.payload.title ?? "Foto do post"}
              className="block h-auto w-full max-h-[500px] object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Stats específicas por kind */}
        {post.kind === "running" && (
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] tabular-nums">
            {post.payload.distanceKm && (
              <span className="rounded-full bg-orange-50 px-2.5 py-1 font-semibold text-orange-800">
                🏃 {post.payload.distanceKm.toFixed(2)}km
              </span>
            )}
            {post.payload.paceSecondsPerKm && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700">
                ⏱ {fmtPace(post.payload.paceSecondsPerKm)}
              </span>
            )}
            {post.payload.durationSeconds && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700">
                {fmtDuration(post.payload.durationSeconds)}
              </span>
            )}
          </div>
        )}

        {post.kind === "achievement" && post.payload.achievementEmoji && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2">
            <span className="text-[24px]">{post.payload.achievementEmoji}</span>
            <span className="text-[12.5px] font-semibold text-amber-900">
              {post.payload.title}
            </span>
          </div>
        )}

        {post.kind === "level_up" && post.payload.level && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-purple-50 px-3 py-2 text-[12.5px] font-semibold text-purple-900">
            👑 Level {post.payload.level} desbloqueado
          </div>
        )}
      </div>

      <footer className="mt-3 flex items-center gap-3 border-t border-zinc-100 pt-2.5 text-[11.5px] text-zinc-500">
        <button type="button" className="inline-flex items-center gap-1 hover:text-rose-600">
          <Heart className="h-3.5 w-3.5" /> {post.likesCount || ""}
        </button>
        <button type="button" className="inline-flex items-center gap-1 hover:text-brand-700">
          <MessageCircle className="h-3.5 w-3.5" /> {post.commentsCount || ""}
        </button>
        <button type="button" className="ml-auto inline-flex items-center gap-1 hover:text-brand-700">
          <Share2 className="h-3.5 w-3.5" />
        </button>
      </footer>
    </article>
  );
}

function RankingView({
  scope,
  kind,
  ranking,
  loading,
  onSwitch,
  onSwitchKind,
  location,
}: {
  scope: RankingScope;
  kind: RankingKind;
  ranking: RankingEntry[];
  loading: boolean;
  onSwitch: (s: RankingScope) => void;
  onSwitchKind: (k: RankingKind) => void;
  location: UserLocation | null;
}) {
  const scopes: RankingScope[] = ["friends", "city", "state", "country"];
  const kinds: RankingKind[] = [
    "overall",
    "fitness",
    "nutrition",
    "consistency",
    "biomarker",
    "social",
  ];

  // Encontra posição do user atual
  const myRank = ranking.find((r) => r.isCurrentUser);

  return (
    <div>
      {/* Kind picker — Lucas (2026-05-24): "rankings de diversos nichos" */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onSwitchKind(k)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold transition",
              kind === k
                ? "bg-brand-700 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
            )}
          >
            {RANKING_KIND_LABEL[k]}
          </button>
        ))}
      </div>

      {/* Scope picker */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {scopes.map((s) => {
          const requiresPublic = s !== "friends";
          const labelExtra =
            s === "city" && location?.city
              ? ` (${location.city})`
              : s === "state" && location?.state
                ? ` (${location.state})`
                : "";
          return (
            <button
              key={s}
              type="button"
              onClick={() => onSwitch(s)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition",
                scope === s
                  ? "bg-brand-700 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
              )}
            >
              {requiresPublic && <Lock className="h-2.5 w-2.5" />}
              {RANKING_SCOPE_LABEL[s]}
              {labelExtra}
            </button>
          );
        })}
      </div>

      {/* Minha posição highlight (se não tô no top) */}
      {myRank && myRank.rank > 5 && (
        <div className="mb-3 rounded-xl bg-brand-50/60 px-4 py-2.5 text-[12px] text-brand-900">
          <strong>Você está na posição #{myRank.rank}</strong>{" "}
          {scope === "city" && location?.city && `em ${location.city}`}
          {scope === "state" && location?.state && `no ${location.state}`}
          {scope === "country" && "no Brasil"}
          {scope === "friends" && "entre amigos"}
          {" "}com {myRank.totalPoints.toLocaleString("pt-BR")} pontos.
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-zinc-50/60 px-4 py-10 text-center text-[12.5px] text-zinc-500">
          Carregando ranking…
        </div>
      ) : ranking.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-8 w-8 text-zinc-300" />}
          title="Sem ranking disponível"
          body={
            scope === "friends"
              ? "Adicione amigos pra começar a se comparar."
              : "Ninguém compartilha publicamente nessa região ainda."
          }
        />
      ) : (
        <ol className="flex flex-col gap-1.5">
          {ranking.map((entry) => (
            <li key={entry.patientId}>
              <RankingRow entry={entry} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function RankingRow({ entry }: { entry: RankingEntry }) {
  const trophyColor =
    entry.rank === 1
      ? "from-amber-400 to-orange-500"
      : entry.rank === 2
        ? "from-zinc-300 to-zinc-400"
        : entry.rank === 3
          ? "from-orange-300 to-amber-700"
          : "from-zinc-200 to-zinc-300";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5",
        entry.isCurrentUser
          ? "border-brand-300 bg-brand-50/60"
          : "border-zinc-200 bg-white",
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br font-bold text-white",
          trophyColor,
        )}
      >
        {entry.rank <= 3 ? (
          <Trophy className="h-4 w-4" />
        ) : (
          <span className="text-[12px] tabular-nums">{entry.rank}</span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5 truncate">
          <span className="text-[13px] font-semibold text-zinc-900">
            {entry.firstName}
            {entry.isCurrentUser && (
              <span className="ml-1 text-[10px] font-normal text-brand-700">(você)</span>
            )}
          </span>
          <span className="text-[10px] text-zinc-500">Level {entry.level}</span>
        </div>
        {entry.city && (
          <div className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-zinc-500">
            <MapPin className="h-2.5 w-2.5" />
            {entry.city}
            {entry.state && ` · ${entry.state}`}
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="text-[14px] font-semibold tabular-nums text-zinc-900">
          {(entry.nichePoints ?? entry.totalPoints).toLocaleString("pt-BR")}
        </div>
        <div className="text-[9.5px] text-zinc-400">
          {entry.nichePoints !== undefined ? "pts nicho" : "pontos"}
        </div>
      </div>
    </div>
  );
}

function FriendsView({
  friends,
  incomingInvites,
  outgoingInvites,
  myUserId,
  friendStreaks,
}: {
  friends: FriendSummary[];
  incomingInvites: FriendInvite[];
  outgoingInvites: FriendInvite[];
  myUserId: string | null;
  friendStreaks: Record<string, { currentDays: number; atRisk: boolean }>;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);

  const respond = async (inviteId: string, accept: boolean) => {
    setPendingInviteId(inviteId);
    try {
      const res = await respondToInviteAction(inviteId, accept);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      window.location.reload();
    } finally {
      setPendingInviteId(null);
    }
  };

  const cancel = async (inviteId: string) => {
    if (!confirm("Cancelar esse convite?")) return;
    setPendingInviteId(inviteId);
    try {
      const res = await cancelInviteAction(inviteId);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      window.location.reload();
    } finally {
      setPendingInviteId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 px-5 py-3 text-[13px] font-semibold text-white shadow-md transition active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" /> Adicionar amigo
      </button>

      {/* Convites recebidos pendentes */}
      {incomingInvites.length > 0 && (
        <section>
          <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Convites recebidos · {incomingInvites.length}
          </h3>
          <ul className="flex flex-col gap-2">
            {incomingInvites.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-[14px] font-semibold text-amber-800">
                  {inv.otherFirstName[0]?.toUpperCase() ?? "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-zinc-900">
                    {inv.otherFirstName}
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-zinc-600">
                    Level {inv.otherLevel} · quer ser seu amigo
                  </div>
                  {inv.message && (
                    <div className="mt-1 line-clamp-2 text-[11px] italic text-zinc-600">
                      &ldquo;{inv.message}&rdquo;
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => respond(inv.id, false)}
                    disabled={pendingInviteId === inv.id}
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Rejeitar
                  </button>
                  <button
                    type="button"
                    onClick={() => respond(inv.id, true)}
                    disabled={pendingInviteId === inv.id}
                    className="rounded-lg bg-brand-700 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
                  >
                    {pendingInviteId === inv.id ? "..." : "Aceitar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Convites enviados pendentes */}
      {outgoingInvites.length > 0 && (
        <section>
          <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Aguardando resposta · {outgoingInvites.length}
          </h3>
          <ul className="flex flex-col gap-2">
            {outgoingInvites.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2.5"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-[13px] font-semibold text-zinc-600">
                  {inv.otherFirstName[0]?.toUpperCase() ?? "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-zinc-800">
                    {inv.otherFirstName}
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-zinc-500">
                    Convite enviado · aguardando aceite
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => cancel(inv.id)}
                  disabled={pendingInviteId === inv.id}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-500 hover:text-rose-600 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Amigos ativos */}
      <section>
        {(incomingInvites.length > 0 || outgoingInvites.length > 0) && (
          <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Meus amigos · {friends.length}
          </h3>
        )}
        {friends.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8 text-zinc-300" />}
            title="Você ainda não tem amigos por aqui"
            body="Adicione amigos pra ver runs, achievements e disputar rankings."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {friends.map((f) => {
              const streak = friendStreaks[f.patientId];
              return (
                <li
                  key={f.patientId}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-[14px] font-semibold text-brand-700">
                    {f.firstName[0]?.toUpperCase() ?? "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13.5px] font-semibold text-zinc-900">
                        {f.firstName}
                      </span>
                      {streak && streak.currentDays > 0 && (
                        <FriendStreakBadge
                          days={streak.currentDays}
                          atRisk={streak.atRisk}
                          size="sm"
                        />
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-500">
                      Level {f.level} · {f.totalPoints.toLocaleString("pt-BR")} pts
                    </div>
                  </div>
                  {f.city && (
                    <span className="text-[10px] text-zinc-500">
                      <MapPin className="-mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
                      {f.city}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {sheetOpen && (
        <AddFriendSheet
          myUserId={myUserId}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}

function ProfileView({
  points,
  myPosts,
  myAchievements,
  xpToday,
  xpGoal,
  xpHistory,
  streakDays,
  completedToday,
  myFirstName,
  friendsCount,
}: {
  points: HealthPoints;
  myPosts: SocialPost[];
  myAchievements: UserAchievement[];
  xpToday: number;
  xpGoal: number;
  xpHistory: Array<{ date: string; xp: number }>;
  streakDays: number;
  completedToday: boolean;
  myFirstName: string;
  friendsCount: number;
}) {
  const breakdown: Array<{ label: string; value: number; color: string }> = [
    { label: "Fitness", value: points.fitnessPoints, color: "bg-emerald-500" },
    { label: "Nutrição", value: points.nutritionPoints, color: "bg-orange-500" },
    {
      label: "Consistência",
      value: points.consistencyPoints,
      color: "bg-amber-500",
    },
    { label: "Biomarcadores", value: points.biomarkerPoints, color: "bg-sky-500" },
    { label: "Social", value: points.socialPoints, color: "bg-rose-500" },
  ];
  const total = breakdown.reduce((s, b) => s + b.value, 0) || 1;

  // Lucas (2026-05-25): "a subaba perfil da aba social está vazia,
  // coloque seção de pfp, nome de usuário, e fotos, igual ao do
  // instagram" → hero estilo Insta no topo (PFP grande + nome + stats
  // row) + grid 3-col de fotos. Sections de gamificação (foguinho, XP,
  // heatmap, achievements, breakdown) ficam ABAIXO no scroll.

  // Filtra só posts com imageUrl pra grid Instagram-style (posts texto
  // continuam acessíveis via lista de "Suas postagens" mais abaixo)
  const photoPosts = myPosts.filter(
    (p) => typeof p.payload.imageUrl === "string" && p.payload.imageUrl,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Profile Hero — Instagram-style */}
      <section className="rounded-2xl border border-zinc-200 bg-white px-5 py-5">
        <div className="flex items-center gap-5">
          {/* PFP grande circular com gradient ring brand */}
          <div className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded-full bg-gradient-to-tr from-brand-400 via-brand-600 to-brand-800 p-0.5 sm:h-[100px] sm:w-[100px]">
            <span className="grid h-full w-full place-items-center rounded-full bg-white p-1">
              <span className="grid h-full w-full place-items-center rounded-full bg-brand-50 text-[32px] font-bold text-brand-700 sm:text-[38px]">
                {myFirstName[0]?.toUpperCase() ?? "?"}
              </span>
            </span>
          </div>

          {/* Nome + stats inline (igual Insta) */}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[18px] font-semibold leading-tight text-zinc-900 sm:text-[20px]">
              {myFirstName}
            </div>
            <div className="mt-0.5 text-[11.5px] font-medium text-brand-700">
              Level {points.level} · {levelTitle(points.level)}
            </div>

            {/* Stats row: posts | amigos | streak */}
            <div className="mt-3 flex gap-4 text-center">
              <ProfileStat value={myPosts.length} label="posts" />
              <ProfileStat value={friendsCount} label="amigos" />
              <ProfileStat
                value={streakDays}
                label={`dia${streakDays === 1 ? "" : "s"} 🔥`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Grid 3-col de fotos — Instagram explore-style */}
      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Fotos · {photoPosts.length}
          </h3>
        </div>
        {photoPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-10 text-center">
            <div className="text-[28px]" aria-hidden>
              📷
            </div>
            <p className="mt-2 text-[12px] text-zinc-500">
              Nenhuma foto ainda. Use o botão{" "}
              <span className="font-semibold text-brand-700">+</span> no feed
              pra publicar.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-1 sm:gap-1.5">
            {photoPosts.map((post) => (
              <li
                key={post.id}
                className="relative aspect-square overflow-hidden rounded-md bg-zinc-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.payload.imageUrl!}
                  alt={post.payload.title ?? "Foto"}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* StreakHero — foguinho gigante */}
      <StreakHero days={streakDays} completedToday={completedToday} />

      {/* XP daily goal */}
      <XpDailyGoal xpToday={xpToday} goal={xpGoal} />

      {/* Heatmap 12 semanas */}
      <ActivityHeatmap data={xpHistory} weeks={12} />

      {/* Achievements — só destrancadas */}
      <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Suas conquistas · {myAchievements.length}
          </h3>
          <Link
            href="/fitness/conquistas"
            className="inline-flex items-center gap-1 text-[11.5px] font-medium text-brand-700 hover:text-brand-800"
          >
            Ver todas <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {myAchievements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/40 px-3 py-5 text-center">
            <Medal className="mx-auto h-6 w-6 text-zinc-300" />
            <p className="mt-2 text-[12px] text-zinc-500">
              Treine, corra, durma bem e suas conquistas vão aparecer aqui.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {myAchievements.slice(0, 8).map((ua) => {
              const a = ua.achievement;
              if (!a) return null;
              return (
                <li
                  key={ua.id}
                  className="flex flex-col items-center gap-1 rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white px-2 py-2.5 text-center"
                  title={`${a.title} — ${a.description}`}
                >
                  <span className="text-[26px] leading-none" aria-hidden>
                    {a.emoji}
                  </span>
                  <span className="line-clamp-2 text-[10.5px] font-semibold leading-tight text-zinc-800">
                    {a.title}
                  </span>
                  <span className="text-[9.5px] font-semibold tabular-nums text-amber-700">
                    +{a.xp} XP
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Posts próprios */}
      <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-4">
        <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Suas postagens · {myPosts.length}
        </h3>
        {myPosts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/40 px-3 py-6 text-center">
            <Heart className="mx-auto h-6 w-6 text-zinc-300" />
            <p className="mt-2 text-[12px] text-zinc-500">
              Nenhuma postagem ainda. Termine uma corrida, treino ou desbloqueie
              uma conquista pra postar aqui.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {myPosts.slice(0, 6).map((post) => (
              <li key={post.id}>
                <MyPostMini post={post} />
              </li>
            ))}
            {myPosts.length > 6 && (
              <li className="pt-1 text-center">
                <span className="text-[11px] text-zinc-500">
                  + {myPosts.length - 6}{" "}
                  {myPosts.length - 6 === 1 ? "postagem" : "postagens"} mais
                  antiga{myPosts.length - 6 === 1 ? "" : "s"}
                </span>
              </li>
            )}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-3.5">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          De onde vêm seus pontos
        </h3>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-zinc-100">
          {breakdown.map((b) => (
            <span
              key={b.label}
              className={b.color}
              style={{ width: `${(b.value / total) * 100}%` }}
            />
          ))}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px]">
          {breakdown.map((b) => (
            <li key={b.label} className="flex items-center gap-1.5 tabular-nums">
              <span className={cn("h-2 w-2 rounded-full", b.color)} />
              <span className="text-zinc-700">{b.label}</span>
              <span className="ml-auto font-semibold text-zinc-900">
                {b.value}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Link
        href="/social/privacidade"
        className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-brand-300"
      >
        <Settings className="h-4 w-4 text-zinc-500" />
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-zinc-800">
            Privacidade dos rankings
          </div>
          <div className="mt-0.5 text-[11px] text-zinc-500">
            Controle em quais rankings públicos você aparece
          </div>
        </div>
        <Globe className="h-4 w-4 text-zinc-400" />
      </Link>
    </div>
  );
}

/**
 * Stat individual no Instagram-style profile header (posts | amigos |
 * dias). Número grande em cima, label compacto embaixo.
 */
function ProfileStat({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[18px] font-bold leading-tight text-zinc-900 tabular-nums sm:text-[20px]">
        {value.toLocaleString("pt-BR")}
      </span>
      <span className="mt-0.5 text-[10.5px] font-medium text-zinc-500">
        {label}
      </span>
    </div>
  );
}

/**
 * Card mini de post próprio na aba Perfil — versão compacta do FeedPostCard.
 * Mostra kind, título, métricas-chave, data relativa.
 */
function MyPostMini({ post }: { post: SocialPost }) {
  const KIND_META: Record<
    SocialPostKind,
    { Icon: typeof Heart; accent: string; label: string }
  > = {
    running: { Icon: Footprints, accent: "bg-orange-50 text-orange-700", label: "Corrida" },
    workout: { Icon: Dumbbell, accent: "bg-brand-50 text-brand-700", label: "Treino" },
    achievement: { Icon: Medal, accent: "bg-amber-50 text-amber-700", label: "Conquista" },
    level_up: { Icon: Crown, accent: "bg-purple-50 text-purple-700", label: "Level up" },
    biomarker: { Icon: Zap, accent: "bg-emerald-50 text-emerald-700", label: "Biomarker" },
    milestone: { Icon: Sparkles, accent: "bg-sky-50 text-sky-700", label: "Marco" },
    story: { Icon: Sparkles, accent: "bg-fuchsia-50 text-fuchsia-700", label: "Story" },
  };
  const meta = KIND_META[post.kind] ?? KIND_META.workout;
  const { Icon } = meta;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", meta.accent)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className="text-[13px] font-semibold text-zinc-900">
            {post.payload.title}
          </span>
          <span className="text-[10px] text-zinc-400">
            · {relativeTime(post.createdAt)}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5 text-[10.5px] tabular-nums">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold",
              meta.accent,
            )}
          >
            {meta.label}
          </span>
          {post.kind === "running" && post.payload.distanceKm && (
            <span className="rounded-full bg-orange-50 px-2 py-0.5 font-semibold text-orange-800">
              {post.payload.distanceKm.toFixed(2)} km
            </span>
          )}
          {post.kind === "running" && post.payload.paceSecondsPerKm && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700">
              {fmtPace(post.payload.paceSecondsPerKm)}
            </span>
          )}
          {post.kind === "running" && post.payload.durationSeconds && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700">
              {fmtDuration(post.payload.durationSeconds)}
            </span>
          )}
          {post.kind === "achievement" && post.payload.achievementEmoji && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-900">
              {post.payload.achievementEmoji}
            </span>
          )}
          {post.kind === "level_up" && post.payload.level && (
            <span className="rounded-full bg-purple-50 px-2 py-0.5 font-semibold text-purple-900">
              Level {post.payload.level}
            </span>
          )}
          {post.visibility === "public" ? (
            <span className="ml-auto inline-flex items-center gap-0.5 text-zinc-400">
              <Globe className="h-2.5 w-2.5" />
              público
            </span>
          ) : (
            <span className="ml-auto inline-flex items-center gap-0.5 text-zinc-400">
              <Lock className="h-2.5 w-2.5" />
              amigos
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-10 text-center">
      <div className="mx-auto mb-2 inline-block">{icon}</div>
      <h3 className="text-[14px] font-semibold text-zinc-700">{title}</h3>
      <p className="mt-1 text-[12px] text-zinc-500">{body}</p>
    </div>
  );
}

// ─── Utils ────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function fmtPace(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}`;
  return `${m}min`;
}
