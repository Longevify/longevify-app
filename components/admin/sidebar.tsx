"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  Package,
  ClipboardList,
  Settings,
  ArrowLeft,
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

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 z-20 flex h-screen w-[240px] shrink-0 flex-col border-r border-border bg-brand-900 text-brand-100">
      <div className="flex h-16 items-center px-5">
        <Link href="/admin" aria-label="Longevify Admin">
          <Logo mono="light" className="h-6" />
        </Link>
      </div>
      <div className="px-5 pb-3 text-[11px] font-medium uppercase tracking-wider text-brand-300/70">
        Longevify Clinic
      </div>
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
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-brand-300 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar pro app
        </Link>
      </div>
    </aside>
  );
}
