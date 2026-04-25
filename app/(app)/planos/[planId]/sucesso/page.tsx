import Link from "next/link";
import { ArrowRight, CheckCircle2, Activity, FileSearch, Watch } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPlanById } from "@/lib/billing/plans";
import { PATIENT } from "@/lib/mock-data";
import { formatBRL } from "@/lib/products";

interface NextStep {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NEXT_STEPS: NextStep[] = [
  {
    href: "/concierge",
    label: "Agendar coleta de sangue",
    description:
      "Escolha um horário e endereço — coleta domiciliar incluída no plano.",
    icon: Activity,
  },
  {
    href: "/perfil",
    label: "Completar seu perfil",
    description:
      "Metas, histórico clínico e medicações ajudam a personalizar o protocolo.",
    icon: FileSearch,
  },
  {
    href: "/wearables",
    label: "Conectar wearables",
    description:
      "Oura, Whoop, Garmin ou Apple Health — tudo num lugar só.",
    icon: Watch,
  },
];

export default async function PlanSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ session_id?: string; demo?: string }>;
}) {
  const { planId } = await params;
  const { session_id, demo } = await searchParams;
  const plan = getPlanById(planId);
  const isDemo = demo === "true";

  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-16">
      <div className="flex flex-col items-center text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-[#DFF5E9] text-[color:var(--color-status-optimal)]">
          <CheckCircle2 className="h-12 w-12" strokeWidth={2.2} />
        </div>
        <h1 className="mt-6 text-[40px] leading-[1.05] font-semibold tracking-tight">
          Bem-vindo à Longevify, {PATIENT.firstName}!
        </h1>
        <p className="mt-3 max-w-md text-[15px] text-muted">
          {plan
            ? `Sua assinatura do plano ${plan.name} (${formatBRL(plan.priceBRL)}/ano) está ativa.`
            : "Sua assinatura está ativa."}{" "}
          {isDemo
            ? "Esta é uma simulação — nenhuma cobrança foi processada."
            : "Você vai receber um e-mail com o recibo em instantes."}
        </p>
        {session_id ? (
          <span className="mt-3 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-mono text-brand-800">
            sessão: {session_id.slice(0, 18)}…
          </span>
        ) : null}
      </div>

      <Card className="mt-10 flex flex-col gap-1 p-6">
        <h2 className="text-[18px] font-semibold leading-tight">Próximos passos</h2>
        <p className="text-[12.5px] text-muted">
          Tudo o que vai acontecer nas próximas semanas — comece agora.
        </p>
        <div className="mt-4 flex flex-col divide-y divide-border">
          {NEXT_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <Link
                key={step.href}
                href={step.href}
                className="group flex items-center gap-4 py-4 first:pt-0 last:pb-0"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700 group-hover:bg-brand-200">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="text-[14px] font-semibold leading-tight">
                    {step.label}
                  </span>
                  <span className="text-[12.5px] text-muted">
                    {step.description}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted/60 group-hover:text-ink" />
              </Link>
            );
          })}
        </div>
      </Card>

      <div className="mt-8 flex justify-center">
        <Link href="/home">
          <Button variant="primary" size="lg">
            Ir para a home
          </Button>
        </Link>
      </div>
    </div>
  );
}
