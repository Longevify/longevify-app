import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Footer } from "@/components/app/footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1100px] items-center justify-between gap-4 px-6">
          <Link href="/" className="inline-flex items-center">
            <Logo />
          </Link>
          <nav className="flex items-center gap-4 text-[13px] text-muted">
            <Link
              href="/termos"
              className="hover:text-ink"
            >
              Termos
            </Link>
            <Link href="/privacidade" className="hover:text-ink">
              Privacidade
            </Link>
            <Link href="/lgpd" className="hover:text-ink">
              LGPD
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
