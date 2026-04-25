export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10">
      <div className="animate-pulse">
        <div className="h-4 w-40 rounded-full bg-black/5" />
        <div className="mt-3 h-10 w-72 rounded-full bg-black/10" />
        <div className="mt-2 h-4 w-[440px] max-w-full rounded-full bg-black/5" />

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-[260px] rounded-[20px] border border-border bg-surface" />
          <div className="h-[260px] rounded-[20px] border border-border bg-surface" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[140px] rounded-[20px] border border-border bg-surface"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
