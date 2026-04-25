"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
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
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-white/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-8 px-6">
        <Link
          href="/home"
          aria-label="Longevify"
          className="inline-flex shrink-0 items-center"
        >
          <Logo />
        </Link>
        <nav className="flex flex-1 items-center gap-1">
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
        <div className="flex items-center gap-3">
          <CartTrigger
            fallback={
              <span className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-ink">
                <ShoppingBag className="h-4 w-4" />
              </span>
            }
          />
          <Button variant="primary" size="md">
            Convidar
          </Button>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
