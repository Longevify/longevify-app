"use client";

import { cn } from "@/lib/utils";
import { Flame, Sparkles } from "lucide-react";

/**
 * Lucas (2026-05-23/24): "crie um sistema de foguinho, no qual se você
 * e seu amigo todo dia fazem exercícios... E que tenha um foguinho de
 * streak pessoal. copie bastante o esquema de gameficação do duolingo."
 *
 * StreakHero é o foguinho 🔥 GIGANTE da aba Perfil. Visual varia com
 * tamanho do streak — vermelho/dourado pra streaks longas dão sensação
 * de raridade.
 *
 * Tiers:
 *   - 0 dias: cinza (apenas começou)
 *   - 1-2: amarelo (faísca)
 *   - 3-6: laranja (pegou fogo)
 *   - 7-29: vermelho intenso (semana+)
 *   - 30+: dourado pulsante (raro)
 *   - 100+: gradient holographic (lendário)
 */

function streakTier(days: number): {
  bgFrom: string;
  bgTo: string;
  textColor: string;
  ringColor: string;
  emoji: string;
  label: string;
  pulse: boolean;
} {
  if (days >= 100)
    return {
      bgFrom: "from-fuchsia-400",
      bgTo: "to-amber-300",
      textColor: "text-white",
      ringColor: "ring-amber-200/60",
      emoji: "🔥",
      label: "Lendário",
      pulse: true,
    };
  if (days >= 30)
    return {
      bgFrom: "from-amber-400",
      bgTo: "to-rose-500",
      textColor: "text-white",
      ringColor: "ring-amber-300/60",
      emoji: "🔥",
      label: "Mestre da consistência",
      pulse: true,
    };
  if (days >= 7)
    return {
      bgFrom: "from-orange-500",
      bgTo: "to-rose-600",
      textColor: "text-white",
      ringColor: "ring-orange-300/40",
      emoji: "🔥",
      label: "Em chamas",
      pulse: false,
    };
  if (days >= 3)
    return {
      bgFrom: "from-orange-400",
      bgTo: "to-amber-500",
      textColor: "text-white",
      ringColor: "ring-orange-300/40",
      emoji: "🔥",
      label: "Pegando fogo",
      pulse: false,
    };
  if (days >= 1)
    return {
      bgFrom: "from-amber-300",
      bgTo: "to-yellow-400",
      textColor: "text-amber-900",
      ringColor: "ring-amber-200/50",
      emoji: "✨",
      label: "Começando",
      pulse: false,
    };
  return {
    bgFrom: "from-zinc-200",
    bgTo: "to-zinc-300",
    textColor: "text-zinc-500",
    ringColor: "ring-zinc-200/60",
    emoji: "💤",
    label: "Sem streak — comece hoje",
    pulse: false,
  };
}

export function StreakHero({
  days,
  completedToday,
}: {
  days: number;
  /** Se já fez ao menos 1 task hoje, não corre risco de perder o streak. */
  completedToday: boolean;
}) {
  const tier = streakTier(days);
  const inDanger = days > 0 && !completedToday;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 shadow-md ring-1",
        tier.bgFrom,
        tier.bgTo,
        tier.ringColor,
      )}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex flex-col items-center text-center">
        <div
          className={cn(
            "relative grid h-32 w-32 place-items-center rounded-full bg-white/20 ring-4 ring-white/30 backdrop-blur-sm",
            tier.pulse && "animate-pulse",
          )}
        >
          <span className="text-[64px] leading-none" aria-hidden>
            {tier.emoji}
          </span>
        </div>
        <div
          className={cn(
            "mt-4 text-[80px] font-bold leading-none tracking-tight tabular-nums",
            tier.textColor,
          )}
        >
          {days}
        </div>
        <div className={cn("mt-1 text-[15px] font-semibold", tier.textColor)}>
          dia{days === 1 ? "" : "s"} seguido{days === 1 ? "" : "s"}
        </div>
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm",
            tier.textColor,
          )}
        >
          <Sparkles className="h-3 w-3" />
          {tier.label}
        </div>
      </div>

      {/* Aviso "não perca seu streak" — Duolingo style */}
      {inDanger && (
        <div className="relative mt-4 rounded-2xl bg-white/95 px-4 py-3">
          <div className="flex items-start gap-2">
            <Flame className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div>
              <div className="text-[12.5px] font-semibold text-zinc-900">
                Não perca seu streak hoje
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-600">
                Marque pelo menos 1 task do protocolo antes da meia-noite pra
                manter os {days} dias.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
