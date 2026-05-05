"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { CartTrigger } from "@/components/cart/cart-trigger";
import { ProfileMenu } from "@/components/app/profile-menu";

const NAV = [
  { href: "/home", label: "Home" },
  { href: "/dados", label: "Dados" },
  { href: "/protocolo", label: "Protocolo" },
  { href: "/loja", label: "Loja" },
  { href: "/concierge", label: "Concierge" },
];

export function TopNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fecha hamburger ao navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-3 px-4 sm:h-16 sm:gap-8 sm:px-6">
        {/* Hamburger — só mobile (< sm) */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileOpen}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink hover:bg-black/5 sm:hidden"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>

        <Link
          href="/home"
          aria-label="Longevify"
          className="inline-flex shrink-0 items-center"
        >
          <Logo />
        </Link>

        {/* Nav inline — só desktop (sm+) */}
        <nav className="hidden flex-1 items-center gap-1 sm:flex">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-900 text-white"
                    : "text-muted hover:text-ink",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  {item.label}
                  {active && item.label === "Dados" ? (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-400" />
                  ) : null}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Spacer pra empurrar controls pra direita em mobile */}
        <div className="flex-1 sm:hidden" />

        <div className="flex items-center gap-1 sm:gap-3">
          <CartTrigger
            fallback={
              <span className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-ink">
                <ShoppingBag className="h-4 w-4" />
              </span>
            }
          />
          {/* "Convidar" só mostra em desktop — em mobile o user acessa via menu */}
          <Button variant="primary" size="md" className="hidden sm:inline-flex">
            Convidar
          </Button>
          <ProfileMenu />
        </div>
      </div>

      {/* Mobile dropdown menu — slide down quando hamburger aberto */}
      {mobileOpen ? (
        <nav
          className="border-t border-border/70 bg-white sm:hidden"
          aria-label="Menu mobile"
        >
          <div className="mx-auto flex max-w-[1280px] flex-col gap-1 px-4 py-3">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-xl px-4 py-3 text-[15px] font-medium",
                    active
                      ? "bg-brand-900 text-white"
                      : "text-ink hover:bg-brand-50/40",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-2 border-t border-border/70 pt-3">
              <Button variant="primary" size="md" className="w-full">
                Convidar
              </Button>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
