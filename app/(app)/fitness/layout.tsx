import Link from "next/link";
import { Dumbbell, Footprints, Activity } from "lucide-react";
import { headers } from "next/headers";
import { cn } from "@/lib/utils";

/**
 * Lucas (2026-05-21): "quero criar uma aba para fitness, quando entro
 * na aba fitness, tem 2 sub abas, uma aba para musculação, uma para
 * corrida e outra para demais exercícios."
 *
 * 3 sub-tabs renderizadas no header da feature fitness. Active state
 * via pathname (segments).
 */

const SUB_TABS = [
  { href: "/fitness/musculacao", label: "Musculação", Icon: Dumbbell },
  { href: "/fitness/corrida", label: "Corrida", Icon: Footprints },
  { href: "/fitness/outros", label: "Outros", Icon: Activity },
];

export default async function FitnessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "/fitness/musculacao";

  return (
    <div className="mx-auto w-full max-w-[920px] px-4 py-6 sm:px-6 sm:py-10">
      <header className="pb-2">
        <span className="text-[13px] text-muted">Treino e atividade física</span>
        <h1 className="text-[28px] leading-[1.1] font-semibold tracking-tight sm:text-[34px]">
          Fitness
        </h1>
      </header>

      {/* Sub-tabs */}
      <nav className="sticky top-3 z-10 mt-4 mb-5 rounded-2xl border border-border bg-white/95 p-1.5 shadow-[0_4px_18px_-12px_rgba(13,40,24,.12)] backdrop-blur">
        <ul className="grid grid-cols-3 gap-1">
          {SUB_TABS.map(({ href, label, Icon }) => {
            const active =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors",
                    active
                      ? "bg-brand-700 text-white shadow-sm"
                      : "text-zinc-600 hover:bg-zinc-50",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={active ? 2.4 : 1.8} />
                  <span className="hidden xs:inline sm:inline">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {children}
    </div>
  );
}
