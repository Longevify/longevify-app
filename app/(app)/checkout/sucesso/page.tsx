"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Mail, Package, Truck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/products";

interface StoredOrder {
  id: string;
  total: number;
  email: string;
  payment: "card" | "pix" | "boleto";
}

export default function CheckoutSuccessPage() {
  const [order, setOrder] = useState<StoredOrder | null>(null);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("longevify.lastOrder");
      if (raw) setOrder(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-16">
      <Card className="flex flex-col items-center gap-5 p-10 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand-700">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div>
          <span className="text-[12px] uppercase tracking-[0.14em] text-muted">
            Pedido confirmado
          </span>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">
            Tudo certo por aqui
          </h1>
          <p className="mt-2 text-[14px] text-muted">
            Obrigado pela confiança. A equipe Longevify já está preparando o
            envio.
          </p>
        </div>

        <div className="w-full rounded-[16px] border border-border bg-brand-50/40 px-5 py-4 text-left">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted">Número do pedido</span>
            <span className="font-mono font-semibold text-ink">
              {order?.id ?? "LGV-000000"}
            </span>
          </div>
          {order ? (
            <div className="mt-1.5 flex items-center justify-between text-[13px]">
              <span className="text-muted">Total</span>
              <span className="font-semibold text-ink">
                {formatBRL(order.total)}
              </span>
            </div>
          ) : null}
          {order?.email ? (
            <div className="mt-1.5 flex items-center justify-between text-[13px]">
              <span className="text-muted">Comprovante</span>
              <span className="text-ink">{order.email}</span>
            </div>
          ) : null}
        </div>

        <ul className="w-full space-y-3 text-left">
          <NextStep
            icon={<Mail className="h-4 w-4" />}
            title="Confirmação por email"
            description="Você receberá os detalhes e o comprovante em instantes."
          />
          <NextStep
            icon={<Package className="h-4 w-4" />}
            title="Separação e despacho"
            description="Nossa central separa seu kit e despacha em até 1 dia útil."
          />
          <NextStep
            icon={<Truck className="h-4 w-4" />}
            title="Entrega em 3 a 5 dias úteis"
            description="Acompanhe o rastreio direto no seu email."
          />
        </ul>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Link href="/loja">
            <Button variant="primary" size="lg">
              Voltar pra loja
            </Button>
          </Link>
          <Link href="/home">
            <Button variant="outline" size="lg">
              Ir pra home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

function NextStep({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-[14px] border border-border bg-surface px-4 py-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
        {icon}
      </span>
      <div>
        <div className="text-[13.5px] font-semibold">{title}</div>
        <div className="text-[12.5px] text-muted">{description}</div>
      </div>
    </li>
  );
}
