"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { CartTrigger } from "@/components/cart/cart-trigger";
import { ProfileMenu } from "@/components/app/profile-menu";
import { InviteModal } from "@/components/app/invite-modal";
import { useCurrentUser } from "@/lib/auth/user-context";

/**
 * Top nav do app autenticado.
 *
 * Lucas (2026-05-19): "no app (mobile version), o ideal seria colocar
 * as abas embaixo como se fosse um app normal de telefone".
 *
 * Por isso:
 *   - Desktop (sm+): nav inline cobre toda a navegação (Home, Dados,
 *     Protocolo, Dieta, Ciclo, Loja, Concierge)
 *   - Mobile (< sm): apenas logo + cart + profile. A navegação
 *     principal vive no BottomNav (componente separado, fixo na bottom)
 *
 * Removido: hamburger menu + dropdown que existia em mobile — agora a
 * navegação está sempre visível na bottom nav, sem precisar abrir menu.
 */

const NAV = [
  { href: "/home", label: "Home" },
  { href: "/dados", label: "Dados" },
  { href: "/protocolo", label: "Protocolo" },
  { href: "/dieta", label: "Dieta" },
  { href: "/ciclo", label: "Ciclo" },
  { href: "/loja", label: "Loja" },
  { href: "/concierge", label: "Concierge" },
];

export function TopNav() {
  const pathname = usePathname();
  const [inviteOpen, setInviteOpen] = useState(false);
  const user = useCurrentUser();

  return (
    <header
      className="sticky top-0 z-30 border-b border-border/70 bg-white/85 backdrop-blur-md"
      style={{
        // safe-area-inset-top: cobre o notch/Dynamic Island do iPhone
        // quando rodando como PWA standalone (Add to Home Screen) ou
        // dentro do Capacitor. Sem isso, status bar (horário/wifi)
        // sobrepõe os botões do header.
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-3 px-4 sm:h-16 sm:gap-8 sm:px-6">
        <Link
          href="/home"
          aria-label="Longevify"
          className="inline-flex shrink-0 items-center"
        >
          <Logo />
        </Link>

        {/* Nav inline — só desktop (sm+). Em mobile vive na BottomNav. */}
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
              <span className="grid h-11 w-11 place-items-center rounded-full text-muted hover:text-ink sm:h-9 sm:w-9">
                <ShoppingBag className="h-4 w-4" />
              </span>
            }
          />
          {/* "Convidar" só mostra em desktop — em mobile o user acessa via profile */}
          <Button
            variant="primary"
            size="md"
            className="hidden sm:inline-flex"
            onClick={() => setInviteOpen(true)}
          >
            Convidar
          </Button>
          <ProfileMenu />
        </div>
      </div>

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        inviterName={user.firstName ?? null}
      />
    </header>
  );
}
