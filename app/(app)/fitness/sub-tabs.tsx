"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Dumbbell, Footprints, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sub-tabs do Fitness.
 *
 * Client component pra usar `usePathname()` — antes era server component
 * usando `headers().get("x-pathname")`, mas o proxy.ts seta o header no
 * RESPONSE (não request), então `headers()` em Server Component não pega.
 * usePathname() é a fonte de verdade certa pra active state em tabs.
 */

const SUB_TABS = [
  {
    href: "/fitness",
    label: "Visão",
    Icon: LayoutGrid,
    exact: true,
  },
  { href: "/fitness/musculacao", label: "Musculação", Icon: Dumbbell },
  { href: "/fitness/corrida", label: "Corrida", Icon: Footprints },
  { href: "/fitness/outros", label: "Outros", Icon: Activity },
];

export function FitnessSubTabs() {
  const pathname = usePathname() ?? "/fitness";

  return (
    <nav className="sticky top-3 z-10 mt-4 mb-5 rounded-2xl border border-border bg-white/95 p-1.5 shadow-[0_4px_18px_-12px_rgba(13,40,24,.12)] backdrop-blur">
      <ul className="grid grid-cols-4 gap-1">
        {SUB_TABS.map(({ href, label, Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11.5px] font-semibold transition-colors sm:px-3 sm:text-[13px]",
                  active
                    ? "bg-brand-700 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-50",
                )}
              >
                <Icon
                  className="h-4 w-4 shrink-0"
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
