"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CyclePhase,
  FlowLevel,
  MenstrualEntry,
  SymptomKey,
} from "@/lib/menstrual/types";
import {
  PHASE_COLOR,
  PHASE_LABEL,
  SYMPTOM_CATALOG,
} from "@/lib/menstrual/types";

/**
 * Bottom sheet pra registrar/editar entry de um dia específico.
 *
 * Padrão UX inspirado em Apple Health Cycle Tracking:
 *   - sheet sobe de baixo, ocupa ~85vh
 *   - flow / mood / sliders / sintomas tudo numa tela só (rápido)
 *   - Save → POST → fecha
 */

interface Props {
  date: string; // YYYY-MM-DD
  existingEntry: MenstrualEntry | null;
  phase: CyclePhase;
  onClose: () => void;
  onSaved: (entry: MenstrualEntry) => void;
}

const FLOW_OPTIONS: { value: FlowLevel; label: string; emoji: string }[] = [
  { value: "none", label: "Nada", emoji: "○" },
  { value: "spotting", label: "Borra", emoji: "·" },
  { value: "light", label: "Leve", emoji: "◔" },
  { value: "medium", label: "Médio", emoji: "◑" },
  { value: "heavy", label: "Intenso", emoji: "●" },
];

const MOOD_EMOJI = ["😔", "😕", "😐", "🙂", "😄"];

export function DayEntrySheet({
  date,
  existingEntry,
  phase,
  onClose,
  onSaved,
}: Props) {
  const [flow, setFlow] = useState<FlowLevel | null>(existingEntry?.flow ?? null);
  const [symptoms, setSymptoms] = useState<SymptomKey[]>(
    existingEntry?.symptoms ?? [],
  );
  const [mood, setMood] = useState<number | null>(existingEntry?.mood ?? null);
  const [energy, setEnergy] = useState<number | null>(
    existingEntry?.energy ?? null,
  );
  const [libido, setLibido] = useState<number | null>(
    existingEntry?.libido ?? null,
  );
  const [sleep, setSleep] = useState<number | null>(
    existingEntry?.sleepQuality ?? null,
  );
  const [notes, setNotes] = useState(existingEntry?.notes ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ESC fecha
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleSymptom = (key: SymptomKey) => {
    setSymptoms((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/menstrual/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_date: date,
          flow,
          symptoms,
          mood,
          energy,
          libido,
          sleep_quality: sleep,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      onSaved({
        id: data.entry.id,
        entryDate: data.entry.entry_date,
        flow: data.entry.flow,
        symptoms: data.entry.symptoms ?? [],
        mood: data.entry.mood,
        energy: data.entry.energy,
        libido: data.entry.libido,
        sleepQuality: data.entry.sleep_quality,
        notes: data.entry.notes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const phaseColors = PHASE_COLOR[phase];
  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-[560px] sm:rounded-3xl sm:mb-6">
        {/* Header */}
        <header className="flex shrink-0 items-start justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: phaseColors.bg,
                color: phaseColors.text,
              }}
            >
              {PHASE_LABEL[phase]}
            </div>
            <h2 className="mt-1 text-[16px] font-semibold capitalize text-zinc-900">
              {dateLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {/* Flow */}
          <section>
            <Label>Fluxo menstrual</Label>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {FLOW_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setFlow(flow === opt.value ? null : opt.value)
                  }
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-2.5 text-[11px] font-medium transition",
                    flow === opt.value
                      ? "border-rose-500 bg-rose-50 text-rose-900"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300",
                  )}
                >
                  <span className="text-[16px] leading-none">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Mood */}
          <section className="mt-5">
            <Label>Humor</Label>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {MOOD_EMOJI.map((emoji, i) => {
                const value = i + 1;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMood(mood === value ? null : value)}
                    className={cn(
                      "rounded-xl border-2 px-2 py-3 text-[24px] transition",
                      mood === value
                        ? "border-zinc-900 bg-zinc-50 scale-105"
                        : "border-zinc-200 bg-white opacity-70 hover:opacity-100",
                    )}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Sliders 1-5 */}
          <ScaleRow label="Energia" value={energy} onChange={setEnergy} />
          <ScaleRow label="Libido" value={libido} onChange={setLibido} />
          <ScaleRow label="Qualidade do sono" value={sleep} onChange={setSleep} />

          {/* Symptoms */}
          <section className="mt-5">
            <Label>Sintomas</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(Object.keys(SYMPTOM_CATALOG) as SymptomKey[]).map((key) => {
                const sym = SYMPTOM_CATALOG[key];
                const active = symptoms.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSymptom(key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-[12px] font-medium transition",
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300",
                    )}
                  >
                    <span>{sym.emoji}</span>
                    {sym.pt}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Notes */}
          <section className="mt-5">
            <Label>Observações</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Algo a registrar sobre o dia..."
              rows={2}
              className="mt-2 w-full resize-none rounded-xl border-2 border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:border-rose-400 focus:outline-none"
            />
          </section>

          {error && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer
          className="flex shrink-0 gap-2 border-t border-zinc-100 px-5 py-4"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-[13px] font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Salvar
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11.5px] font-semibold uppercase tracking-wide text-zinc-500">
      {children}
    </label>
  );
}

function ScaleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <section className="mt-5">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        {value != null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[10.5px] text-zinc-400 hover:text-zinc-600"
          >
            Limpar
          </button>
        )}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            className={cn(
              "rounded-xl border-2 px-2 py-2.5 text-[14px] font-semibold transition",
              value === n
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </section>
  );
}
