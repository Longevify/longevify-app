"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SymptomChip } from "@/components/symptoms/symptom-chip";
import { SeveritySlider } from "@/components/symptoms/severity-slider";
import { SymptomHeatmap } from "@/components/symptoms/heatmap";
import { cn, formatDatePtBR } from "@/lib/utils";
import {
  SYMPTOMS,
  type SymptomEntry,
  type SymptomReport,
} from "@/lib/symptoms/types";
import {
  loadEntries,
  todayISO,
  upsertEntry,
} from "@/lib/symptoms/storage";

interface DraftItem {
  symptomId: string;
  severity: number;
  note: string;
}

export default function SintomasPage() {
  const today = todayISO();
  const [entries, setEntries] = useState<SymptomEntry[]>([]);
  const [draft, setDraft] = useState<Record<string, DraftItem>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const all = loadEntries();
    setEntries(all);
    const todays = all.find((e) => e.date === today);
    if (todays) {
      const next: Record<string, DraftItem> = {};
      for (const r of todays.reports) {
        next[r.symptomId] = {
          symptomId: r.symptomId,
          severity: r.severity,
          note: r.note ?? "",
        };
      }
      setDraft(next);
    }
    setHydrated(true);
  }, [today]);

  function toggle(id: string) {
    setSavedAt(null);
    setDraft((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = { symptomId: id, severity: 5, note: "" };
      }
      return next;
    });
  }

  function updateSeverity(id: string, severity: number) {
    setSavedAt(null);
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], severity } }));
  }

  function updateNote(id: string, note: string) {
    setSavedAt(null);
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], note } }));
  }

  function handleSave() {
    const reports: SymptomReport[] = Object.values(draft).map((d) => ({
      symptomId: d.symptomId,
      severity: d.severity,
      note: d.note?.trim() || undefined,
    }));
    const entry: SymptomEntry = {
      date: today,
      reports,
      createdAt: new Date().toISOString(),
    };
    const next = upsertEntry(today, entry);
    setEntries(next);
    setSavedAt(entry.createdAt);
  }

  const recent30 = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 29);
    return entries.filter((e) => new Date(e.date) >= cutoff);
  }, [entries]);

  const symptomsWithData = useMemo(() => {
    const set = new Set<string>();
    for (const e of recent30) for (const r of e.reports) set.add(r.symptomId);
    return SYMPTOMS.filter((s) => set.has(s.id));
  }, [recent30]);

  const selectedCount = Object.keys(draft).length;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-10">
      <header className="pb-8">
        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
          <Activity className="h-3.5 w-3.5" />
          Conta · Acompanhamento
        </span>
        <h1 className="mt-1 text-[40px] leading-[1.05] font-semibold tracking-tight">
          Diário de sintomas
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Marque o que sentiu hoje. O time Longevify usa esse padrão pra
          identificar gatilhos e cruzar com biomarcadores e wearables.
        </p>
      </header>

      <section className="mb-10 flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[18px] font-semibold tracking-tight">Hoje</h2>
          <span className="text-[12px] text-muted">
            {formatDatePtBR(today)}
          </span>
        </div>

        <Card className="flex flex-col gap-4 p-5">
          <p className="text-[12px] text-muted">
            Toque nos sintomas que apareceram hoje:
          </p>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((s) => (
              <SymptomChip
                key={s.id}
                label={s.label}
                selected={!!draft[s.id]}
                onClick={() => toggle(s.id)}
              />
            ))}
          </div>
        </Card>

        {selectedCount > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Object.values(draft).map((item) => {
              const def = SYMPTOMS.find((s) => s.id === item.symptomId);
              if (!def) return null;
              return (
                <Card key={item.symptomId} className="flex flex-col gap-4 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold">
                      {def.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggle(item.symptomId)}
                      className="text-[11px] text-muted hover:text-ink"
                    >
                      remover
                    </button>
                  </div>
                  <SeveritySlider
                    value={item.severity}
                    onChange={(v) => updateSeverity(item.symptomId, v)}
                  />
                  <textarea
                    rows={2}
                    placeholder="Algum contexto? (ex: começou às 14h, depois do café)"
                    value={item.note}
                    onChange={(e) => updateNote(item.symptomId, e.target.value)}
                    className="rounded-2xl border border-border bg-brand-50/30 px-4 py-3 text-[13px] text-ink outline-none transition-colors focus:border-brand-400 focus:bg-white"
                  />
                </Card>
              );
            })}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white px-5 py-3">
          <div className="text-[13px] text-muted">
            {savedAt ? (
              <span className="inline-flex items-center gap-1.5 text-[#0E7B45]">
                <CheckCircle2 className="h-4 w-4" />
                Entrada salva às {new Date(savedAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ) : selectedCount === 0 ? (
              "Nenhum sintoma marcado hoje. Você também pode salvar um dia tranquilo."
            ) : (
              `${selectedCount} ${selectedCount === 1 ? "sintoma marcado" : "sintomas marcados"}`
            )}
          </div>
          <Button onClick={handleSave} variant="primary" size="sm">
            Salvar entrada de hoje
          </Button>
        </div>
      </section>

      <section className="mb-10 flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[18px] font-semibold tracking-tight">
            Últimos 30 dias
          </h2>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
            <CalendarDays className="h-3.5 w-3.5" />
            {recent30.length} {recent30.length === 1 ? "registro" : "registros"}
          </span>
        </div>

        {hydrated && recent30.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-[14px] text-muted">
              Sem registros ainda. Salve a primeira entrada acima pra começar a
              ver padrões.
            </p>
          </Card>
        ) : null}

        {recent30.length > 0 ? (
          <Card className="flex flex-col divide-y divide-border">
            {recent30
              .slice()
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .slice(0, 14)
              .map((e) => (
                <div
                  key={e.date}
                  className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:gap-6"
                >
                  <div className="shrink-0 sm:w-32">
                    <div className="text-[13px] font-semibold">
                      {formatDatePtBR(e.date)}
                    </div>
                    <div className="text-[11px] text-muted">
                      {e.reports.length}{" "}
                      {e.reports.length === 1 ? "sintoma" : "sintomas"}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {e.reports.length === 0 ? (
                      <span className="rounded-full bg-[#DFF5E9] px-2.5 py-0.5 text-[11px] font-medium text-[#0E7B45]">
                        Dia tranquilo
                      </span>
                    ) : (
                      e.reports.map((r) => {
                        const def = SYMPTOMS.find((s) => s.id === r.symptomId);
                        return (
                          <span
                            key={r.symptomId}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                              r.severity >= 7
                                ? "bg-[#FBE1E1] text-[#B6333A]"
                                : r.severity >= 4
                                  ? "bg-[#FBF0D4] text-[#8A6A13]"
                                  : "bg-brand-100 text-brand-700",
                            )}
                          >
                            {def?.label ?? r.symptomId}
                            <span className="text-[10px] opacity-70">
                              · {r.severity}
                            </span>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
          </Card>
        ) : null}
      </section>

      {symptomsWithData.length > 0 ? (
        <section className="flex flex-col gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[18px] font-semibold tracking-tight">
              Padrões por sintoma
            </h2>
            <span className="text-[12px] text-muted">
              últimos 30 dias · cada quadrado = um dia
            </span>
          </div>
          <Card className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
            {symptomsWithData.map((s) => (
              <SymptomHeatmap
                key={s.id}
                symptomId={s.id}
                label={s.label}
                entries={recent30}
                days={30}
              />
            ))}
          </Card>
        </section>
      ) : null}
    </div>
  );
}
