import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PLANS, type Plan } from "@/lib/billing/plans";
import { formatBRL } from "@/lib/products";
import { cn } from "@/lib/utils";

export default function PlanosPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10">
      <header className="pb-8">
        <span className="text-[13px] text-muted">Assinatura</span>
        <h1 className="text-[40px] leading-[1.05] font-semibold tracking-tight">
          Planos Longevify
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-muted">
          Escolha como quer cuidar da sua saúde. Todos os planos são anuais e
          incluem coleta de sangue, plataforma e Concierge IA.
        </p>
      </header>

      <div className="mb-8 inline-flex items-center gap-1 rounded-full border border-border bg-white p-1">
        <span className="rounded-full bg-brand-900 px-4 py-1.5 text-[13px] font-medium text-white">
          Anual
        </span>
        <span className="px-4 py-1.5 text-[13px] font-medium text-muted/70">
          Mensal — em breve
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      <section className="mt-14">
        <h2 className="text-[24px] font-semibold leading-tight">
          Perguntas frequentes
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <FAQ
            question="O que está incluso no plano?"
            answer="Coleta de sangue (1 ou 2 por ano dependendo do plano), análise dos 50+ biomarcadores, plataforma completa, Concierge IA, protocolo personalizado e integrações com wearables. Premium e Concierge incluem consultas médicas."
          />
          <FAQ
            question="Posso cancelar a qualquer momento?"
            answer="Sim. O cancelamento pode ser feito direto na plataforma. Se cancelar antes do uso da segunda coleta, devolvemos a parte proporcional do valor pago."
          />
          <FAQ
            question="Quais formas de pagamento?"
            answer="Cartão de crédito em até 12x sem juros, Pix à vista com 5% de desconto ou boleto à vista. O processamento é feito via Stripe."
          />
          <FAQ
            question="Posso trocar de plano depois?"
            answer="Pode. O upgrade é cobrado prorata e o downgrade entra em vigor no próximo ciclo de renovação."
          />
        </div>
      </section>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const monthly = Math.round(plan.priceBRL / 12);
  return (
    <Card
      className={cn(
        "relative flex flex-col gap-5 p-6",
        plan.highlight
          ? "border-brand-500 bg-white shadow-[0_24px_60px_-32px_rgba(13,40,24,.32)] ring-1 ring-brand-500"
          : "bg-white",
      )}
    >
      {plan.badge ? (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-brand-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
          <Sparkles className="h-3 w-3" />
          {plan.badge}
        </span>
      ) : null}

      <div className="flex flex-col gap-2">
        <h2 className="text-[22px] font-semibold leading-tight">{plan.name}</h2>
        <p className="text-[13.5px] text-muted">{plan.tagline}</p>
      </div>

      <div className="flex flex-col gap-1 border-y border-border py-5">
        <div className="flex items-baseline gap-2">
          <span className="text-[36px] font-semibold tabular-nums leading-none">
            {formatBRL(plan.priceBRL)}
          </span>
          <span className="text-[13px] text-muted">/ano</span>
        </div>
        <span className="text-[12.5px] text-muted">
          12x de {formatBRL(monthly)} sem juros · ou Pix com 5% de desconto
        </span>
      </div>

      <ul className="flex flex-col gap-2.5">
        {plan.features.map((feat) => (
          <li
            key={feat}
            className="flex items-start gap-2 text-[13.5px] leading-snug"
          >
            <span
              className={cn(
                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                plan.highlight
                  ? "bg-brand-500 text-white"
                  : "bg-brand-100 text-brand-700",
              )}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="text-ink">{feat}</span>
          </li>
        ))}
      </ul>

      <Link href={`/planos/${plan.id}`} className="mt-auto">
        <Button
          variant={plan.highlight ? "primary" : "outline"}
          size="lg"
          className="w-full"
        >
          {plan.cta}
        </Button>
      </Link>
    </Card>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <h3 className="text-[15px] font-semibold leading-tight">{question}</h3>
      <p className="text-[13.5px] leading-relaxed text-muted">{answer}</p>
    </Card>
  );
}
