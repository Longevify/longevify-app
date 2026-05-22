/**
 * Phase 3H — Loading skeleton pra dashboard /fitness.
 *
 * Streak hero + 2 cards + heatmap + stats grid.
 */
export default function FitnessLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-5">
      {/* Hero skeleton */}
      <section className="overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 px-5 py-5">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 shrink-0 rounded-2xl bg-white/20" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded-full bg-white/20" />
            <div className="h-10 w-32 rounded-lg bg-white/30" />
            <div className="h-3 w-44 rounded-full bg-white/20" />
          </div>
        </div>
      </section>

      {/* 2 cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </section>

      {/* Heatmap skeleton */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 h-3 w-32 rounded-full bg-zinc-200" />
        <div className="flex gap-1">
          {Array.from({ length: 13 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              {Array.from({ length: 7 }).map((_, j) => (
                <div
                  key={j}
                  className="h-2.5 w-2.5 rounded-sm bg-zinc-100"
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <section className="grid grid-cols-3 gap-3">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </section>

      {/* Bottom cards */}
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-zinc-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-28 rounded-full bg-zinc-200" />
          <div className="h-5 w-20 rounded-md bg-zinc-200" />
          <div className="h-2 w-full rounded-full bg-zinc-100" />
        </div>
      </div>
    </div>
  );
}

function SkeletonStat() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
      <div className="h-2.5 w-16 rounded-full bg-zinc-200" />
      <div className="mt-2 h-5 w-10 rounded-md bg-zinc-200" />
      <div className="mt-2 h-2 w-12 rounded-full bg-zinc-100" />
    </div>
  );
}
