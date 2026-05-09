type ArtKey =
  | "suplementos"
  | "nutricao"
  | "exercicio"
  | "sono"
  | "luz"
  | "hidratacao"
  | "mental";

interface CategoryArtProps {
  artKey: ArtKey;
}

/**
 * Hero art SVG pra cada categoria do protocolo. Cada uma é uma composição
 * abstrata "tech / health" com a paleta da categoria (combinando com os
 * accents textuais). Não usa bitmaps — vetor puro, escala perfeito em
 * qualquer tela.
 *
 * Padrão: ~140px alto, full-width do card, gradient background + figura
 * abstrata representando o conceito.
 */
export function CategoryArt({ artKey }: CategoryArtProps) {
  switch (artKey) {
    case "suplementos":
      return <SuplementosArt />;
    case "nutricao":
      return <NutricaoArt />;
    case "exercicio":
      return <ExercicioArt />;
    case "sono":
      return <SonoArt />;
    case "luz":
      return <LuzArt />;
    case "hidratacao":
      return <HidratacaoArt />;
    case "mental":
      return <MentalArt />;
  }
}

// ─── Suplementação — cápsulas flutuantes em fundo verde mint ────────────────
function SuplementosArt() {
  return (
    <div
      aria-hidden
      className="relative h-[140px] w-full overflow-hidden bg-gradient-to-br from-[#E7F5EC] via-[#DFF5E9] to-[#C9E9D6]"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 140"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="capA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#a8c1b6" />
          </linearGradient>
          <linearGradient id="capB" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3f9a6b" />
            <stop offset="100%" stopColor="#1f5d3f" />
          </linearGradient>
          <radialGradient id="glowSup" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="200" cy="70" rx="140" ry="50" fill="url(#glowSup)" />

        {/* Cápsula grande central */}
        <g transform="translate(200, 70) rotate(-25)">
          <rect
            x="-50"
            y="-14"
            width="50"
            height="28"
            rx="14"
            fill="url(#capA)"
          />
          <rect
            x="0"
            y="-14"
            width="50"
            height="28"
            rx="14"
            fill="url(#capB)"
          />
          <ellipse
            cx="-30"
            cy="-7"
            rx="6"
            ry="3"
            fill="#ffffff"
            fillOpacity="0.6"
          />
        </g>

        {/* Cápsula menor à esquerda */}
        <g transform="translate(80, 50) rotate(15)">
          <rect
            x="-22"
            y="-7"
            width="22"
            height="14"
            rx="7"
            fill="#ffffff"
            opacity="0.85"
          />
          <rect
            x="0"
            y="-7"
            width="22"
            height="14"
            rx="7"
            fill="#6dba8e"
            opacity="0.9"
          />
        </g>

        {/* Pílula direita */}
        <g transform="translate(330, 95) rotate(40)">
          <circle cx="0" cy="0" r="14" fill="#ffffff" />
          <circle cx="0" cy="0" r="14" fill="#1f5d3f" fillOpacity="0.08" />
          <circle cx="-3" cy="-3" r="3" fill="#ffffff" fillOpacity="0.8" />
        </g>

        {/* Particles */}
        <circle cx="50" cy="100" r="2" fill="#3f9a6b" opacity="0.4" />
        <circle cx="370" cy="40" r="2" fill="#3f9a6b" opacity="0.4" />
        <circle cx="150" cy="115" r="1.5" fill="#1f5d3f" opacity="0.3" />
      </svg>
    </div>
  );
}

// ─── Nutrição — folhas / vegetais abstratos ────────────────────────────────
function NutricaoArt() {
  return (
    <div
      aria-hidden
      className="relative h-[140px] w-full overflow-hidden bg-gradient-to-br from-[#FBF0D4] via-[#F5E5B0] to-[#E8D078]"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 140"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="glowNut" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="leaf" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6dba8e" />
            <stop offset="100%" stopColor="#1f5d3f" />
          </linearGradient>
        </defs>

        <ellipse cx="200" cy="70" rx="140" ry="50" fill="url(#glowNut)" />

        {/* Tigela abstrata (semi-círculo) */}
        <path
          d="M 130 95 Q 200 145 270 95 L 250 95 Q 200 130 150 95 Z"
          fill="#ffffff"
          opacity="0.9"
        />
        <path
          d="M 130 95 Q 200 145 270 95"
          stroke="#A8651B"
          strokeOpacity="0.3"
          strokeWidth="1"
          fill="none"
        />

        {/* Folha grande */}
        <path
          d="M 200 50 Q 230 30 240 60 Q 230 90 200 95 Q 175 80 200 50 Z"
          fill="url(#leaf)"
        />
        <path
          d="M 215 55 L 215 90"
          stroke="#0d2818"
          strokeOpacity="0.3"
          strokeWidth="1"
        />

        {/* Mini frutas */}
        <circle cx="180" cy="80" r="8" fill="#e85d5d" opacity="0.85" />
        <circle cx="180" cy="78" r="2" fill="#ffffff" opacity="0.6" />
        <circle cx="225" cy="85" r="7" fill="#fbbf24" />
        <circle cx="225" cy="83" r="2" fill="#ffffff" opacity="0.6" />

        {/* Grãos */}
        <circle cx="150" cy="92" r="3" fill="#A8651B" opacity="0.6" />
        <circle cx="155" cy="88" r="3" fill="#A8651B" opacity="0.5" />
        <circle cx="245" cy="90" r="3" fill="#A8651B" opacity="0.6" />

        {/* Particles */}
        <circle cx="60" cy="50" r="1.5" fill="#1f5d3f" opacity="0.3" />
        <circle cx="350" cy="60" r="1.5" fill="#1f5d3f" opacity="0.3" />
      </svg>
    </div>
  );
}

// ─── Exercício — barra de progresso abstrata + linhas de movimento ──────────
function ExercicioArt() {
  return (
    <div
      aria-hidden
      className="relative h-[140px] w-full overflow-hidden bg-gradient-to-br from-[#E7ECFD] via-[#C9D4F8] to-[#9BABED]"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 140"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="hrLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B44C2" stopOpacity="0" />
            <stop offset="50%" stopColor="#3B44C2" stopOpacity="1" />
            <stop offset="100%" stopColor="#3B44C2" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="glowEx" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="200" cy="70" rx="160" ry="55" fill="url(#glowEx)" />

        {/* Linha de batimento cardíaco */}
        <path
          d="M 0 70 L 60 70 L 80 70 L 90 50 L 100 90 L 110 30 L 120 70 L 200 70 L 220 70 L 230 50 L 240 90 L 250 30 L 260 70 L 400 70"
          stroke="url(#hrLine)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Anéis de zona (Apple Watch-like) */}
        <circle
          cx="320"
          cy="70"
          r="36"
          stroke="#3B44C2"
          strokeOpacity="0.2"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx="320"
          cy="70"
          r="36"
          stroke="#3B44C2"
          strokeWidth="6"
          fill="none"
          strokeDasharray="170 226"
          strokeLinecap="round"
          transform="rotate(-90 320 70)"
        />
        <circle
          cx="320"
          cy="70"
          r="22"
          stroke="#6dba8e"
          strokeOpacity="0.2"
          strokeWidth="5"
          fill="none"
        />
        <circle
          cx="320"
          cy="70"
          r="22"
          stroke="#3f9a6b"
          strokeWidth="5"
          fill="none"
          strokeDasharray="100 138"
          strokeLinecap="round"
          transform="rotate(-90 320 70)"
        />

        {/* Pulse dot */}
        <circle cx="80" cy="70" r="3" fill="#3B44C2" />
        <circle cx="80" cy="70" r="6" fill="#3B44C2" fillOpacity="0.3" />
      </svg>
    </div>
  );
}

// ─── Sono — lua + estrelas + curva de sleep stages ──────────────────────────
function SonoArt() {
  return (
    <div
      aria-hidden
      className="relative h-[140px] w-full overflow-hidden bg-gradient-to-br from-[#1F2F4F] via-[#2C4670] to-[#456BA8]"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 140"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="moon" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fffbe0" />
            <stop offset="100%" stopColor="#e6d680" />
          </radialGradient>
          <linearGradient id="sleepCurve" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9bafd9" stopOpacity="0" />
            <stop offset="20%" stopColor="#9bafd9" stopOpacity="1" />
            <stop offset="80%" stopColor="#9bafd9" stopOpacity="1" />
            <stop offset="100%" stopColor="#9bafd9" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Lua */}
        <circle cx="320" cy="50" r="26" fill="url(#moon)" />
        <circle
          cx="320"
          cy="50"
          r="26"
          stroke="#fffbe0"
          strokeOpacity="0.4"
          strokeWidth="0.5"
          fill="none"
        />

        {/* Estrelas */}
        <g fill="#ffffff">
          <circle cx="80" cy="30" r="1.5" opacity="0.9" />
          <circle cx="140" cy="50" r="1" opacity="0.7" />
          <circle cx="220" cy="25" r="1.5" opacity="0.85" />
          <circle cx="270" cy="80" r="1" opacity="0.6" />
          <circle cx="50" cy="70" r="1" opacity="0.5" />
          <circle cx="180" cy="90" r="1.2" opacity="0.7" />
          <circle cx="370" cy="100" r="1" opacity="0.6" />
        </g>

        {/* Curva de sleep stages — REM/Deep/Light */}
        <path
          d="M 0 120 Q 50 110 80 100 T 140 90 T 200 110 T 260 95 T 320 105 T 400 100"
          stroke="url(#sleepCurve)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M 0 120 Q 50 110 80 100 T 140 90 T 200 110 T 260 95 T 320 105 T 400 100 L 400 140 L 0 140 Z"
          fill="#9bafd9"
          fillOpacity="0.15"
        />

        {/* Z's */}
        <text
          x="290"
          y="40"
          fill="#ffffff"
          fillOpacity="0.5"
          fontSize="14"
          fontFamily="ui-sans-serif, system-ui"
        >
          Z
        </text>
        <text
          x="280"
          y="58"
          fill="#ffffff"
          fillOpacity="0.35"
          fontSize="10"
          fontFamily="ui-sans-serif, system-ui"
        >
          z
        </text>
      </svg>
    </div>
  );
}

// ─── Luz / Circadiano — sol nascendo + horizonte ────────────────────────────
function LuzArt() {
  return (
    <div
      aria-hidden
      className="relative h-[140px] w-full overflow-hidden bg-gradient-to-b from-[#FCEBD8] via-[#F5C895] to-[#E89854]"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 140"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff8e1" />
            <stop offset="40%" stopColor="#ffd96b" />
            <stop offset="100%" stopColor="#ff9b35" />
          </radialGradient>
          <radialGradient id="rays" cx="50%" cy="100%" r="80%">
            <stop offset="0%" stopColor="#fff3c8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#fff3c8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Rays glow */}
        <ellipse cx="200" cy="105" rx="200" ry="90" fill="url(#rays)" />

        {/* Sol */}
        <circle cx="200" cy="100" r="38" fill="url(#sun)" />

        {/* Raios */}
        <g
          stroke="#ffd96b"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        >
          <line x1="200" y1="50" x2="200" y2="35" />
          <line x1="155" y1="65" x2="142" y2="55" />
          <line x1="245" y1="65" x2="258" y2="55" />
          <line x1="138" y1="92" x2="120" y2="92" />
          <line x1="262" y1="92" x2="280" y2="92" />
          <line x1="160" y1="115" x2="148" y2="125" />
          <line x1="240" y1="115" x2="252" y2="125" />
        </g>

        {/* Horizonte */}
        <line
          x1="0"
          y1="105"
          x2="400"
          y2="105"
          stroke="#A8651B"
          strokeOpacity="0.25"
          strokeWidth="1"
        />

        {/* Mini ícone relógio canto direito */}
        <circle
          cx="350"
          cy="30"
          r="14"
          fill="#ffffff"
          fillOpacity="0.85"
          stroke="#A8651B"
          strokeOpacity="0.4"
          strokeWidth="1"
        />
        <line
          x1="350"
          y1="30"
          x2="350"
          y2="20"
          stroke="#A8651B"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="350"
          y1="30"
          x2="356"
          y2="34"
          stroke="#A8651B"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

// ─── Hidratação — gotas de água + ondas ─────────────────────────────────────
function HidratacaoArt() {
  return (
    <div
      aria-hidden
      className="relative h-[140px] w-full overflow-hidden bg-gradient-to-br from-[#E1F0FB] via-[#A8D0EE] to-[#5C92C8]"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 140"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="dropMain" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#9ec8e6" />
            <stop offset="100%" stopColor="#206396" />
          </radialGradient>
          <linearGradient id="wave" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gota grande central */}
        <path
          d="M 200 35 Q 230 75 200 100 Q 170 75 200 35 Z"
          fill="url(#dropMain)"
        />
        <ellipse
          cx="190"
          cy="60"
          rx="6"
          ry="10"
          fill="#ffffff"
          fillOpacity="0.6"
        />

        {/* Gotas pequenas */}
        <path
          d="M 100 60 Q 113 80 100 95 Q 87 80 100 60 Z"
          fill="#ffffff"
          opacity="0.8"
        />
        <path
          d="M 320 70 Q 333 90 320 105 Q 307 90 320 70 Z"
          fill="#ffffff"
          opacity="0.75"
        />
        <path
          d="M 70 95 Q 78 108 70 118 Q 62 108 70 95 Z"
          fill="#ffffff"
          opacity="0.6"
        />

        {/* Ondas */}
        <path
          d="M 0 120 Q 50 110 100 120 T 200 120 T 300 120 T 400 120 L 400 140 L 0 140 Z"
          fill="url(#wave)"
        />
        <path
          d="M 0 130 Q 50 122 100 130 T 200 130 T 300 130 T 400 130 L 400 140 L 0 140 Z"
          fill="#ffffff"
          fillOpacity="0.3"
        />

        {/* Bolhas */}
        <circle cx="60" cy="55" r="2" fill="#ffffff" opacity="0.7" />
        <circle cx="280" cy="40" r="1.5" fill="#ffffff" opacity="0.6" />
        <circle cx="350" cy="50" r="2" fill="#ffffff" opacity="0.7" />
      </svg>
    </div>
  );
}

// ─── Mental — placeholder caso futuro ───────────────────────────────────────
function MentalArt() {
  return (
    <div
      aria-hidden
      className="relative h-[140px] w-full overflow-hidden bg-gradient-to-br from-[#F0E8F8] via-[#D0BFE8] to-[#9F7CC8]"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 140"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="brainGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="200" cy="70" rx="120" ry="50" fill="url(#brainGlow)" />
        {/* Cérebro simplificado */}
        <path
          d="M 170 50 Q 150 70 170 90 Q 200 100 230 90 Q 250 70 230 50 Q 200 40 170 50 Z"
          fill="#9F7CC8"
          opacity="0.85"
        />
        <path
          d="M 200 50 L 200 90"
          stroke="#5E3F8A"
          strokeOpacity="0.4"
          strokeWidth="1"
        />
        <circle cx="70" cy="50" r="2" fill="#ffffff" opacity="0.7" />
        <circle cx="340" cy="100" r="2" fill="#ffffff" opacity="0.7" />
      </svg>
    </div>
  );
}
