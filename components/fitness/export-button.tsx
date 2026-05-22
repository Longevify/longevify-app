"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Phase 3J — Botão de export CSV.
 *
 * Dropdown com opções: tudo, musculação, corrida, outras, medidas.
 * Click dispara download via /api/fitness/export.
 */
export function ExportButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  const download = (kind: string) => {
    window.location.href = `/api/fitness/export?kind=${kind}`;
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
      >
        <Download className="h-3.5 w-3.5" />
        Exportar CSV
      </button>
      {open && (
        <>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default bg-transparent"
            aria-label="Fechar"
          />
          <div className="absolute right-0 top-full z-20 mt-1.5 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
            <ul className="py-1">
              <ExportOption
                emoji="📦"
                label="Tudo"
                hint="Histórico completo"
                onClick={() => download("all")}
              />
              <li className="my-1 border-t border-zinc-100" />
              <ExportOption
                emoji="🏋️"
                label="Musculação"
                hint="Sets, reps, peso, RPE"
                onClick={() => download("strength")}
              />
              <ExportOption
                emoji="🏃"
                label="Corrida"
                hint="Distância, pace, duração"
                onClick={() => download("running")}
              />
              <ExportOption
                emoji="🚴"
                label="Outras atividades"
                hint="Bike, swim, yoga…"
                onClick={() => download("other")}
              />
              <ExportOption
                emoji="⚖️"
                label="Medidas corporais"
                hint="Peso, % gord, medidas"
                onClick={() => download("body")}
              />
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function ExportOption({
  emoji,
  label,
  hint,
  onClick,
}: {
  emoji: string;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-zinc-50"
      >
        <span className="text-[16px]" aria-hidden>
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold text-zinc-800">
            {label}
          </div>
          <div className="text-[10px] text-zinc-500">{hint}</div>
        </div>
        <FileSpreadsheet className="h-3 w-3 shrink-0 text-zinc-400" />
      </button>
    </li>
  );
}
