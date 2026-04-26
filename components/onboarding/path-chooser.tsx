"use client";

import { ArrowRight, Check, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntakeVariant } from "@/lib/intake/schema";

interface PathChooserProps {
  selected?: IntakeVariant;
  onSelect: (variant: IntakeVariant) => void;
}

const QUICK_BULLETS = [
  "Idade, sexo e antropometria básica",
  "Hábitos essenciais (atividade, álcool, tabagismo)",
  "Protocolo genérico de partida pra liberar a plataforma",
];

const COMPREHENSIVE_BULLETS = [
  "Histórico clínico, familiar e medicações em uso",
  "Estilo de vida detalhado: sono, dieta, estresse, treino",
  "Saúde mental, energia e contexto específico por sexo",
  "Protocolo personalizado com pesos por fator de risco",
  "Concierge IA contextualizado no seu caso desde o dia 1",
];

export function PathChooser({ selected, onSelect }: PathChooserProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center sm:text-left">
        <span className="text-[12px] font-medium uppercase tracking-wide text-brand-700">
          Primeiro acesso
        </span>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-tight sm:text-[34px]">
          Vamos personalizar sua Longevify
        </h1>
        <p className="max-w-2xl text-[14px] leading-relaxed text-muted">
          Quanto melhor entendermos seu contexto, mais útil cada
          recomendação. Escolha como você quer começar — dá pra trocar
          depois.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PathCard
          variant="quick"
          icon={<Zap className="h-5 w-5" />}
          title="Cadastro Rápido"
          duration="8 perguntas · 2 minutos"
          tagline="Pra entrar agora e configurar o resto depois."
          bullets={QUICK_BULLETS}
          selected={selected === "quick"}
          onSelect={() => onSelect("quick")}
        />
        <PathCard
          variant="comprehensive"
          icon={<Sparkles className="h-5 w-5" />}
          title="Cadastro Completo"
          duration="30 perguntas · 8-10 minutos"
          tagline="Recomendado — desbloqueia o potencial real do app."
          bullets={COMPREHENSIVE_BULLETS}
          selected={selected === "comprehensive"}
          onSelect={() => onSelect("comprehensive")}
          recommended
        />
      </div>

      <p className="text-center text-[12px] text-muted">
        Você pode trocar entre Rápido e Completo a qualquer momento.
        As respostas que se sobrepõem são preservadas.
      </p>
    </div>
  );
}

interface PathCardProps {
  variant: IntakeVariant;
  icon: React.ReactNode;
  title: string;
  duration: string;
  tagline: string;
  bullets: string[];
  selected: boolean;
  recommended?: boolean;
  onSelect: () => void;
}

function PathCard({
  icon,
  title,
  duration,
  tagline,
  bullets,
  selected,
  recommended,
  onSelect,
}: PathCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group relative flex flex-col gap-4 rounded-[20px] border p-6 text-left transition-all",
        recommended
          ? "border-brand-500 bg-gradient-to-br from-white via-brand-50/30 to-brand-100/40 shadow-[0_12px_32px_-16px_rgba(13,40,24,.18)] sm:p-7"
          : "border-border bg-white shadow-[0_1px_2px_rgba(13,40,24,.04)]",
        selected && "ring-2 ring-brand-500 ring-offset-2",
        "hover:border-brand-500 hover:shadow-[0_8px_24px_-12px_rgba(13,40,24,.18)]",
      )}
    >
      {recommended ? (
        <span className="absolute -top-2.5 right-5 rounded-full bg-brand-700 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-white shadow-sm">
          Recomendado
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid h-11 w-11 place-items-center rounded-2xl",
            recommended
              ? "bg-brand-700 text-white"
              : "bg-brand-100 text-brand-700",
          )}
        >
          {icon}
        </span>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[11px] font-medium",
            recommended
              ? "bg-brand-100 text-brand-800"
              : "bg-surface text-muted",
          )}
        >
          {duration}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="text-[20px] font-semibold leading-tight text-ink">
          {title}
        </h2>
        <p className="text-[13px] leading-snug text-muted">{tagline}</p>
      </div>

      <ul className="flex flex-col gap-2">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-2 text-[13px] leading-snug text-ink"
          >
            <span
              className={cn(
                "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full",
                recommended
                  ? "bg-brand-600 text-white"
                  : "bg-brand-100 text-brand-700",
              )}
            >
              <Check className="h-2.5 w-2.5" />
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div
        className={cn(
          "mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold transition-colors",
          recommended ? "text-brand-700" : "text-ink",
        )}
      >
        Começar
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}
