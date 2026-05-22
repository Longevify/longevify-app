"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TourOverlay } from "./tour-overlay";
import { TOUR_STEPS } from "./tour-steps";

/**
 * Lucas (2026-05-21): "o tutorial tem que interagir com o app de modo
 * a mostrar onde estão as diferentes abas e features, em vez de só
 * mostrar um texto no pop up."
 *
 * Orquestra o tour interativo:
 *  - Lê primeira visita via localStorage `longevify.tutorial.completed`
 *  - Pra cada step: navega pra route se necessário, espera elemento
 *    aparecer no DOM via polling (max 2s), scroll into view, mede rect,
 *    renderiza TourOverlay
 *  - Re-mede em scroll/resize via useElementRect interno (refs)
 *
 * Tour é INTERATIVO: o user pode clicar em elementos ao redor (eles
 * não estão escondidos, só ofuscados). O spotlight é puramente visual —
 * não há trap focus.
 */

// Lucas (2026-05-21): chave NOVA — usuários que completaram o tutorial
// antigo (modal carousel, key "longevify.tutorial.completed") vão ver
// o tour interativo novo uma vez. Depois persistem com a chave nova.
const STORAGE_KEY = "longevify.tour.completed";
const ELEMENT_POLL_INTERVAL_MS = 60;
const ELEMENT_POLL_TIMEOUT_MS = 2500;
const RESPONSE_DELAY_MS = 80; // delay antes de medir, deixa DOM settled

interface TourRunnerProps {
  /** Quando true, força exibição mesmo se já foi visto. Futuro botão
   *  "Rever tutorial" em /more pode usar isso. */
  forceShow?: boolean;
  onClose?: () => void;
}

export function TourRunner({ forceShow = false, onClose }: TourRunnerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Decide se inicia no mount
  useEffect(() => {
    if (forceShow) {
      setActive(true);
      setStepIdx(0);
      return;
    }
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) setActive(true);
    } catch {
      // ignore
    }
  }, [forceShow]);

  const step = TOUR_STEPS[stepIdx];

  // Quando step muda OU pathname muda, encontra target + navega se preciso
  useEffect(() => {
    if (!active || !step) return;

    // 1. Step centralizado (welcome / complete) — não precisa target,
    //    nem navega (route default é /home mas user pode estar em qualquer
    //    rota; centralized funciona em qualquer uma)
    if (!step.targetSelector) {
      setTargetRect(null);
      return;
    }

    // 2. Navega pra route certa se necessário
    if (step.route && step.route !== pathname) {
      router.push(step.route);
      // Volta — próximo tick do useEffect (com pathname atualizado) vai
      // medir o target
      return;
    }

    // 3. Polling pra esperar elemento aparecer no DOM
    let cancelled = false;
    let elapsed = 0;
    const pollForTarget = () => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(step.targetSelector!);
      if (el) {
        // Scroll into view (centralizado) + delay pra DOM settle + medir
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
        setTimeout(() => {
          if (cancelled) return;
          setTargetRect(el.getBoundingClientRect());
        }, RESPONSE_DELAY_MS + 300); // 300ms extra pra smooth scroll terminar
        return;
      }
      if (elapsed >= ELEMENT_POLL_TIMEOUT_MS) {
        // Não achou — pula pro próximo step
        // eslint-disable-next-line no-console
        console.warn(`[tour] target not found: ${step.targetSelector}`);
        setTargetRect(null);
        return;
      }
      elapsed += ELEMENT_POLL_INTERVAL_MS;
      setTimeout(pollForTarget, ELEMENT_POLL_INTERVAL_MS);
    };
    pollForTarget();
    return () => {
      cancelled = true;
    };
  }, [active, step, pathname, router]);

  // Re-medir rect em scroll/resize enquanto step está ativo
  useEffect(() => {
    if (!active || !step?.targetSelector) return;
    const update = () => {
      const el = document.querySelector<HTMLElement>(step.targetSelector!);
      if (el) setTargetRect(el.getBoundingClientRect());
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [active, step]);

  // Close = grava localStorage flag + sai
  const close = useCallback(() => {
    setActive(false);
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // ignore
    }
    onClose?.();
  }, [onClose]);

  const next = useCallback(() => {
    setStepIdx((i) => {
      if (i >= TOUR_STEPS.length - 1) {
        // Último — fecha
        close();
        return i;
      }
      return i + 1;
    });
  }, [close]);

  const back = useCallback(() => {
    setStepIdx((i) => Math.max(0, i - 1));
  }, []);

  // Keyboard nav: ESC fecha, ←/→ navega
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, close, next, back]);

  if (!active || !step) return null;

  return (
    <TourOverlay
      targetRect={targetRect}
      placement={step.placement ?? "auto"}
      title={step.title}
      body={step.body}
      hint={step.hint}
      stepNumber={stepIdx + 1}
      totalSteps={TOUR_STEPS.length}
      onNext={next}
      onBack={back}
      onSkip={close}
      isFirst={stepIdx === 0}
      isLast={stepIdx === TOUR_STEPS.length - 1}
    />
  );
}
