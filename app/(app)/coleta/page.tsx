import Link from "next/link";
import { CalendarPlus, ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingCard } from "@/components/scheduling/booking-card";
import { getUserBookings } from "@/lib/scheduling/bookings";

export const metadata = {
  title: "Minhas coletas — Longevify",
};

export default async function ColetaPage() {
  const { upcoming, past } = await getUserBookings();
  const total = upcoming.length + past.length;

  return (
    <div className="mx-auto w-full max-w-[920px] px-6 py-10">
      <Link
        href="/home"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Voltar
      </Link>

      <header className="mt-4 flex flex-col gap-2 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[13px] text-muted">Coleta</span>
          <h1 className="text-[34px] leading-[1.05] font-semibold tracking-tight">
            Minhas coletas
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] text-muted">
            Histórico de agendamentos. Cada coleta inclui botão para salvar no
            seu calendário pessoal e cancelar se precisar.
          </p>
        </div>
        <Link href="/coleta/agendar">
          <Button variant="primary" size="md">
            <CalendarPlus className="h-4 w-4" />
            Nova coleta
          </Button>
        </Link>
      </header>

      {total === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-700">
            <CalendarPlus className="h-5 w-5" />
          </span>
          <h2 className="text-[18px] font-semibold leading-tight">
            Você ainda não tem coletas agendadas
          </h2>
          <p className="max-w-md text-[13.5px] text-muted">
            A primeira coleta é o ponto de partida do seu protocolo Longevify —
            é dela que sai todo o quadro de biomarcadores.
          </p>
          <Link href="/coleta/agendar" className="mt-2">
            <Button variant="primary" size="md">
              Agendar primeira coleta
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {upcoming.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
                Próximas
              </h2>
              {upcoming.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </section>
          ) : null}

          {past.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
                Histórico
              </h2>
              {past.map((b) => (
                <BookingCard key={b.id} booking={b} showActions={false} />
              ))}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
