"use client";

import type { PatientSex } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface BodySilhouetteProps {
  sex: PatientSex;
  /** ID do órgão ativo (heart, brain, etc) — destaca o ponto correspondente. */
  activeOrgan?: string | null;
  /** Cor do destaque do órgão (mapeada do grade da categoria). */
  activeColor?: string;
  className?: string;
}

// ─── Coordenadas dos órgãos no SVG (viewBox 0 0 200 380) ─────────────────────
//
// Posições anatômicas aproximadas em coordenadas SVG. Foram escolhidas
// pra ficarem visualmente coerentes com a silhueta simplificada.
// Y aumenta pra BAIXO (convenção SVG): cabeça em y≈30, pés em y≈360.
const ORGAN_POSITIONS: Record<
  string,
  { x: number; y: number; r: number; label: string }
> = {
  brain: { x: 100, y: 32, r: 14, label: "Cérebro" },
  heart: { x: 90, y: 140, r: 12, label: "Coração" },
  lungs: { x: 100, y: 130, r: 22, label: "Pulmões" }, // wide circle
  liver: { x: 115, y: 175, r: 12, label: "Fígado" },
  pancreas: { x: 105, y: 195, r: 9, label: "Pâncreas" },
  kidneys: { x: 100, y: 200, r: 14, label: "Rins" }, // wide
  intestine: { x: 100, y: 225, r: 14, label: "Intestino" },
};

/**
 * Silhueta humana minimalista em SVG — alternativa leve ao avatar 3D /
 * 360°. Renderiza outline do corpo + 7 órgãos posicionados anatomicamente.
 *
 * Quando uma categoria órgão está ativa, o ponto correspondente é
 * destacado em pulse com a cor do grade.
 *
 * Versões male e female compartilham o mesmo SVG path mas com
 * proporções levemente diferentes (ombros vs. quadris).
 */
export function BodySilhouette({
  sex,
  activeOrgan,
  activeColor = "#1f5d3f",
  className,
}: BodySilhouetteProps) {
  const isFemale = sex === "female";
  const active = activeOrgan ? ORGAN_POSITIONS[activeOrgan] : null;

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg
        viewBox="0 0 200 380"
        className="h-auto w-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`Silhueta corporal ${isFemale ? "feminina" : "masculina"}`}
      >
        <defs>
          {/* Gradient sutil pra dar profundidade ao corpo */}
          <linearGradient id="body-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f4faf6" />
            <stop offset="100%" stopColor="#e7f5ec" />
          </linearGradient>

          {/* Filter pra pulse glow no órgão ativo */}
          <filter id="organ-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Outline do corpo (path simplificado, estilo Apple Health) ── */}
        {/*
          Path desenha frente do corpo de pé:
          - Cabeça (círculo y≈30)
          - Pescoço estreito
          - Ombros (mais largos no male, mais estreitos no female)
          - Torso afilando até quadris
          - Quadris (mais largos no female)
          - Pernas separadas até pés
        */}
        <path
          d={
            isFemale
              ? // FEMALE: ombros estreitos (x 70-130), quadril largo (x 65-135)
                "M 100 12 " +
                "C 88 12, 80 22, 80 36 " +
                "C 80 48, 88 56, 100 56 " +
                "C 112 56, 120 48, 120 36 " +
                "C 120 22, 112 12, 100 12 Z " +
                // pescoço
                "M 92 58 L 92 70 " +
                // ombros + torso afilado pra cintura
                "C 78 70, 70 78, 70 92 " +
                "L 72 130 " +
                "C 73 145, 75 160, 80 175 " +
                // cintura estreita
                "L 76 200 " +
                // quadril largo
                "C 73 215, 70 230, 70 240 " +
                // perna direita
                "L 78 360 L 92 360 L 96 240 " +
                "L 104 240 L 108 360 L 122 360 L 130 240 " +
                // quadril continuação
                "C 130 230, 127 215, 124 200 " +
                "L 120 175 " +
                "C 125 160, 127 145, 128 130 " +
                "L 130 92 " +
                "C 130 78, 122 70, 108 70 " +
                "L 108 58 Z " +
                // braços
                "M 70 92 C 60 92, 55 105, 55 120 " +
                "L 58 195 L 70 195 L 68 120 Z " +
                "M 130 92 C 140 92, 145 105, 145 120 " +
                "L 142 195 L 130 195 L 132 120 Z"
              : // MALE: ombros largos (x 60-140), quadris mais estreitos
                "M 100 12 " +
                "C 88 12, 80 22, 80 36 " +
                "C 80 48, 88 56, 100 56 " +
                "C 112 56, 120 48, 120 36 " +
                "C 120 22, 112 12, 100 12 Z " +
                // pescoço
                "M 92 58 L 92 70 " +
                // ombros LARGOS + torso V
                "C 72 70, 60 80, 60 100 " +
                "L 64 130 " +
                "C 66 145, 70 160, 76 180 " +
                // tronco afila pouco
                "L 75 200 " +
                "C 72 215, 70 225, 72 240 " +
                // perna direita
                "L 80 360 L 94 360 L 96 240 " +
                "L 104 240 L 106 360 L 120 360 L 128 240 " +
                // tronco continuação
                "C 130 225, 128 215, 125 200 " +
                "L 124 180 " +
                "C 130 160, 134 145, 136 130 " +
                "L 140 100 " +
                "C 140 80, 128 70, 108 70 " +
                "L 108 58 Z " +
                // braços
                "M 60 100 C 50 100, 45 115, 45 130 " +
                "L 50 210 L 64 210 L 62 130 Z " +
                "M 140 100 C 150 100, 155 115, 155 130 " +
                "L 150 210 L 136 210 L 138 130 Z"
          }
          fill="url(#body-gradient)"
          stroke="#c9e9d6"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* ── Pontos dos órgãos (sempre visíveis, em cinza claro) ── */}
        {Object.entries(ORGAN_POSITIONS).map(([id, pos]) => {
          const isActive = id === activeOrgan;
          return (
            <g key={id}>
              {/* dot estático (cinza) */}
              {!isActive && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={4}
                  fill="#9fd4b3"
                  opacity={0.45}
                />
              )}
              {/* destaque animado quando ativo */}
              {isActive && (
                <>
                  {/* pulse halo (animação CSS) */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={pos.r + 6}
                    fill={activeColor}
                    opacity={0.15}
                    className="organ-pulse"
                  />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={pos.r}
                    fill={activeColor}
                    opacity={0.35}
                    filter="url(#organ-glow)"
                  />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={5}
                    fill={activeColor}
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* Label do órgão ativo */}
      {active && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold shadow-md"
          style={{ color: activeColor, borderColor: activeColor }}
        >
          {active.label}
        </div>
      )}

      <style jsx>{`
        :global(.organ-pulse) {
          transform-origin: center;
          transform-box: fill-box;
          animation: pulse 1.8s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.15;
          }
          50% {
            transform: scale(1.25);
            opacity: 0.35;
          }
        }
      `}</style>
    </div>
  );
}
