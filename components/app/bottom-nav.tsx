"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Flower2,
  Home,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom tab bar — só visível em mobile (sm:hidden).
 *
 * Lucas (2026-05-19): "no app (mobile version), o ideal seria colocar
 * as abas 'home', 'dados', 'protocolo', etc. embaixo como se fosse um
 * app normal de telefone. Colocar icones para Cada aba, não quero texto."
 *
 * Padrão iOS/Android nativo: 5 slots, ícones sem texto, fixo na bottom,
 * safe-area-inset-bottom (home indicator do iPhone).
 *
 * Abas escolhidas (5 mais usadas no dia-a-dia):
 *   Home · Dados · Dieta · Ciclo · Concierge
 *
 * Protocolo, Loja e demais ficam acessíveis via top-nav (logo + ações)
 * ou via cards na home. Padrão Apple Health / Strava: bottom nav é só
 * pros usos mais frequentes.
 *
 * Em desktop (sm+) esse component vira invisível. TopNav cobre tudo lá.
 */

const TABS = [
  { href: "/home", label: "Home", Icon: Home },
  { href: "/dados", label: "Dados", Icon: Activity },
  { href: "/dieta", label: "Dieta", Icon: UtensilsCrossed },
  { href: "/ciclo", label: "Ciclo", Icon: Flower2 },
  { href: "/concierge", label: "Concierge", Icon: Sparkles },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-white/95 backdrop-blur-md",
        "sm:hidden",
      )}
      style={{
        // Safe area do iPhone — home indicator não cobre os ícones
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
      }}
      aria-label="Navegação principal"
    >
      <ul className="grid grid-cols-5">
        {TABS.map(({ href, label, Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 items-center justify-center transition-colors",
                  active
                    ? "text-brand-700"
                    : "text-zinc-400 hover:text-zinc-700",
                )}
              >
                <span
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-xl transition-colors",
                    active && "bg-brand-50",
                  )}
                >
                  <Icon
                    className="h-[22px] w-[22px]"
                    strokeWidth={active ? 2.4 : 1.8}
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
