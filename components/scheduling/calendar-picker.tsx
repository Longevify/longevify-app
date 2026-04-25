"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COLLECTION_HOURS,
  getAvailableSlots,
  type CollectionLocation,
} from "@/lib/scheduling/slots";

interface CalendarPickerProps {
  weekStart: Date;
  location: CollectionLocation;
  selected?: Date | null;
  onSelect: (slot: Date) => void;
  onShiftWeek?: (offsetDays: number) => void;
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}h`;
}

export function CalendarPicker({
  weekStart,
  location,
  selected,
  onSelect,
  onShiftWeek,
}: CalendarPickerProps) {
  const slots = useMemo(
    () => getAvailableSlots(weekStart, location),
    [weekStart, location],
  );

  // group por dia (14 dias, dois "blocos" de 7)
  const days = useMemo(() => {
    const map = new Map<string, { date: Date; slots: typeof slots }>();
    for (const s of slots) {
      const key = s.slot.toDateString();
      if (!map.has(key)) {
        map.set(key, { date: new Date(s.slot), slots: [] });
      }
      map.get(key)!.slots.push(s);
    }
    return Array.from(map.values());
  }, [slots]);

  const startLabel = `${days[0]?.date.getDate()} ${MONTH_LABELS[days[0]?.date.getMonth() ?? 0]}`;
  const endLabel = days[days.length - 1]
    ? `${days[days.length - 1].date.getDate()} ${MONTH_LABELS[days[days.length - 1].date.getMonth()]}`
    : "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-muted">
          {startLabel} – {endLabel}
        </div>
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => onShiftWeek?.(-7)}
            aria-label="Semana anterior"
            disabled={!onShiftWeek}
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-white text-muted transition-colors hover:bg-brand-50 hover:text-ink disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onShiftWeek?.(7)}
            aria-label="Próxima semana"
            disabled={!onShiftWeek}
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-white text-muted transition-colors hover:bg-brand-50 hover:text-ink disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid: dia × horários (mobile vira scroll horizontal) */}
      <div className="overflow-x-auto">
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `64px repeat(${days.length}, minmax(56px, 1fr))`,
          }}
        >
          {/* header row: vazio + dias */}
          <div />
          {days.map(({ date }) => {
            const isToday =
              date.toDateString() === new Date().toDateString();
            return (
              <div
                key={date.toISOString()}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg py-1 text-center text-[10.5px]",
                  isToday ? "bg-brand-100 text-brand-800" : "text-muted",
                )}
              >
                <span className="uppercase tracking-[0.08em]">
                  {WEEKDAY_LABELS[date.getDay()]}
                </span>
                <span className="text-[14px] font-semibold text-ink">
                  {date.getDate()}
                </span>
              </div>
            );
          })}

          {COLLECTION_HOURS.map((hour) => (
            <RowForHour
              key={hour}
              hour={hour}
              days={days}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      <Legend />
    </div>
  );
}

function RowForHour({
  hour,
  days,
  selected,
  onSelect,
}: {
  hour: number;
  days: { date: Date; slots: { slot: Date; available: boolean }[] }[];
  selected?: Date | null;
  onSelect: (slot: Date) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-end pr-1 text-[11px] font-medium tabular-nums text-muted">
        {formatHour(hour)}
      </div>
      {days.map(({ slots }) => {
        const item = slots.find((s) => s.slot.getHours() === hour);
        if (!item) return <div key={`empty-${hour}`} />;
        const isSelected =
          selected != null && selected.getTime() === item.slot.getTime();
        return (
          <button
            key={item.slot.toISOString()}
            type="button"
            onClick={() => item.available && onSelect(item.slot)}
            disabled={!item.available}
            aria-pressed={isSelected}
            aria-label={`${item.slot.toLocaleDateString("pt-BR")} ${formatHour(hour)}${item.available ? "" : " (indisponível)"}`}
            className={cn(
              "h-9 rounded-lg border text-[11.5px] font-medium tabular-nums transition-colors",
              !item.available &&
                "cursor-not-allowed border-border/60 bg-border/20 text-muted/60",
              item.available &&
                !isSelected &&
                "border-border bg-white text-ink hover:border-brand-500 hover:bg-brand-50",
              item.available &&
                isSelected &&
                "border-brand-700 bg-brand-700 text-white",
            )}
          >
            {item.available ? formatHour(hour) : "—"}
          </button>
        );
      })}
    </>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded border border-border bg-white" />
        Disponível
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded bg-brand-700" />
        Selecionado
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded bg-border/40" />
        Indisponível
      </span>
    </div>
  );
}
