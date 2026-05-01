import Link from "next/link";
import {
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatDatePtBR } from "@/lib/utils";
import type { ColetaJourney } from "@/lib/scheduling/journey";
import type { CollectionBooking } from "@/lib/scheduling/bookings";

interface ColetaCalendarProps {
  journey: ColetaJourney;
  className?: string;
  /** Quando true, mostra o título "Calendário Longevify" e descrição.
   *  False renderiza só a lista de eventos (pra usar como widget). */
  showHeader?: boolean;
}

function formatTimePt(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}h${mm === "00" ? "" : mm}`;
}

function StatusBadge({ status }: { status: CollectionBooking["status"] }) {
  const variants: Record<CollectionBooking["status"], { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    scheduled: {
      label: "Agendado",
      cls: "bg-brand-100 text-brand-800",
      Icon: Clock3,
    },
    completed: {
      label: "Realizado",
      cls: "bg-[#DFF5E9] text-[#0E7B45]",
      Icon: CheckCircle2,
    },
    cancelled: {
      label: "Cancelado",
      cls: "bg-[#FBE1E1] text-[#B6333A]",
      Icon: XCircle,
    },
    no_show: {
      label: "Não compareceu",
      cls: "bg-[#FBE1E1] text-[#B6333A]",
      Icon: XCircle,
    },
  };
  const v = variants[status];
  const Icon = v.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        v.cls,
      )}
    >
      <Icon className="h-3 w-3" />
      {v.label}
    </span>
  );
}

function EventRow({
  date,
  title,
  subtitle,
  badge,
  variant = "default",
}: {
  date: Date;
  title: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  variant?: "default" | "future" | "ghost";
}) {
  const day = String(date.getDate()).padStart(2, "0");
  const monthShort = date
    .toLocaleString("pt-BR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  const isGhost = variant === "ghost";

  return (
    <li
      className={cn(
        "flex items-stretch gap-4 rounded-2xl border p-3",
        isGhost
          ? "border-dashed border-border bg-brand-50/20"
          : variant === "future"
            ? "border-brand-200 bg-brand-50/40"
            : "border-border bg-white",
      )}
    >
      {/* Tile da data */}
      <div
        className={cn(
          "flex w-16 flex-col items-center justify-center rounded-xl px-2 py-2",
          isGhost
            ? "bg-white text-muted ring-1 ring-dashed ring-border"
            : variant === "future"
              ? "bg-brand-700 text-white"
              : "bg-brand-100 text-brand-800",
        )}
      >
        <span className="text-[20px] font-semibold leading-none">{day}</span>
        <span className="mt-0.5 text-[10px] font-semibold tracking-wider">
          {monthShort}
        </span>
      </div>

      {/* Texto */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-semibold leading-tight text-ink">
            {title}
          </span>
          {badge}
        </div>
        {subtitle ? (
          <div className="text-[12px] leading-snug text-muted">{subtitle}</div>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Timeline-calendar das coletas Longevify do paciente.
 *
 * Renderiza:
 *   - Coletas válidas (scheduled/completed) ordenadas por data
 *   - Cards canceladas em estilo apagado quando houver
 *   - Card "fantasma" sugerindo a próxima coleta (6 meses depois) quando
 *     o plano ainda não está cheio e não há upcoming já cobrindo
 *   - CTA pra agendar quando totalmente vazio
 */
export function ColetaCalendar({
  journey,
  className,
  showHeader = true,
}: ColetaCalendarProps) {
  return (
    <Card className={cn("flex flex-col gap-4 p-5", className)}>
      {showHeader ? (
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
              <Calendar className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold leading-tight">
                Calendário Longevify
              </h2>
              <p className="mt-0.5 text-[12px] text-muted">
                Suas coletas — passadas e futuras. Plano padrão prevê{" "}
                <strong>{journey.expectedTotal} coletas por ano</strong>: uma
                inicial e outra 6 meses depois pra acompanhar evolução.
              </p>
            </div>
          </div>
          <Link href="/coleta/agendar">
            <Button variant="outline" size="sm">
              <CalendarPlus className="h-3.5 w-3.5" />
              Agendar
            </Button>
          </Link>
        </div>
      ) : null}

      {/* Resumo do plano — só quando tem alguma coleta */}
      {!journey.isEmpty ? (
        <div className="flex flex-wrap gap-3 rounded-xl bg-brand-50/60 px-4 py-3 text-[13px]">
          <Stat label="Realizadas" value={`${journey.completedCount}`} />
          <span className="text-muted">·</span>
          <Stat label="Agendadas" value={`${journey.scheduledCount}`} />
          <span className="text-muted">·</span>
          <Stat
            label="Faltam pro plano"
            value={`${journey.remaining} de ${journey.expectedTotal}`}
            highlight={journey.remaining > 0}
          />
        </div>
      ) : null}

      {/* Lista de eventos */}
      {journey.isEmpty ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-2">
          {journey.bookings.map((b) => {
            const date = new Date(b.scheduledAtISO);
            const isFuture = b.status === "scheduled" && date.getTime() >= Date.now();
            const isInitial = journey.initialBooking?.id === b.id;
            const localText =
              b.location === "home"
                ? `Coleta domiciliar${b.address?.city ? ` · ${b.address.city}/${b.address.state}` : ""}`
                : "Laboratório parceiro";
            const subtitle = (
              <>
                {formatDatePtBR(b.scheduledAtISO)} às {formatTimePt(b.scheduledAtISO)}
                {" · "}
                {localText}
              </>
            );
            return (
              <EventRow
                key={b.id}
                date={date}
                title={isInitial ? "Coleta inicial" : "Coleta de followup"}
                subtitle={subtitle}
                badge={<StatusBadge status={b.status} />}
                variant={isFuture ? "future" : "default"}
              />
            );
          })}

          {/* Sugestão fantasma — só quando faz sentido */}
          {journey.suggestedNextDate ? (
            <EventRow
              date={journey.suggestedNextDate}
              title="Próxima coleta sugerida"
              subtitle={
                <>
                  Recomendamos repetir a coleta {6} meses depois da última pra
                  ver evolução do protocolo.{" "}
                  <Link
                    href="/coleta/agendar"
                    className="font-medium text-brand-700 hover:text-brand-900"
                  >
                    Agendar
                  </Link>
                </>
              }
              badge={
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-brand-700 ring-1 ring-brand-200">
                  <Sparkles className="h-3 w-3" />
                  Sugestão
                </span>
              }
              variant="ghost"
            />
          ) : null}
        </ul>
      )}
    </Card>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className={cn(
          "font-semibold",
          highlight ? "text-brand-800" : "text-ink",
        )}
      >
        {value}
      </span>
      <span className="text-muted">{label}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-5">
      <p className="text-[13.5px] text-muted">
        Você ainda não tem coletas agendadas. A inicial é o ponto de partida do
        seu protocolo Longevify.
      </p>
      <Link href="/coleta/agendar">
        <Button variant="primary" size="sm">
          <CalendarPlus className="h-4 w-4" />
          Agendar primeira coleta
        </Button>
      </Link>
    </div>
  );
}
