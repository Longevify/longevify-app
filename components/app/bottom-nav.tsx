"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ClipboardList,
  Dumbbell,
  Flower2,
  Home,
  MoreHorizontal,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  Watch,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom tab bar — só visível em mobile (sm:hidden).
 *
 * Lucas (2026-05-19, v2): "coloque um ícone para home, dados, protocolo,
 * loja e um icone que abre opções para mais abas (ciclo, dieta e outros
 * que tiver)."
 *
 * 4 slots fixos + 1 "Mais" que abre sheet com abas extras.
 */

interface NavItem {
  href: string;
  label: string;
  Icon: typeof Home;
}

const PRIMARY_TABS: NavItem[] = [
  { href: "/home", label: "Home", Icon: Home },
  { href: "/dados", label: "Dados", Icon: Activity },
  { href: "/protocolo", label: "Protocolo", Icon: ClipboardList },
  { href: "/loja", label: "Loja", Icon: ShoppingBag },
];

const MORE_TABS: NavItem[] = [
  { href: "/fitness", label: "Fitness", Icon: Dumbbell },
  { href: "/ciclo", label: "Ciclo", Icon: Flower2 },
  { href: "/dieta", label: "Dieta", Icon: UtensilsCrossed },
  { href: "/concierge", label: "Concierge", Icon: Sparkles },
  { href: "/wearables", label: "Wearables", Icon: Watch },
];

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Lucas (2026-05-20): "o widget flutuante do Dr Lon deve desaparecer,
  // enquanto aba 'mais' do footer do app estiver aberta." Comunicação
  // entre BottomNav e DrLonFloating via custom event — ambos são client
  // components, sem precisar de context provider.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("longevify:bottom-sheet-toggle", {
        detail: { open: moreOpen },
      }),
    );
  }, [moreOpen]);

  // Active state das abas secundárias (pra destacar o ícone "Mais" quando
  // a rota atual é uma das do sheet)
  const inMoreSection = MORE_TABS.some(
    (t) => pathname === t.href || pathname.startsWith(t.href + "/"),
  );

  return (
    <>
      <nav
        data-tour="bottom-nav"
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-white/95 backdrop-blur-md",
          "sm:hidden",
        )}
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
        }}
        aria-label="Navegação principal"
      >
        <ul className="grid grid-cols-5">
          {PRIMARY_TABS.map(({ href, label, Icon }) => {
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
          {/* Slot 5: botão "Mais" */}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-label="Mais opções"
              aria-expanded={moreOpen}
              className={cn(
                "flex h-14 w-full items-center justify-center transition-colors",
                inMoreSection || moreOpen
                  ? "text-brand-700"
                  : "text-zinc-400 hover:text-zinc-700",
              )}
            >
              <span
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-xl transition-colors",
                  (inMoreSection || moreOpen) && "bg-brand-50",
                )}
              >
                <MoreHorizontal
                  className="h-[22px] w-[22px]"
                  strokeWidth={inMoreSection || moreOpen ? 2.4 : 1.8}
                />
              </span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Sheet "Mais" — slide up bottom sheet com abas secundárias */}
      {moreOpen && <MoreSheet pathname={pathname} onClose={() => setMoreOpen(false)} />}
    </>
  );
}

function MoreSheet({
  pathname,
  onClose,
}: {
  pathname: string;
  onClose: () => void;
}) {
  // ESC fecha
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end sm:hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className="relative z-10 rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-200"
        style={{
          paddingBottom:
            "calc(max(env(safe-area-inset-bottom), 8px) + 72px)", // 72px = altura do bottom nav
        }}
        role="dialog"
        aria-label="Mais opções"
      >
        <header className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900">
            Mais
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="grid grid-cols-4 gap-2 px-5 pt-2 pb-4">
          {MORE_TABS.map(({ href, label, Icon }) => {
            const active =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-zinc-700 hover:bg-zinc-50",
                )}
              >
                <span
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-xl",
                    active ? "bg-brand-100" : "bg-zinc-100",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                </span>
                <span className="text-[11px] font-medium leading-tight text-center">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
