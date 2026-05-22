import Link from "next/link";
import type { ActivityDay } from "@/lib/fitness/dashboard";
import { cn } from "@/lib/utils";

/**
 * Heatmap estilo GitHub contributions — 90 dias agrupados em colunas
 * de semana (7 squares por coluna).
 *
 * Cada quadradinho colore conforme intensidade (0 = vazio, 4 = pesado).
 * Tooltip via `title` mostra detalhes ao hover.
 */
interface ActivityHeatmapProps {
  days: ActivityDay[];
  totalDays?: number;
}

const COLORS: Record<number, string> = {
  0: "bg-zinc-100",
  1: "bg-emerald-200",
  2: "bg-emerald-400",
  3: "bg-emerald-600",
  4: "bg-emerald-800",
};

export function ActivityHeatmap({
  days,
  totalDays = 90,
}: ActivityHeatmapProps) {
  // Pega últimos `totalDays`
  const slice = days.slice(-totalDays);

  // Agrupa em colunas de 7 (semana)
  const cols: ActivityDay[][] = [];
  for (let i = 0; i < slice.length; i += 7) {
    cols.push(slice.slice(i, i + 7));
  }

  const totalActive = slice.filter((d) => d.intensity > 0).length;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Atividade {totalDays} dias
          </div>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            {totalActive} dia{totalActive === 1 ? "" : "s"} ativo
            {totalActive === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          <span>menos</span>
          {[0, 1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={cn("h-2.5 w-2.5 rounded-sm", COLORS[n])}
              aria-hidden
            />
          ))}
          <span>mais</span>
        </div>
      </div>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((d) => {
              const tooltip = `${d.date} · ${d.strengthSets} sets · ${d.runningKm.toFixed(1)}km · ${d.otherMinutes}min`;
              const cls = cn(
                "block h-2.5 w-2.5 rounded-sm transition",
                COLORS[d.intensity],
                d.intensity > 0 && "ring-1 ring-emerald-700/10 hover:scale-150 hover:ring-2 hover:ring-emerald-700/40",
              );
              // Phase 3L: se tem sets de musculação, link pra session detail
              if (d.strengthSets > 0) {
                return (
                  <Link
                    key={d.date}
                    href={`/fitness/sessao/${d.date}`}
                    title={tooltip}
                    aria-label={tooltip}
                    className={cls}
                  />
                );
              }
              return (
                <span
                  key={d.date}
                  title={tooltip}
                  className={cls}
                  aria-label={`${d.date}: intensidade ${d.intensity}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
