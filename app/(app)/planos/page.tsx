import Link from "next/link";
import { Check, CheckCircle2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/billing/plans";
import { formatBRL } from "@/lib/products";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/current-user";

type PlanWithMonthly = (typeof PLANS)[number];

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Identifica qual plano o user tá pagando atualmente.
 *
 * TODO (Wave 4): trocar pela leitura real de subscriptions Stripe quando
 * o webhook de billing começar a popular uma tabela `subscriptions`.
 * Por ora, fallback heurístico: usuários ativos têm o plano `highlight`
 * (Premium). Demo/não-logado: nenhum plano marcado como atual.
 */
async function getCurrentPlanId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (user.isDemo) return null;
  // Heurística temporária: assume Premium pra qualquer user real.
  const fallback = PLANS.find((p) => p.highlight) ?? PLANS[0];
  return fallback.id;
}

export default async function PlanosPage() {
  const currentPlanId = await getCurrentPlanId();

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10">
      <header className="pb-8">
        <span className="text-[13px] text-muted">Assinatura</span>
        <h1 className="text-[40px] leading-[1.05] font-semibold tracking-tight">
          Planos Longevify
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-muted">
          Cobrança mensal — você pode cancelar a qualquer momento. Todos os
          planos incluem coleta de sangue, plataforma e Concierge IA.
        </p>
      </header>

      {currentPlanId ? (
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/60 px-3 py-1.5 text-[13px] font-medium text-brand-800">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Plano atual:{" "}
          {PLANS.find((p) => p.id === currentPlanId)?.name ?? "—"}
        </div>
      ) : null}

      {/* M6: gap-4 → gap-6 — compensa badge absolute -top-3 que sobrepunha card anterior em mobile */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={plan.id === currentPlanId}
          />
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
            answer="Sim. O cancelamento pode ser feito direto na plataforma — a cobrança mensal para no fim do ciclo atual e você mantém acesso até lá."
          />
          <FAQ
            question="Quais formas de pagamento?"
            answer="Cartão de crédito (cobrança mensal recorrente), Pix mensal ou boleto mensal."
          />
          <FAQ
            question="Posso trocar de plano depois?"
            answer="Pode. O upgrade é cobrado prorata e o downgrade entra em vigor no próximo ciclo de cobrança."
          />
        </div>
      </section>
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
}: {
  plan: PlanWithMonthly;
  isCurrent: boolean;
}) {
  // Preço mensal de exibição. Prioriza o monthlyDisplayBRL curado;
  // senão deriva de priceBRL/12 como fallback.
  const monthlyPrice =
    plan.monthly?.monthlyDisplayBRL ?? Math.round(plan.priceBRL / 12);
  const strike = plan.monthly?.strikePriceBRL
    ? Math.round(plan.monthly.strikePriceBRL / 12)
    : null;

  return (
    <Card
      className={cn(
        "relative flex flex-col gap-4 p-5",
        isCurrent
          ? "border-brand-700 bg-brand-50/40 ring-2 ring-brand-700"
          : plan.highlight
            ? "border-brand-500 bg-white shadow-[0_24px_60px_-32px_rgba(13,40,24,.32)] ring-1 ring-brand-500"
            : "bg-white",
      )}
    >
      {isCurrent ? (
        <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-brand-700 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
          <CheckCircle2 className="h-3 w-3" />
          Plano atual
        </span>
      ) : plan.badge ? (
        <span
          className={cn(
            "absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
            plan.highlight
              ? "bg-brand-900 text-white"
              : "bg-brand-100 text-brand-800",
          )}
        >
          {plan.highlight ? <Sparkles className="h-3 w-3" /> : null}
          {plan.badge}
        </span>
      ) : null}

      <div className="flex flex-col gap-1.5 pt-1">
        <h2 className="text-[18px] font-semibold leading-tight">{plan.name}</h2>
        <p className="text-[12.5px] leading-snug text-muted">{plan.tagline}</p>
      </div>

      <div className="flex flex-col gap-1 border-y border-border py-4">
        <div className="flex items-baseline gap-1.5">
          {strike ? (
            <span className="text-[14px] text-muted/70 line-through">
              {formatBRL(strike)}
            </span>
          ) : null}
          <span className="text-[30px] font-semibold tabular-nums leading-none">
            {formatBRL(monthlyPrice)}
          </span>
          <span className="text-[12px] text-muted">/mês</span>
        </div>
        <span className="text-[11.5px] text-muted">
          Cobrança mensal · cancele quando quiser
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {plan.features.map((feat) => (
          <li
            key={feat}
            className="flex items-start gap-2 text-[12.5px] leading-snug"
          >
            <span
              className={cn(
                "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full",
                isCurrent
                  ? "bg-brand-700 text-white"
                  : plan.highlight
                    ? "bg-brand-500 text-white"
                    : "bg-brand-100 text-brand-700",
              )}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            <span className="text-ink">{feat}</span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <Button variant="outline" size="md" className="mt-auto w-full" disabled>
          <CheckCircle2 className="h-4 w-4" />
          Seu plano ativo
        </Button>
      ) : (
        <Link href={`/planos/${plan.id}`} className="mt-auto">
          <Button
            variant={plan.highlight ? "primary" : "outline"}
            size="md"
            className="w-full"
          >
            {plan.cta}
          </Button>
        </Link>
      )}
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

