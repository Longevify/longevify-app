"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import type { AdminPatient } from "@/lib/admin/types";

interface PatientSearchComboboxProps {
  patients: AdminPatient[];
  value: string | null;
  onChange: (id: string) => void;
}

export function PatientSearchCombobox({
  patients,
  value,
  onChange,
}: PatientSearchComboboxProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) =>
      `${p.firstName} ${p.lastName} ${p.email}`
        .toLowerCase()
        .includes(q),
    );
  }, [patients, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou email…"
          className="h-11 w-full rounded-full border border-border bg-white pl-10 pr-4 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
      </div>
      <div className="max-h-[360px] overflow-y-auto rounded-[14px] border border-border bg-surface">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-muted">
            Nenhum paciente encontrado.
          </div>
        ) : (
          filtered.map((p) => {
            const selected = value === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onChange(p.id)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-border/70 px-4 py-3 text-left last:border-b-0 transition-colors",
                  selected
                    ? "bg-brand-50"
                    : "hover:bg-brand-50/60",
                )}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-800">
                  {initials(`${p.firstName} ${p.lastName}`)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[14px] font-medium text-ink">
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="truncate text-[12px] text-muted">
                    {p.email} · {p.chronologicalAge} anos
                  </span>
                </span>
                {selected ? (
                  <span className="ml-auto rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
                    Selecionado
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
