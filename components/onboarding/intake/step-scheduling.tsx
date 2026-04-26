"use client";

import { useMemo } from "react";
import { CalendarPicker } from "@/components/scheduling/calendar-picker";
import { LocationPicker } from "@/components/scheduling/location-picker";
import { formatBRL } from "@/lib/products";
import type { IntakeData } from "@/lib/intake/schema";
import { IntakeQuestion } from "./intake-question";
import { TextArea } from "./inputs";
import { Heading } from "./heading";

interface Props {
  data: IntakeData;
  onPatch: (next: Partial<IntakeData>) => void;
}

export function StepScheduling({ data, onPatch }: Props) {
  const s = data.scheduling;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekStart = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + (s.weekOffsetDays ?? 0));
    return d;
  }, [s.weekOffsetDays, today]);

  const selected = s.selectedSlotISO ? new Date(s.selectedSlotISO) : null;

  return (
    <div className="flex flex-col gap-5">
      <Heading
        title="Agende sua coleta"
        subtitle="Escolha local e horário. Você pode reagendar até 24h antes."
      />

      <IntakeQuestion label="Local da coleta" full>
        <LocationPicker
          value={s.location ?? "home"}
          onChange={(location) =>
            onPatch({
              scheduling: {
                ...s,
                location,
                selectedSlotISO: undefined,
              },
            })
          }
        />
      </IntakeQuestion>

      {s.location === "home" ? (
        <IntakeQuestion label="Endereço para coleta domiciliar" full>
          <TextArea
            value={s.address ?? ""}
            onChange={(address) =>
              onPatch({ scheduling: { ...s, address } })
            }
            placeholder="Rua, número, complemento, bairro, cidade"
            rows={2}
          />
        </IntakeQuestion>
      ) : null}

      <IntakeQuestion label="Horário disponível" full>
        <CalendarPicker
          weekStart={weekStart}
          location={s.location ?? "home"}
          selected={selected}
          onSelect={(slot) =>
            onPatch({
              scheduling: { ...s, selectedSlotISO: slot.toISOString() },
            })
          }
          onShiftWeek={(d) =>
            onPatch({
              scheduling: {
                ...s,
                weekOffsetDays: Math.max(0, (s.weekOffsetDays ?? 0) + d),
              },
            })
          }
        />
      </IntakeQuestion>

      {selected ? (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-[13px] text-brand-900">
          Selecionado:{" "}
          <strong>
            {selected.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              weekday: "long",
            })}{" "}
            às {selected.getHours()}h
          </strong>
          {s.location === "home" ? (
            <> · em domicílio (+{formatBRL(120)})</>
          ) : (
            <> · laboratório parceiro</>
          )}
        </div>
      ) : null}
    </div>
  );
}
