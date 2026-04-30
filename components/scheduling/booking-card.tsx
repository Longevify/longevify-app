"use client";

import { useState, useTransition } from "react";
import {
  CalendarDays,
  Home,
  Building2,
  X,
  Check as CheckIcon,
  CircleDashed,
  CircleAlert,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarButtons } from "./calendar-buttons";
import { cancelBookingAction } from "@/app/(app)/coleta/actions";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  BookingLocation,
  BookingStatus,
  CollectionBooking,
} from "@/lib/scheduling/bookings";

interface BookingCardProps {
  booking: CollectionBooking;
  /** Quando `true`, render mostra botão Cancelar + calendar buttons. */
  showActions?: boolean;
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  scheduled: "Agendado",
  completed: "Realizado",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

const STATUS_STYLES: Record<BookingStatus, string> = {
  scheduled: "bg-brand-100 text-brand-800",
  completed: "bg-[#1F9D55]/12 text-[#1F9D55]",
  cancelled: "bg-[color:var(--color-status-out)]/12 text-[color:var(--color-status-out)]",
  no_show: "bg-[#B45309]/12 text-[#B45309]",
};

const STATUS_ICON: Record<BookingStatus, React.ComponentType<{ className?: string }>> = {
  scheduled: CircleDashed,
  completed: CheckIcon,
  cancelled: X,
  no_show: CircleAlert,
};

const LOCATION_ICON: Record<BookingLocation, React.ComponentType<{ className?: string }>> = {
  home: Home,
  lab: Building2,
};

const LOCATION_LABEL: Record<BookingLocation, string> = {
  home: "Coleta domiciliar",
  lab: "Laboratório parceiro",
};

function formatAddress(b: CollectionBooking): string | null {
  if (b.location !== "home") return null;
  const parts = [
    b.address.street,
    b.address.complement,
    [b.address.city, b.address.state].filter(Boolean).join("/"),
    b.address.zip,
  ].filter((p) => p && String(p).trim().length > 0);
  return parts.length > 0 ? parts.join(" — ") : null;
}

function formatScheduled(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }) + ` às ${String(d.getHours()).padStart(2, "0")}h${d.getMinutes() > 0 ? String(d.getMinutes()).padStart(2, "0") : ""}`
  );
}

export function BookingCard({ booking, showActions = true }: BookingCardProps) {
  const [pending, startTransition] = useTransition();
  const [optimisticCancelled, setOptimisticCancelled] = useState(false);

  const status = optimisticCancelled ? "cancelled" : booking.status;
  const StatusIcon = STATUS_ICON[status];
  const LocationIcon = LOCATION_ICON[booking.location];
  const address = formatAddress(booking);
  const isFuture =
    status === "scheduled" &&
    new Date(booking.scheduledAtISO).getTime() >= Date.now();

  function handleCancel() {
    if (!window.confirm("Cancelar esta coleta? Você pode reagendar depois.")) {
      return;
    }
    setOptimisticCancelled(true);
    startTransition(async () => {
      const res = await cancelBookingAction(booking.id);
      if (!res.ok) {
        setOptimisticCancelled(false);
        toast.error({
          title: "Não conseguimos cancelar",
          description: res.error,
        });
      } else {
        toast.success({ title: "Coleta cancelada" });
      }
    });
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.1em] text-muted">
              <LocationIcon className="h-3 w-3" />
              <span>{LOCATION_LABEL[booking.location]}</span>
            </div>
            <h3 className="mt-0.5 text-[15px] font-semibold leading-tight">
              {formatScheduled(booking.scheduledAtISO)}
            </h3>
            {address ? (
              <p className="mt-1 text-[12.5px] text-muted">{address}</p>
            ) : null}
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
            STATUS_STYLES[status],
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="text-[11px] text-muted">
        Código:{" "}
        <span className="font-mono">{booking.id.slice(0, 8)}</span>
        <span className="ml-2">
          Agendado em {new Date(booking.createdAtISO).toLocaleDateString("pt-BR")}
        </span>
      </div>

      {showActions && isFuture ? (
        <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <CalendarButtons
            event={{
              id: booking.id,
              title:
                booking.location === "home"
                  ? "Coleta de sangue Longevify (domiciliar)"
                  : "Coleta de sangue Longevify (laboratório)",
              description:
                (booking.location === "home" && address
                  ? `Profissional Longevify vai até você. Endereço: ${address}.\n\n`
                  : "Coleta no laboratório parceiro Longevify mais próximo.\n\n") +
                `Código: ${booking.id}`,
              location:
                booking.location === "home"
                  ? address ?? "Coleta domiciliar"
                  : "Laboratório parceiro Longevify",
              start: booking.scheduledAtISO,
              durationMinutes: 30,
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={pending}
            className="text-[#B6333A] hover:bg-[#FDECEC]"
          >
            {pending ? "Cancelando..." : "Cancelar"}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
