import Link from "next/link";
import { Calendar, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DadosView } from "@/components/dados/dados-view";
import { LabUploadsSection } from "@/components/dados/lab-uploads-section";
import { ColetaCalendar } from "@/components/scheduling/coleta-calendar";
import { getCurrentUser } from "@/lib/auth/current-user";
import { biomarkersStatsFrom, loadDadosForUser } from "@/lib/dados/server";
import { listLabUploadsForCurrentUser } from "@/lib/labs/server";
import { biomarkersStats as mockStats } from "@/lib/mock-data";
import { getUserBookings } from "@/lib/scheduling/bookings";
import { buildColetaJourney } from "@/lib/scheduling/journey";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DadosPage() {
  const user = await getCurrentUser();
  const [{ patient, biomarkers, hasExams }, labUploads, bookings] =
    await Promise.all([
      loadDadosForUser({ userId: user.id, isDemo: user.isDemo }),
      user.isDemo ? Promise.resolve([]) : listLabUploadsForCurrentUser(),
      user.isDemo
        ? Promise.resolve({ upcoming: [], past: [] })
        : getUserBookings(),
    ]);

  const journey = buildColetaJourney({
    upcoming: bookings.upcoming,
    past: bookings.past,
  });

  if (!hasExams) {
    return (
      <div className="mx-auto w-full max-w-[820px] px-6 py-12">
        <header className="pb-6">
          <span className="text-[13px] text-muted">Dados clínicos</span>
          <h1 className="mt-1 text-[40px] leading-[1.05] font-semibold tracking-tight">
            {journey.completedCount > 0
              ? "Resultados em processamento"
              : journey.scheduledCount > 0
                ? "Sua coleta está marcada"
                : "Seu painel ainda está vazio"}
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] text-muted">
            {journey.completedCount > 0
              ? "Sua coleta foi realizada — os biomarcadores estão sendo processados pelo laboratório. Em alguns dias úteis você verá tudo aqui."
              : journey.scheduledCount > 0
                ? "Já temos sua coleta agendada. Assim que ela for realizada e o laboratório enviar os resultados, esta tela vai mostrar mais de 100 biomarcadores com evolução temporal."
                : "Esta tela vai mostrar mais de 100 biomarcadores, evolução temporal, faixas ótima/normal/fora e recomendações por categoria — assim que seu primeiro exame for processado."}
          </p>
        </header>

        {/* Calendar primeiro quando user já tem booking — vira a ação principal */}
        {!journey.isEmpty ? (
          <ColetaCalendar journey={journey} className="mb-6" />
        ) : (
          <Card className="flex flex-col items-start gap-4 border-brand-200 bg-brand-50/40 p-6">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-brand-700">
              <FlaskConical className="h-6 w-6" />
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="text-[18px] font-semibold tracking-tight">
                Faça sua primeira coleta
              </h2>
              <p className="text-[14px] text-muted">
                Coleta domiciliar com profissional Longevify ou no laboratório
                parceiro. Resultado processado em até 5 dias úteis.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/coleta/agendar">
                <Button variant="primary">
                  <Calendar className="h-4 w-4" />
                  Agendar coleta
                </Button>
              </Link>
              <Link href="/loja">
                <Button variant="outline">Ver tipos de painel</Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Mesmo sem exames Longevify, o user pode anexar exames antigos
            pra alimentar o histórico. */}
        <div className="mt-8">
          <LabUploadsSection uploads={labUploads} enabled={!user.isDemo} />
        </div>
      </div>
    );
  }

  // Demo user usa o mock-stats (≈106 marcadores) pra UI bater com a tela
  // antiga; user real usa stats derivado dos biomarcadores carregados.
  const stats = user.isDemo ? mockStats() : biomarkersStatsFrom(biomarkers);

  return (
    <>
      <DadosView patient={patient} biomarkers={biomarkers} stats={stats} />
      <div className="mx-auto w-full max-w-[1280px] px-6 pb-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          <div className="hidden lg:block" />
          <div className="flex flex-col gap-6">
            {!user.isDemo ? (
              <ColetaCalendar journey={journey} />
            ) : null}
            <LabUploadsSection uploads={labUploads} enabled={!user.isDemo} />
          </div>
        </div>
      </div>
    </>
  );
}
