"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CyclePhase,
  MenstrualEntry,
  MenstrualProfile,
  SymptomKey,
} from "@/lib/menstrual/types";
import {
  PHASE_COLOR,
  PHASE_LABEL,
  SYMPTOM_CATALOG,
} from "@/lib/menstrual/types";
import {
  addDays,
  describePhase,
  formatYmd,
  getCyclePhaseInfo,
  predictPhaseForDate,
  startOfDay,
} from "@/lib/menstrual/cycle";
import { DayEntrySheet } from "./day-entry-sheet";
import { CycleInsights } from "./cycle-insights";

/**
 * Dashboard principal do ciclo menstrual.
 *
 * Header: fase atual + dia X de N + dias até próximo período + descrição
 * Calendário: mês completo com cores por fase + dots de sintomas
 * Footer: card "registrar dia" + estatísticas
 *
 * Lucas (2026-05-18): "Ideal é ter um dashboard visual de calendário,
 * algo bem compreensível".
 */

interface Props {
  profile: MenstrualProfile;
  initialEntries: MenstrualEntry[];
}

export function CycleDashboard({ profile, initialEntries }: Props) {
  const [entries, setEntries] = useState<MenstrualEntry[]>(initialEntries);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = startOfDay(new Date());
  const phaseInfo = useMemo(
    () => getCyclePhaseInfo(profile, today),
    [profile, today],
  );

  // Mapa entry_date → entry pra lookup rápido no calendário
  const entriesByDate = useMemo(() => {
    const map = new Map<string, MenstrualEntry>();
    for (const e of entries) map.set(e.entryDate, e);
    return map;
  }, [entries]);

  const handleEntrySaved = (saved: MenstrualEntry) => {
    setEntries((prev) => {
      const others = prev.filter((e) => e.entryDate !== saved.entryDate);
      return [...others, saved].sort((a, b) =>
        b.entryDate.localeCompare(a.entryDate),
      );
    });
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-rose-50/40 via-white to-white pb-16 sm:pb-24">
      {/*
        Lucas (2026-05-22): "na aba ciclo no desktop version, o design
        ta diferente dos demais, parece que ta mais largo do que as
        demais abas." → wrapper interno mx-auto + max-w-[920px] pra
        alinhar com /fitness (920px) e demais abas.
      */}
      <div className="mx-auto w-full max-w-[920px]">
      {/* Header insights */}
      <PhaseHeader info={phaseInfo} />

      {/* Quick action: registrar hoje */}
      <div className="px-5 mt-3">
        <button
          type="button"
          onClick={() => setSelectedDate(formatYmd(today))}
          className="flex w-full items-center justify-between rounded-xl bg-zinc-900 px-4 py-3 text-left text-white shadow-md shadow-zinc-900/10 transition hover:bg-zinc-800"
        >
          <div>
            <div className="text-[11px] uppercase tracking-wide text-white/60">Hoje</div>
            <div className="text-[13.5px] font-semibold leading-tight">
              {entriesByDate.has(formatYmd(today))
                ? "Atualizar registro"
                : "Registrar como está se sentindo"}
            </div>
          </div>
          <Plus className="h-5 w-5 shrink-0" />
        </button>
      </div>

      {/* Calendário (Lucas 2026-05-19: insights/diagnóstico fica EMBAIXO
          do calendário pra dar prioridade visual ao calendário). */}
      <div className="mt-5 px-5">
        <CalendarHeader
          viewMonth={viewMonth}
          onPrev={() =>
            setViewMonth(
              new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1),
            )
          }
          onNext={() =>
            setViewMonth(
              new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
            )
          }
        />
        <CalendarGrid
          viewMonth={viewMonth}
          today={today}
          profile={profile}
          entriesByDate={entriesByDate}
          onDayClick={(ymd) => setSelectedDate(ymd)}
        />
        <CalendarLegend />
      </div>

      {/* Análise AI personalizada — Lucas 2026-05-19 pediu pra ficar
          embaixo do calendário, mais bonita e legível. */}
      <CycleInsights
        profile={profile}
        entries={entries}
        phaseInfo={phaseInfo}
      />

      {/* Stats / sintomas recorrentes */}
      {entries.length > 0 && (
        <RecentSymptomsCard entries={entries.slice(0, 30)} />
      )}

      {/* Explicações das 4 fases — expansíveis */}
      <PhaseExplanationsCard />

      {/* Bottom sheet de registro */}
      {selectedDate && (
        <DayEntrySheet
          date={selectedDate}
          existingEntry={entriesByDate.get(selectedDate) ?? null}
          phase={predictPhaseForDate(profile, new Date(selectedDate))}
          onClose={() => setSelectedDate(null)}
          onSaved={(saved) => {
            handleEntrySaved(saved);
            setSelectedDate(null);
          }}
        />
      )}
      </div>
    </div>
  );
}

// ─── Header — fase atual + métrica grande ─────────────────────────────────

function PhaseHeader({
  info,
}: {
  info: ReturnType<typeof getCyclePhaseInfo>;
}) {
  const colors = PHASE_COLOR[info.phase];
  return (
    <div className="px-5 pt-[max(env(safe-area-inset-top),16px)] pb-1">
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        <Sparkles className="h-3 w-3" />
        Seu ciclo hoje
      </div>
      <h1 className="mt-1.5 text-[24px] font-semibold leading-tight tracking-tight text-zinc-900">
        Fase{" "}
        <span style={{ color: colors.text }}>{PHASE_LABEL[info.phase]}</span>
      </h1>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[12px] text-zinc-600">
        <span>
          Dia <strong className="text-zinc-900">{info.cycleDay}</strong> de{" "}
          {info.cycleLength}
        </span>
        {info.daysUntilNextPeriod > 0 && (
          <span>
            Próximo em <strong className="text-zinc-900">{info.daysUntilNextPeriod}</strong>d
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Calendário ────────────────────────────────────────────────────────────

function CalendarHeader({
  viewMonth,
  onPrev,
  onNext,
}: {
  viewMonth: Date;
  onPrev: () => void;
  onNext: () => void;
}) {
  const monthLabel = viewMonth.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return (
    <div className="mb-3 flex items-center justify-between">
      <button
        type="button"
        onClick={onPrev}
        className="grid h-9 w-9 place-items-center rounded-full bg-white text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <h2 className="text-[15px] font-semibold capitalize text-zinc-900">
        {monthLabel}
      </h2>
      <button
        type="button"
        onClick={onNext}
        className="grid h-9 w-9 place-items-center rounded-full bg-white text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
        aria-label="Próximo mês"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function CalendarGrid({
  viewMonth,
  today,
  profile,
  entriesByDate,
  onDayClick,
}: {
  viewMonth: Date;
  today: Date;
  profile: MenstrualProfile;
  entriesByDate: Map<string, MenstrualEntry>;
  onDayClick: (ymd: string) => void;
}) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = dom
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Total cells = días before first + days in month, completar pra múltiplo de 7
  const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;
  const cells: Array<{ date: Date | null; ymd: string | null }> = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startDayOfWeek + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push({ date: null, ymd: null });
    } else {
      const d = new Date(year, month, dayNum);
      cells.push({ date: d, ymd: formatYmd(d) });
    }
  }

  const weekdays = ["D", "S", "T", "Q", "Q", "S", "S"];
  // Lucas (2026-05-19): "ta muito grande os dias, faça algo que não
  // precisa fazer scroll para ver o calendário todo". Cells fixas em
  // altura (~36px mobile / ~44px desktop) — calendário mensal completo
  // cabe em ~280px sem scroll.
  return (
    <div className="rounded-2xl bg-white p-2 ring-1 ring-zinc-200">
      <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        {weekdays.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, idx) => {
          if (!cell.date || !cell.ymd) {
            return <div key={idx} className="h-9 sm:h-11" />;
          }
          const isToday = formatYmd(today) === cell.ymd;
          const isFuture = cell.date > today;
          const phase = predictPhaseForDate(profile, cell.date);
          const colors = PHASE_COLOR[phase];
          const entry = entriesByDate.get(cell.ymd);
          const hasFlow = entry && entry.flow && entry.flow !== "none";
          const symptomCount = entry?.symptoms?.length ?? 0;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onDayClick(cell.ymd!)}
              className={cn(
                "relative h-9 sm:h-11 rounded-lg text-center transition",
                "flex flex-col items-center justify-center",
                isFuture && "opacity-55",
              )}
              style={{
                backgroundColor: phase === "unknown" ? "#fafafa" : colors.bg,
                ...(isToday ? { boxShadow: `0 0 0 2px ${colors.ring}` } : {}),
              }}
            >
              <span
                className={cn(
                  "text-[11.5px] sm:text-[13px] font-semibold tabular-nums leading-none",
                  isToday ? "text-zinc-900" : "text-zinc-700",
                )}
                style={{ color: phase !== "unknown" ? colors.text : undefined }}
              >
                {cell.date.getDate()}
              </span>
              {/* Indicadores — menores pra caber em cells compactas */}
              {(hasFlow || symptomCount > 0) && (
                <div className="mt-0.5 flex gap-0.5">
                  {hasFlow && (
                    <span
                      className="h-[3px] w-[3px] rounded-full"
                      style={{ backgroundColor: PHASE_COLOR.menstrual.ring }}
                    />
                  )}
                  {symptomCount > 0 && (
                    <span
                      className="h-[3px] w-[3px] rounded-full bg-zinc-500"
                      aria-label={`${symptomCount} sintomas`}
                    />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarLegend() {
  const phases: CyclePhase[] = [
    "menstrual",
    "follicular",
    "ovulation",
    "luteal",
  ];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-zinc-600">
      {phases.map((p) => (
        <div key={p} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: PHASE_COLOR[p].ring }}
          />
          {PHASE_LABEL[p]}
        </div>
      ))}
    </div>
  );
}

// ─── Sintomas recorrentes (estatística simples) ───────────────────────────

function RecentSymptomsCard({ entries }: { entries: MenstrualEntry[] }) {
  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const e of entries) {
      for (const s of e.symptoms ?? []) {
        c.set(s, (c.get(s) ?? 0) + 1);
      }
    }
    return Array.from(c.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [entries]);

  if (counts.length === 0) return null;

  return (
    <div className="mt-6 px-5">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
        Sintomas mais frequentes (últimos 30 dias)
      </h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {counts.map(([key, count]) => {
          // Lucas (2026-05-21): "os sintomas deveriam estar em portugues
          // e sem '_'." Usa SYMPTOM_CATALOG (key → pt + emoji). Fallback
          // pra key formatada (sem underscore) se vier algo fora do
          // catálogo (legacy entries, edge case).
          const meta = SYMPTOM_CATALOG[key as SymptomKey];
          const label = meta?.pt ?? key.replace(/_/g, " ");
          const emoji = meta?.emoji ?? "";
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[12px] text-zinc-700"
            >
              {emoji && <span aria-hidden>{emoji}</span>}
              <span className="font-medium">{label}</span>
              <span className="text-zinc-400">×{count}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Explicações das fases (expansíveis) ──────────────────────────────────
//
// Lucas (2026-05-21): "Seria legal se tivesse algum lugar para colocar
// as explicações de cada fase." Card no rodapé do dashboard com as 4
// fases, cada uma collapsable, usando describePhase() + PHASE_COLOR.

function PhaseExplanationsCard() {
  const phases: CyclePhase[] = ["menstrual", "follicular", "ovulation", "luteal"];
  const [expandedPhase, setExpandedPhase] = useState<CyclePhase | null>(null);
  return (
    <div className="mt-6 px-5">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
        Sobre as fases do ciclo
      </h3>
      <ul className="mt-2 flex flex-col gap-2">
        {phases.map((p) => {
          const color = PHASE_COLOR[p];
          const isOpen = expandedPhase === p;
          return (
            <li key={p}>
              <button
                type="button"
                onClick={() => setExpandedPhase(isOpen ? null : p)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left ring-1 ring-zinc-200 transition hover:bg-zinc-50/60"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: color.ring }}
                  aria-hidden
                />
                <span
                  className="flex-1 text-[13.5px] font-semibold"
                  style={{ color: color.text }}
                >
                  {PHASE_LABEL[p]}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {isOpen ? "Fechar" : "Ver"}
                </span>
              </button>
              {isOpen && (
                <p className="mt-1.5 px-4 text-[12.5px] leading-relaxed text-zinc-600">
                  {describePhase(p)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Suprime unused import warning — usado em type annotations
void addDays;
