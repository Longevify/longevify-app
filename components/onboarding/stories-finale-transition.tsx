"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Transição cinematográfica entre o último slide das stories e a home do
 * app. Lucas 2026-05: "quero que você faça uma animação/transição para
 * a tela do app absurdamente bonita".
 *
 * Timeline (1900ms total):
 *
 *   0ms     ─ Mount. Background base verde escuro fade-in (200ms)
 *   80ms    ─ Sparkle particles começam a subir (12 partículas, stagger
 *             50ms cada, duração 1500ms cada)
 *   100ms   ─ Orb verde radial expande do centro (scale 0 → 4.5,
 *             1000ms cubic-out)
 *   600ms   ─ Logo "longevify" + tagline aparecem center (scale 0.85 → 1,
 *             opacity 0 → 1, 800ms cubic-out)
 *   1300ms  ─ Logo fade out (300ms)
 *   1500ms  ─ Tudo (overlay) fade out (400ms)
 *   1900ms  ─ onComplete() — esconde a transição, deixa home visível
 *
 * O overlay fica em z-[80], acima das stories (z-[60]). Quando ele
 * termina, o componente pai dá close() → stories somem → home aparece
 * já com a transição "evaporando".
 */

interface FinaleTransitionProps {
  onComplete: () => void;
  firstName?: string;
}

interface Particle {
  id: number;
  left: number; // %
  delay: number; // ms
  size: number; // px
  duration: number; // ms
  driftX: number; // px — deslocamento horizontal aleatório
}

export function StoriesFinaleTransition({
  onComplete,
  firstName,
}: FinaleTransitionProps) {
  const [phase, setPhase] = useState<
    "fading-in" | "showing" | "fading-out" | "done"
  >("fading-in");

  // Partículas pré-computadas (determinísticas, evitam SSR mismatch)
  const particles = useMemo<Particle[]>(() => {
    const arr: Particle[] = [];
    for (let i = 0; i < 14; i++) {
      // Pseudo-aleatório seeded com i pra render reproduzível
      const seed1 = Math.sin(i * 12.9898) * 43758.5453;
      const seed2 = Math.sin(i * 78.233) * 24634.6345;
      const r1 = seed1 - Math.floor(seed1);
      const r2 = seed2 - Math.floor(seed2);
      arr.push({
        id: i,
        left: 10 + r1 * 80, // 10–90% horizontalmente
        delay: 80 + i * 55, // staggered
        size: 4 + r2 * 6, // 4-10px
        duration: 1300 + r1 * 400, // 1300-1700ms
        driftX: (r1 - 0.5) * 60, // ±30px de drift lateral
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("showing"), 100);
    const t2 = setTimeout(() => setPhase("fading-out"), 1500);
    const t3 = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  if (phase === "done") return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex items-center justify-center overflow-hidden",
        "bg-gradient-to-br from-[#0d2818] via-[#143D28] to-[#0F3020]",
        "transition-opacity duration-[400ms] ease-out",
        phase === "fading-in" || phase === "fading-out"
          ? "opacity-0"
          : "opacity-100",
      )}
      aria-hidden
    >
      {/* Orb verde radial expandindo do centro */}
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "h-[300px] w-[300px] rounded-full",
          "transition-transform duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
          phase === "fading-in" ? "scale-0" : "scale-[4.5]",
        )}
        style={{
          background:
            "radial-gradient(circle, rgba(63, 154, 107, 0.7) 0%, rgba(31, 93, 63, 0.4) 35%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      {/* Orb secundário menor — adiciona profundidade */}
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "h-[200px] w-[200px] rounded-full",
          "transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
          phase === "fading-in" ? "scale-0" : "scale-[3]",
        )}
        style={{
          background:
            "radial-gradient(circle, rgba(125, 211, 165, 0.8) 0%, rgba(63, 154, 107, 0.3) 50%, transparent 80%)",
          filter: "blur(8px)",
        }}
      />

      {/* Sparkle particles subindo */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="pointer-events-none absolute rounded-full bg-white"
          style={{
            left: `${p.left}%`,
            bottom: "0%",
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: 0,
            boxShadow:
              "0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px rgba(125, 211, 165, 0.5)",
            animation: `finaleParticle ${p.duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${p.delay}ms both`,
            // CSS var pra animation usar o drift lateral
            // @ts-expect-error custom CSS var
            "--drift-x": `${p.driftX}px`,
          }}
        />
      ))}

      {/* Logo + tagline center */}
      <div
        className={cn(
          "relative z-10 flex flex-col items-center text-center text-white",
          "transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
          phase === "showing"
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-3 scale-90 opacity-0",
        )}
        style={{ transitionDelay: phase === "showing" ? "500ms" : "0ms" }}
      >
        <div className="text-[36px] font-semibold tracking-[0.06em] text-white drop-shadow-[0_0_24px_rgba(125,211,165,0.5)]">
          longevify
        </div>
        <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-white/75">
          {firstName ? `Bora, ${firstName}.` : "Bora."} Sua jornada começa
          agora.
        </p>
      </div>

      <style jsx>{`
        @keyframes finaleParticle {
          0% {
            transform: translateY(0) translateX(0) scale(0.6);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) translateX(var(--drift-x, 0))
              scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
