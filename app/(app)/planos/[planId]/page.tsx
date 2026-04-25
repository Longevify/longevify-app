"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CreditCard,
  Loader2,
  QrCode,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PAYMENT_METHODS,
  computeFinalPrice,
  getPlanById,
  type PaymentMethod,
} from "@/lib/billing/plans";
import { formatBRL } from "@/lib/products";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const ICONS: Record<PaymentMethod, React.ComponentType<{ className?: string }>> = {
  card: CreditCard,
  pix: QrCode,
  boleto: ScrollText,
};

export default function PlanCheckoutPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);
  const plan = getPlanById(planId);
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [submitting, setSubmitting] = useState(false);

  const pricing = useMemo(() => {
    if (!plan) return null;
    return computeFinalPrice(plan, method);
  }, [plan, method]);

  if (!plan || !pricing) {
    notFound();
  }

  async function handleSubmit() {
    if (!plan) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, paymentMethod: method }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Falha ao iniciar checkout");
      }
      const data = (await res.json()) as { url: string; demo?: boolean };
      if (data.demo) {
        toast.success({
          title: "Modo demo",
          description: "Simulando pagamento sem cobrar de verdade.",
        });
      }
      if (data.url.startsWith("http")) {
        window.location.href = data.url;
      } else {
        router.push(data.url);
      }
    } catch (err) {
      toast.error({
        title: "Não foi possível iniciar o pagamento",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
      setSubmitting(false);
    }
  }

  const stripeDemo =
    typeof window !== "undefined" &&
    !document.cookie.includes("stripe_configured=1");

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10">
      <Link
        href="/planos"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para os planos
      </Link>

      <header className="mt-4 pb-8">
        <span className="text-[13px] text-muted">Assinatura · {plan.name}</span>
        <h1 className="text-[36px] leading-[1.05] font-semibold tracking-tight">
          Assinar plano {plan.name}
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">{plan.tagline}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(0,420px)]">
        {/* Esquerda — resumo do plano */}
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-5 p-6">
            <div>
              <h2 className="text-[18px] font-semibold leading-tight">
                O que está incluso
              </h2>
              <p className="text-[12.5px] text-muted">
                Cobrança anual, renovação automática. Cancele quando quiser.
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {plan.features.map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-[13.5px]">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="flex flex-col gap-3 p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-[14px] font-semibold leading-tight">
                  Segurança e privacidade
                </h3>
                <p className="text-[12.5px] text-muted">
                  Pagamento processado pela Stripe (PCI-DSS nível 1). Seus dados
                  clínicos ficam criptografados.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Direita — checkout */}
        <aside className="flex flex-col gap-3">
          <Card className="flex flex-col gap-5 p-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted">
                Forma de pagamento
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {PAYMENT_METHODS.map((m) => {
                  const Icon = ICONS[m.id];
                  const selected = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      aria-pressed={selected}
                      className={cn(
                        "flex items-center gap-3 rounded-[14px] border px-3 py-3 text-left transition",
                        selected
                          ? "border-brand-500 bg-brand-50"
                          : "border-border bg-white hover:border-brand-300 hover:bg-brand-50/40",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-full",
                          selected
                            ? "bg-brand-500 text-white"
                            : "bg-brand-50 text-brand-700",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex flex-col">
                        <span className="text-[13.5px] font-medium leading-tight">
                          {m.label}
                        </span>
                        <span className="text-[11.5px] text-muted">
                          {m.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <dl className="space-y-1.5 border-t border-border pt-4 text-[13px]">
              <div className="flex items-center justify-between text-muted">
                <dt>Plano {plan.name} (anual)</dt>
                <dd className="tabular-nums text-ink">
                  {formatBRL(plan.priceBRL)}
                </dd>
              </div>
              {pricing.discount > 0 ? (
                <div className="flex items-center justify-between text-[#137a4f]">
                  <dt>Desconto Pix</dt>
                  <dd className="tabular-nums">
                    -{formatBRL(pricing.discount)}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between pt-2 text-[16px] font-semibold text-ink">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatBRL(pricing.total)}</dd>
              </div>
              <div className="flex items-center justify-between pt-1 text-[12px] text-muted">
                <dt>
                  {pricing.installments > 1
                    ? `${pricing.installments}x sem juros`
                    : "Pagamento à vista"}
                </dt>
                <dd className="tabular-nums">
                  {pricing.installments > 1
                    ? formatBRL(pricing.installmentValue)
                    : formatBRL(pricing.total)}
                </dd>
              </div>
            </dl>

            {stripeDemo ? (
              <div className="flex items-start gap-2 rounded-[12px] border border-[#E8C775] bg-[#FFF8E5] px-3 py-2.5 text-[12px] text-[#5C4400]">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Modo demo — Stripe não configurado. O botão simula o
                  pagamento sem cobrar.
                </span>
              </div>
            ) : null}

            <Button
              type="button"
              variant="dark"
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecionando
                </>
              ) : (
                "Assinar via Stripe"
              )}
            </Button>

            <p className="text-[11px] leading-relaxed text-muted">
              Ao assinar, você concorda com os{" "}
              <Link href="/termos" className="underline">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link href="/privacidade" className="underline">
                Política de Privacidade
              </Link>
              . Renovação automática anual; cancele a qualquer momento.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
