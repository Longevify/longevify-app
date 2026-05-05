import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Custom 404 page. Renderiza quando rota não existe ou redirect manual
 * via `notFound()`. Sem essa página, Next mostra fallback default em
 * inglês — feio pra app brasileiro de produto premium.
 */
export default function NotFoundPage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-page px-6"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto w-full max-w-md text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-brand-900 text-white shadow-[0_24px_48px_-16px_rgba(13,40,24,0.4)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            className="h-12 w-12"
            aria-hidden
          >
            <path
              d="M 256 158.5 A 130 130 0 1 1 256 353.5 A 130 130 0 1 1 256 158.5 Z"
              stroke="#d8eecf"
              strokeWidth="46"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
        <h1 className="text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">
          Página não encontrada
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          O endereço que você tentou acessar não existe ou foi movido. Vamos
          voltar pra um lugar conhecido?
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/home"
            className="inline-flex items-center justify-center rounded-full bg-brand-700 px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-800"
          >
            Voltar pra Home
          </Link>
          <Link
            href="/concierge"
            className="inline-flex items-center justify-center rounded-full border border-border bg-white px-6 py-2.5 text-[14px] font-medium text-ink hover:bg-brand-50"
          >
            Falar com Concierge
          </Link>
        </div>
      </div>
    </main>
  );
}
