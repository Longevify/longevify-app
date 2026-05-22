import Link from "next/link";
import { ArrowLeft, Trophy, Lock, Award } from "lucide-react";
import {
  getAchievementsWithProgress,
  getUserXp,
} from "@/lib/fitness/achievements";
import {
  type AchievementCategory,
  CATEGORY_LABEL,
  TIER_COLORS,
  TIER_LABEL,
} from "@/lib/fitness/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Phase 3C — Página dedicada às conquistas (achievements).
 *
 * Grid agrupado por categoria, locked/unlocked com tier colorido,
 * XP total + level + progressão pro próximo level.
 */
export default async function ConquistasPage() {
  const [achievements, xpInfo] = await Promise.all([
    getAchievementsWithProgress(),
    getUserXp(),
  ]);

  // Agrupa por categoria
  const byCategory = new Map<
    AchievementCategory,
    typeof achievements
  >();
  for (const a of achievements) {
    const arr = byCategory.get(a.category) ?? [];
    arr.push(a);
    byCategory.set(a.category, arr);
  }

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const progressPct = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  const categoryOrder: AchievementCategory[] = [
    "strength",
    "running",
    "consistency",
    "volume",
    "other",
  ];

  return (
    <div className="pb-12">
      <Link
        href="/fitness"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-500 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </Link>

      {/* Hero — XP + level + progress */}
      <section className="mb-5 overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-white">
        <div className="px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
              <Trophy className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                Level {xpInfo.level}
              </div>
              <div className="mt-1 text-[28px] font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">
                {xpInfo.xp.toLocaleString("pt-BR")}{" "}
                <span className="text-[14px] font-medium text-zinc-500">XP</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                  style={{ width: `${xpInfo.progressPct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-600 tabular-nums">
                {xpInfo.xpToNextLevel} XP pro Level {xpInfo.level + 1}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11.5px] text-zinc-600">
            {unlockedCount}/{totalCount} conquistas desbloqueadas (
            {Math.round(progressPct)}%)
          </p>
        </div>
      </section>

      {/* Lista por categoria */}
      {categoryOrder.map((cat) => {
        const list = byCategory.get(cat);
        if (!list || list.length === 0) return null;
        const unlockedHere = list.filter((a) => a.unlocked).length;
        return (
          <section key={cat} className="mb-6">
            <h3 className="mb-2 flex items-center justify-between px-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                <Award className="h-3 w-3" />
                {CATEGORY_LABEL[cat]}
              </span>
              <span className="text-[10.5px] tabular-nums text-zinc-400">
                {unlockedHere}/{list.length}
              </span>
            </h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {list.map((a) => {
                const colors = TIER_COLORS[a.tier];
                return (
                  <li
                    key={a.id}
                    className={cn(
                      "relative rounded-2xl border px-3 py-3 text-center transition",
                      a.unlocked
                        ? `${colors.bg} ring-2 ${colors.ring} border-transparent`
                        : "border-zinc-200 bg-white opacity-60",
                    )}
                  >
                    {!a.unlocked && (
                      <Lock className="absolute right-2 top-2 h-3 w-3 text-zinc-400" />
                    )}
                    <div
                      className={cn(
                        "mx-auto text-[28px]",
                        !a.unlocked && "grayscale",
                      )}
                      aria-hidden
                    >
                      {a.emoji}
                    </div>
                    <div
                      className={cn(
                        "mt-1 text-[12px] font-semibold leading-tight",
                        a.unlocked ? colors.text : "text-zinc-600",
                      )}
                    >
                      {a.title}
                    </div>
                    <p className="mt-0.5 text-[10.5px] leading-snug text-zinc-500">
                      {a.description}
                    </p>
                    <div className="mt-1.5 flex items-center justify-center gap-1">
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide",
                          a.unlocked ? `${colors.bg} ${colors.text}` : "bg-zinc-100 text-zinc-500",
                        )}
                      >
                        {TIER_LABEL[a.tier]}
                      </span>
                      <span className="text-[9.5px] font-semibold text-amber-700 tabular-nums">
                        +{a.xp}xp
                      </span>
                    </div>
                    {a.unlocked && a.unlockedAt && (
                      <div className="mt-1 text-[9px] text-zinc-400 tabular-nums">
                        {new Date(a.unlockedAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
