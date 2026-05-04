"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronRight,
  CreditCard,
  LifeBuoy,
  LogOut,
  Settings,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn, formatDatePtBR } from "@/lib/utils";
import { PATIENT } from "@/lib/mock-data";
import { useCurrentUser } from "@/lib/auth/user-context";

interface ProfileItem {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ITEMS: ProfileItem[] = [
  {
    href: "/perfil",
    label: "Meu perfil",
    description: "Dados pessoais, saúde, preferências",
    icon: UserIcon,
  },
  {
    href: "/planos",
    label: "Plano & cobrança",
    description: "Assinatura, pagamento, próximas cobranças",
    icon: CreditCard,
  },
  {
    href: "/perfil/notificacoes",
    label: "Notificações",
    description: "Lembretes de exames, metas, novidades",
    icon: Bell,
  },
  {
    href: "/perfil/preferencias",
    label: "Preferências",
    description: "Idioma, unidades, privacidade",
    icon: Settings,
  },
  {
    href: "/perfil/suporte",
    label: "Suporte",
    description: "Fale com a equipe Longevify",
    icon: LifeBuoy,
  },
];

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const user = useCurrentUser();
  const fullName = user.fullName || "Usuário";
  const email = user.email ?? "demo@longevify.com.br";
  const isAdmin = user.role === "admin";

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir menu do perfil"
        className={cn(
          "rounded-full transition-shadow",
          open && "ring-2 ring-brand-400 ring-offset-2 ring-offset-white",
        )}
      >
        <Avatar name={fullName} />
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-12 z-40 w-[320px] origin-top-right",
            "rounded-2xl border border-border bg-white p-2",
            "shadow-[0_24px_64px_-24px_rgba(13,40,24,.28)]",
          )}
        >
          {/* Header — quem é o usuário + logoff rápido */}
          <div className="flex items-start gap-3 rounded-xl bg-brand-50/60 p-3">
            <Avatar name={fullName} className="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold leading-tight">
                {fullName}
              </div>
              <div className="truncate text-[12px] text-muted">{email}</div>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-2 h-5 text-[11px] font-medium text-brand-700 ring-1 ring-brand-200">
                <Sparkles className="h-3 w-3" />
                {isAdmin
                  ? "Admin · Longevify"
                  : user.isDemo
                    ? "Modo demo"
                    : "Plano Anual · ativo"}
              </div>
            </div>
            {/* Logoff direto — POST pra evitar prefetch do Next deslogar
                em background. GET no /logout é inerte (route handler
                respeita HTTP method). Sem onClick(setOpen) — form
                navega pra /login ao submeter, dropdown some junto
                naturalmente. */}
            <form action="/logout" method="post" className="contents">
              <button
                type="submit"
                aria-label="Sair da conta"
                title="Sair"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-[#FDECEC] hover:text-[#B6333A]"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Resumo de saúde — só mostra dados reais. Pra user real
              sem exame, mostra placeholders honestos em vez do mock
              do João (Score 70, idade 25, etc) que estavam hardcoded
              e davam impressão de "conta demo". */}
          <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl bg-brand-50/40 p-3 text-center">
            {user.isDemo ? (
              <>
                <Stat label="Score" value={String(PATIENT.longevifyScore)} />
                <Stat
                  label="Idade biol."
                  value={String(PATIENT.biologicalAge)}
                  hint={`${PATIENT.chronologicalAge} cron.`}
                />
                <Stat
                  label="Último exame"
                  value={formatDatePtBR(PATIENT.latestExamDate).replace(
                    /\sde\s\d{4}$/,
                    "",
                  )}
                  tiny
                />
              </>
            ) : (
              <>
                <Stat label="Score" value="—" />
                <Stat
                  label="Idade biol."
                  value="—"
                  hint={
                    user.chronologicalAge
                      ? `${user.chronologicalAge} cron.`
                      : undefined
                  }
                />
                <Stat label="Último exame" value="—" tiny />
              </>
            )}
          </div>

          {/* Items */}
          <nav className="mt-2 flex flex-col">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClick={() => setOpen(false)}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-brand-50/70"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-100 text-brand-700 group-hover:bg-brand-200">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium leading-tight">
                      {item.label}
                    </span>
                    <span className="block truncate text-[11px] text-muted">
                      {item.description}
                    </span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted/60 group-hover:text-ink" />
                </Link>
              );
            })}
          </nav>

          {/* Logout — POST pra evitar prefetch silencioso. Sem
              onClick(setOpen) porque form navega pra /login. */}
          <div className="mt-1 border-t border-border/70 pt-1">
            <form action="/logout" method="post">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#B6333A] hover:bg-[#FDECEC]"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tiny,
}: {
  label: string;
  value: string;
  hint?: string;
  tiny?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={cn(
          "font-semibold leading-none",
          tiny ? "text-[12px]" : "text-[16px]",
        )}
      >
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-muted">
        {label}
      </span>
      {hint ? <span className="text-[10px] text-muted">{hint}</span> : null}
    </div>
  );
}
