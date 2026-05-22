import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Timer, Footprints, Calendar } from "lucide-react";
import { getRunningSession } from "@/lib/fitness/server";
import { RouteMap } from "../route-map";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Phase 3H — Página de detalhe de uma corrida específica.
 *
 * Mapa grande do trajeto + splits + duração + pace + distância.
 */
export default async function CorridaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await getRunningSession(id);
  if (!run) notFound();

  function fmtPace(secs: number | null | undefined): string {
    if (!secs || secs <= 0) return "—";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, "0")}/km`;
  }
  function fmtDuration(secs: number | null | undefined): string {
    if (!secs) return "—";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0)
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  // Acha pace pior/melhor pra highlight
  const paces = run.paceSegments ?? [];
  let bestPace: number | null = null;
  let worstPace: number | null = null;
  for (const seg of paces) {
    if (bestPace === null || seg.paceSeconds < bestPace)
      bestPace = seg.paceSeconds;
    if (worstPace === null || seg.paceSeconds > worstPace)
      worstPace = seg.paceSeconds;
  }

  return (
    <div className="pb-12">
      <Link
        href="/fitness/corrida"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-500 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar pra corrida
      </Link>

      {/* Hero */}
      <section className="mb-5 overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white shadow-sm">
        <div className="px-5 py-5">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-800">
            <Footprints className="h-3 w-3" />
            Corrida
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-[40px] font-semibold leading-none tabular-nums tracking-tight text-zinc-900">
              {(run.distanceKm ?? 0).toFixed(2)}
            </span>
            <span className="text-[16px] font-medium text-zinc-500">km</span>
          </div>
          {run.sessionDate && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-zinc-500">
              <Calendar className="h-3 w-3" />
              {new Date(run.sessionDate + "T00:00").toLocaleDateString(
                "pt-BR",
                {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                },
              )}
            </p>
          )}
        </div>

        {/* Mapa grande */}
        {run.coordinates && run.coordinates.length > 1 && (
          <div className="border-t border-brand-200/50">
            <RouteMap coords={run.coordinates} height={280} />
          </div>
        )}
      </section>

      {/* Stats trio */}
      <section className="mb-5 grid grid-cols-3 gap-2.5">
        <Stat
          label="Tempo"
          value={fmtDuration(run.durationSeconds)}
          icon={<Timer className="h-3.5 w-3.5 text-zinc-500" />}
        />
        <Stat
          label="Pace médio"
          value={fmtPace(run.avgPaceSecondsPerKm)}
          icon={<Footprints className="h-3.5 w-3.5 text-brand-700" />}
        />
        <Stat
          label="Pontos GPS"
          value={`${run.coordinates?.length ?? 0}`}
          icon={<span className="text-[14px] leading-none">📍</span>}
        />
      </section>

      {/* Splits por km */}
      {paces.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-3.5">
          <h3 className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <Timer className="h-3 w-3" />
            Splits por km
          </h3>
          <ul className="flex flex-col gap-1">
            {paces.map((seg) => {
              const isBest = seg.paceSeconds === bestPace;
              const isWorst = seg.paceSeconds === worstPace;
              const pct =
                worstPace && bestPace
                  ? ((worstPace - seg.paceSeconds) / (worstPace - bestPace || 1)) * 100
                  : 50;
              return (
                <li
                  key={seg.km}
                  className="flex items-center gap-3 py-1.5"
                >
                  <span className="w-12 shrink-0 text-[11px] font-semibold tabular-nums text-zinc-500">
                    km {seg.km}
                  </span>
                  {/* Bar visualization */}
                  <div className="relative flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                      style={{ width: `${Math.max(15, pct)}%` }}
                    />
                  </div>
                  <span
                    className={`w-20 text-right text-[12.5px] font-semibold tabular-nums ${
                      isBest
                        ? "text-emerald-700"
                        : isWorst
                          ? "text-rose-600"
                          : "text-zinc-700"
                    }`}
                  >
                    {fmtPace(seg.paceSeconds)}
                    {isBest && " 🚀"}
                    {isWorst && paces.length > 1 && " 🐢"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Notes (se houver) */}
      {run.notes && (
        <section className="mt-5 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Notas
          </h3>
          <p className="text-[12.5px] leading-relaxed text-zinc-700">
            {run.notes}
          </p>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-3">
      <div className="inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-[16px] font-semibold leading-none tabular-nums text-zinc-900">
        {value}
      </div>
    </div>
  );
}
