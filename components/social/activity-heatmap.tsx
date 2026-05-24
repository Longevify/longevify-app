"use client";

import { cn } from "@/lib/utils";

/**
 * Heatmap GitHub-style com últimos N dias de XP. Lucas (2026-05-24):
 * "Quero que o indivíduo tenha inúmeros motivos para entrar no app
 * todos os dias" → ver visualização contínua reforça compromisso.
 *
 * Cada célula é um dia. Intensidade da cor escala com XP.
 */
export function ActivityHeatmap({
  data,
  weeks = 12,
}: {
  data: Array<{ date: string; xp: number }>;
  weeks?: number;
}) {
  // Agrupa por semana (col) × dia da semana (row)
  // Cada coluna tem 7 dias. Domingo no topo.
  const tail = data.slice(-(weeks * 7));
  const maxXp = Math.max(1, ...tail.map((d) => d.xp));

  // Construir grid 7×weeks
  const cols: Array<Array<{ date: string; xp: number }>> = [];
  let current: Array<{ date: string; xp: number }> = [];
  // Padding pra primeiro dia da semana ser Domingo
  if (tail.length > 0) {
    const firstDow = new Date(tail[0].date + "T00:00").getDay();
    for (let i = 0; i < firstDow; i++) {
      current.push({ date: "", xp: 0 });
    }
  }
  for (const d of tail) {
    current.push(d);
    if (current.length === 7) {
      cols.push(current);
      current = [];
    }
  }
  if (current.length > 0) {
    while (current.length < 7) current.push({ date: "", xp: 0 });
    cols.push(current);
  }

  function cellColor(xp: number, isPlaceholder: boolean): string {
    if (isPlaceholder) return "bg-transparent";
    if (xp === 0) return "bg-zinc-100";
    const intensity = Math.min(1, xp / maxXp);
    if (intensity < 0.25) return "bg-emerald-200";
    if (intensity < 0.5) return "bg-emerald-400";
    if (intensity < 0.75) return "bg-emerald-600";
    return "bg-emerald-700";
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4">
      <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        Atividade — últimas {weeks} semanas
      </h3>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((cell, ri) => {
              const isPlaceholder = !cell.date;
              return (
                <div
                  key={ri}
                  title={
                    isPlaceholder
                      ? ""
                      : `${cell.date}: ${cell.xp} XP`
                  }
                  className={cn(
                    "h-3 w-3 rounded-[3px]",
                    cellColor(cell.xp, isPlaceholder),
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10.5px] text-zinc-500">
        <span>Menos</span>
        <div className="flex gap-0.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-zinc-100" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-200" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-400" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-600" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-700" />
        </div>
        <span>Mais</span>
      </div>
    </section>
  );
}
