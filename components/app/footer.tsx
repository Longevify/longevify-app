import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface/40">
      <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-5 text-[12px] text-muted">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <Link href="/termos" className="hover:text-ink">
            Termos
          </Link>
          <span aria-hidden="true" className="text-border">
            ·
          </span>
          <Link href="/privacidade" className="hover:text-ink">
            Privacidade
          </Link>
          <span aria-hidden="true" className="text-border">
            ·
          </span>
          <Link href="/lgpd" className="hover:text-ink">
            LGPD
          </Link>
          <span aria-hidden="true" className="text-border">
            ·
          </span>
          <Link href="/perfil/suporte" className="hover:text-ink">
            Suporte
          </Link>
        </nav>
        <span className="text-muted/80">© 2026 Longevify</span>
      </div>
    </footer>
  );
}
