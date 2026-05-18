"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for observability in dev; in prod this would ship to Sentry etc.
    console.error("[longevify] app error boundary:", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-16">
      <Card className="flex flex-col items-center gap-5 p-10 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-[#FBECEC] text-[color:var(--color-status-out)]">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div>
          <span className="text-[12px] uppercase tracking-[0.14em] text-muted">
            Algo deu errado
          </span>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight">
            Não conseguimos abrir esta tela agora
          </h1>
          <p className="mt-2 text-[14px] text-muted">
            Tivemos um imprevisto inesperado. Você pode tentar novamente em um
            clique — seus dados e seu carrinho estão salvos.
          </p>
        </div>

        {error?.digest ? (
          <code className="rounded-full bg-brand-50 px-3 py-1 text-[11px] text-brand-800">
            ref: {error.digest}
          </code>
        ) : null}

        {/* Mensagem técnica do erro — vital pra debug em mobile onde
            Lucas não tem console. Mostra a primeira linha do erro num
            <details> colapsado pra não assustar o user comum. */}
        {error?.message ? (
          <details className="w-full max-w-md text-left">
            <summary className="cursor-pointer text-[11px] text-muted hover:text-ink">
              Detalhes técnicos
            </summary>
            <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-zinc-50 p-2 text-[10px] leading-relaxed text-zinc-600">
              {error.message}
              {error.stack ? `\n\n${error.stack.split("\n").slice(0, 6).join("\n")}` : null}
            </pre>
          </details>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="dark" size="lg" onClick={() => reset()}>
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
          <Link href="/home">
            <Button variant="outline" size="lg">
              Voltar pra home
            </Button>
          </Link>
        </div>

        <p className="text-[12px] text-muted">
          Se persistir, fale com a gente em{" "}
          <a
            href="mailto:suporte@longevify.app"
            className="font-medium text-brand-700 hover:text-brand-800"
          >
            suporte@longevify.app
          </a>
          .
        </p>
      </Card>
    </div>
  );
}
