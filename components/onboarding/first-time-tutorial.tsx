"use client";

import { useCallback, useEffect, useState } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Home,
  Activity,
  ClipboardList,
  ShoppingBag,
  Flame,
  Watch,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lucas (2026-05-21): "quero que tenha um tutorial de como usar o app
 * e todos os features na primeira vez que eu usar."
 *
 * Modal carousel mostrado na PRIMEIRA visita ao app (após login).
 * Persiste em localStorage `longevify.tutorial.completed` pra não
 * mostrar 2x. Skipable a qualquer momento.
 *
 * Slides:
 *  1. Welcome
 *  2. Score + Bio Age (home top)
 *  3. Progresso diário (4 cards de saúde)
 *  4. Tarefas + Streak (gameficação)
 *  5. Abas (bottom nav): Home / Dados / Protocolo / Loja
 *  6. Dr. Lon (chatbot flutuante)
 *  7. Pronto!
 */

const STORAGE_KEY = "longevify.tutorial.completed";

interface TutorialStep {
  icon: typeof Sparkles;
  iconBg: string;
  iconText: string;
  title: string;
  body: string;
  /** Hint visual extra (chip/badge). */
  hint?: string;
}

const STEPS: TutorialStep[] = [
  {
    icon: Sparkles,
    iconBg: "bg-gradient-to-br from-brand-700 to-brand-800",
    iconText: "text-white",
    title: "Bem-vindo ao Longevify",
    body: "Tudo que você precisa pra entender e otimizar sua saúde — biomarcadores, idade biológica, protocolo personalizado, dieta, wearables e concierge IA. Vou te mostrar as principais abas em 6 passos rápidos.",
  },
  {
    icon: Home,
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-700",
    title: "Score + Idade Biológica",
    body: "No topo da Home você vê seu Longevify Score (0-100) e sua idade biológica. Click pra abrir o detalhe com evolução temporal e breakdown por órgão.",
    hint: "Toggle 7d / 30d / 6m / Tudo no popup",
  },
  {
    icon: Activity,
    iconBg: "bg-indigo-50",
    iconText: "text-indigo-700",
    title: "Progresso de hoje",
    body: "4 cards com seu dia: Sono, Exercício, Tarefas Feitas e Pendentes. Os de wearable mostram score 0-100 — click pra ver histórico com chart.",
    hint: "Sono / Exercício / Feitas / Pendentes",
  },
  {
    icon: Flame,
    iconBg: "bg-orange-50",
    iconText: "text-orange-700",
    title: "Streak + Metas do mês",
    body: "Marca tarefas no protocolo todo dia pra construir sequência. As metas mensais (rings de progresso) mostram quanto você avançou. Estilo Duolingo — gameficação real.",
    hint: "🔥 N dias seguidos",
  },
  {
    icon: ClipboardList,
    iconBg: "bg-brand-50",
    iconText: "text-brand-700",
    title: "5 abas principais",
    body: "Home (visão geral) · Dados (biomarcadores + órgãos) · Protocolo (suplementos + hábitos) · Loja (produtos recomendados) · Mais (Ciclo, Dieta, Concierge, Wearables). Bottom nav no mobile, top nav no desktop.",
  },
  {
    icon: MessageCircle,
    iconBg: "bg-purple-50",
    iconText: "text-purple-700",
    title: "Dr. Lon — concierge IA",
    body: "Botão flutuante no canto direito. Pergunta qualquer coisa: \"como melhorar meu LDL?\", \"vit D em 25 é grave?\", \"o que comer hoje?\". Conhece seus dados e responde com base neles.",
    hint: "Não substitui consulta médica — só orienta",
  },
  {
    icon: ShoppingBag,
    iconBg: "bg-amber-50",
    iconText: "text-amber-700",
    title: "Pronto pra começar!",
    body: "Sua próxima coleta otimiza tudo — quanto mais histórico, mais preciso fica o Concierge. Suba exames antigos em /dados pra acelerar. Boa jornada!",
  },
];

interface FirstTimeTutorialProps {
  /**
   * Quando true, força exibição mesmo se já foi visto (botão "Rever tutorial").
   */
  forceShow?: boolean;
  onClose?: () => void;
}

export function FirstTimeTutorial({
  forceShow = false,
  onClose,
}: FirstTimeTutorialProps) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  // Decide se abre no mount — só primeira visita (sem localStorage flag)
  // OU quando forceShow (Lucas pode rever via "Mais > Tutorial").
  useEffect(() => {
    if (forceShow) {
      setOpen(true);
      setIdx(0);
      return;
    }
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) setOpen(true);
    } catch {
      // ignore
    }
  }, [forceShow]);

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // ignore
    }
    onClose?.();
  }, [onClose]);

  const next = useCallback(() => {
    setIdx((i) => {
      if (i >= STEPS.length - 1) {
        // Fecha no último
        close();
        return i;
      }
      return i + 1;
    });
  }, [close]);

  const back = useCallback(() => {
    setIdx((i) => Math.max(0, i - 1));
  }, []);

  // ESC fecha
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close, next, back]);

  if (!open) return null;

  const step = STEPS[idx];
  const Icon = step.icon;
  const isLast = idx === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      aria-modal="true"
      role="dialog"
      aria-label="Tutorial do app"
    >
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={close}
      />

      <div className="relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-[420px] sm:rounded-3xl rounded-t-3xl">
        {/* Progress dots no topo */}
        <div className="flex items-center justify-center gap-1.5 px-5 pt-5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === idx
                  ? "w-6 bg-brand-700"
                  : i < idx
                    ? "w-1.5 bg-brand-400"
                    : "w-1.5 bg-zinc-200",
              )}
            />
          ))}
        </div>

        {/* Skip — só não-último */}
        {!isLast && (
          <button
            type="button"
            onClick={close}
            aria-label="Pular tutorial"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Conteúdo do step */}
        <div className="flex-1 overflow-y-auto px-6 pt-8 pb-4 text-center">
          <div
            className={cn(
              "mx-auto grid h-16 w-16 place-items-center rounded-3xl shadow-lg",
              step.iconBg,
            )}
          >
            <Icon className={cn("h-8 w-8", step.iconText)} strokeWidth={2} />
          </div>
          <h2 className="mt-5 text-[20px] font-semibold tracking-tight text-zinc-900">
            {step.title}
          </h2>
          <p className="mt-2.5 text-[14px] leading-relaxed text-zinc-600">
            {step.body}
          </p>
          {step.hint && (
            <span className="mt-4 inline-block rounded-full bg-brand-50 px-3 py-1 text-[11.5px] font-medium text-brand-700 ring-1 ring-brand-200">
              {step.hint}
            </span>
          )}
        </div>

        {/* Footer com navegação */}
        <footer className="flex items-center justify-between gap-3 border-t border-zinc-100 px-5 py-4">
          <button
            type="button"
            onClick={back}
            disabled={idx === 0}
            className={cn(
              "inline-flex items-center gap-1 text-[12.5px] font-medium transition",
              idx === 0
                ? "text-zinc-300 cursor-not-allowed"
                : "text-zinc-600 hover:text-zinc-900",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </button>
          <span className="text-[11px] tabular-nums text-zinc-400">
            {idx + 1} / {STEPS.length}
          </span>
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-800"
          >
            {isLast ? "Começar" : "Próximo"}
            {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </footer>
      </div>
    </div>
  );
}
