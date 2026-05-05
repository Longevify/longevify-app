"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Error boundary do Next 14+ App Router. Capturado em qualquer erro
 * client-side dentro do app tree. Usuário pode tentar `reset()` pra
 * re-render o segmento que falhou, ou navegar pra outro lugar.
 *
 * Sem esse arquivo, Next mostra mensagem técnica em inglês com stack
 * trace exposto — péssima UX e potencialmente vaza info de infra.
 *
 * Logging: enviar pra Sentry / Vercel Logs em produção. Por enquanto
 * só console.error pro dev.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[error boundary]", error);
    // TODO: enviar pra observability (Sentry / Vercel logs)
  }, [error]);

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-page px-6"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto w-full max-w-md text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-[#FBE1E1] text-[#B6333A]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-10 w-10"
            aria-hidden
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h1 className="text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">
          Ops, algo deu errado
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Encontramos um problema inesperado nessa parte do app. Já estamos
          investigando. Tenta de novo ou volta pra Home.
        </p>
        {error.digest ? (
          <p className="mt-4 inline-block rounded-full bg-brand-50 px-3 py-1 text-[11px] font-mono text-muted">
            ID: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-brand-700 px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-800"
          >
            Tentar novamente
          </button>
          <Link
            href="/home"
            className="inline-flex items-center justify-center rounded-full border border-border bg-white px-6 py-2.5 text-[14px] font-medium text-ink hover:bg-brand-50"
          >
            Voltar pra Home
          </Link>
        </div>
      </div>
    </main>
  );
}
