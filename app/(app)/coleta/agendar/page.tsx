"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Loader2,
  PartyPopper,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPicker } from "@/components/scheduling/calendar-picker";
import { LocationPicker } from "@/components/scheduling/location-picker";
import {
  bookSlot,
  type CollectionLocation,
} from "@/lib/scheduling/slots";
import { toast } from "@/lib/toast";
import { formatBRL } from "@/lib/products";

export default function AgendarColetaPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [weekOffsetDays, setWeekOffsetDays] = useState(0);
  const [location, setLocation] = useState<CollectionLocation>("home");
  const [address, setAddress] = useState("");
  const [selectedSlotISO, setSelectedSlotISO] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    id: string;
    slotISO: string;
  } | null>(null);

  const weekStart = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + weekOffsetDays);
    return d;
  }, [weekOffsetDays, today]);

  const selected = selectedSlotISO ? new Date(selectedSlotISO) : null;
  const canSubmit =
    Boolean(selectedSlotISO) &&
    (location !== "home" || address.trim().length > 5);

  async function handleConfirm() {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await bookSlot(
        selected,
        location,
        location === "home" ? address : undefined,
      );
      setConfirmation({ id: res.id, slotISO: selected.toISOString() });
      toast.success({
        title: "Coleta agendada",
        description: "Te enviamos a confirmação por email.",
      });
    } catch (err) {
      toast.error({
        title: "Não conseguimos confirmar",
        description: err instanceof Error ? err.message : "Tente de novo.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    const slot = new Date(confirmation.slotISO);
    return (
      <div className="mx-auto w-full max-w-[720px] px-6 py-12">
        <Card className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-brand-700">
            <PartyPopper className="h-6 w-6" />
          </span>
          <h1 className="text-[24px] font-semibold leading-tight">
            Coleta agendada
          </h1>
          <p className="max-w-md text-[13.5px] text-muted">
            Confirmação enviada pro seu email. Sua coleta acontece em{" "}
            <strong>
              {slot.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                weekday: "long",
              })}{" "}
              às {slot.getHours()}h
            </strong>
            {location === "home" ? (
              <> em domicílio (+{formatBRL(120)}).</>
            ) : (
              <> no laboratório parceiro mais próximo.</>
            )}
          </p>
          <div className="text-[11.5px] text-muted">
            Código do agendamento:{" "}
            <span className="font-mono">{confirmation.id}</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href="/home">
              <Button variant="primary" size="md">
                Voltar pra plataforma
              </Button>
            </Link>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setConfirmation(null);
                setSelectedSlotISO(null);
              }}
            >
              Agendar outra
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[920px] px-6 py-10">
      <Link
        href="/home"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </Link>

      <header className="mt-4 pb-6">
        <span className="text-[13px] text-muted">Coleta</span>
        <h1 className="text-[34px] leading-[1.05] font-semibold tracking-tight">
          Agendar nova coleta
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Escolha como e quando quer fazer sua próxima coleta de sangue.
          Reagendamento gratuito até 24h antes.
        </p>
      </header>

      <Card className="flex flex-col gap-6 p-6 sm:p-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-[16px] font-semibold leading-tight">
            Local da coleta
          </h2>
          <LocationPicker
            value={location}
            onChange={(loc) => {
              setLocation(loc);
              setSelectedSlotISO(null);
            }}
          />
        </section>

        {location === "home" ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-[14px] font-semibold leading-tight">
              Endereço para coleta domiciliar
            </h2>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, complemento, bairro, cidade"
              className="resize-y rounded-2xl border border-border bg-brand-50/30 px-4 py-3 text-[14px] text-ink outline-none transition-colors focus:border-brand-400 focus:bg-white"
            />
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="text-[16px] font-semibold leading-tight">
            Horário disponível
          </h2>
          <CalendarPicker
            weekStart={weekStart}
            location={location}
            selected={selected}
            onSelect={(slot) => setSelectedSlotISO(slot.toISOString())}
            onShiftWeek={(d) =>
              setWeekOffsetDays((prev) => Math.max(0, prev + d))
            }
          />
        </section>

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
            {location === "home" ? (
              <> · em domicílio (+{formatBRL(120)})</>
            ) : (
              <> · laboratório parceiro</>
            )}
          </div>
        ) : null}

        <div className="flex justify-end border-t border-border pt-4">
          <Button
            variant="dark"
            size="md"
            onClick={handleConfirm}
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirmando…
              </>
            ) : (
              <>
                Confirmar agendamento
                <Check className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
