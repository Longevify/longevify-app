"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  Package,
  ClipboardList,
  Settings,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/pacientes", label: "Pacientes", icon: Users },
  { href: "/admin/exames", label: "Exames", icon: FlaskConical },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  {
    href: "/admin/protocolos",
    label: "Protocolos",
    icon: ClipboardList,
    stub: true,
  },
  { href: "/admin/settings", label: "Settings", icon: Settings, stub: true },
];

/** Links de navegação reutilizados no sidebar desktop e no drawer mobile */
function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-white/10 text-white"
                  : "text-brand-200 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              <span className="flex-1">{item.label}</span>
              {item.stub ? (
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-brand-300">
                  Em breve
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link
          href="/home"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-brand-300 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar pro app
        </Link>
      </div>
    </>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fecha drawer ao navegar
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Bloqueia scroll do body enquanto drawer está aberto
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <>
      {/* ── SIDEBAR DESKTOP (sm+) ─────────────────────────────────── */}
      <aside className="sticky top-0 z-20 hidden h-screen w-[240px] shrink-0 flex-col border-r border-border bg-brand-900 text-brand-100 sm:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/admin" aria-label="Longevify Admin">
            <Logo mono="light" className="h-6" />
          </Link>
        </div>
        <div className="px-5 pb-3 text-[11px] font-medium uppercase tracking-wider text-brand-300/70">
          Longevify Clinic
        </div>
        <NavLinks />
      </aside>

      {/* ── TOPBAR MOBILE (< sm) ──────────────────────────────────── */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/10 bg-brand-900 px-4 sm:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label={drawerOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={drawerOpen}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-brand-100 hover:bg-white/10"
        >
          {drawerOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
        <Link href="/admin" aria-label="Longevify Admin">
          <Logo mono="light" className="h-5" />
        </Link>
      </div>

      {/* ── DRAWER OVERLAY MOBILE ─────────────────────────────────── */}
      {drawerOpen ? (
        <>
          {/* Fundo escurecido — clique fecha o drawer */}
          <div
            className="fixed inset-0 z-40 bg-black/50 sm:hidden"
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer lateral */}
          <div className="fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col bg-brand-900 text-brand-100 sm:hidden">
            <div className="flex h-14 items-center justify-between px-5">
              <Link href="/admin" aria-label="Longevify Admin">
                <Logo mono="light" className="h-5" />
              </Link>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fechar menu"
                className="grid h-8 w-8 place-items-center rounded-lg text-brand-100 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 pb-3 text-[11px] font-medium uppercase tracking-wider text-brand-300/70">
              Longevify Clinic
            </div>
            <NavLinks onNavigate={() => setDrawerOpen(false)} />
          </div>
        </>
      ) : null}
    </>
  );
}
