/**
 * Hero do Protocolo — substitui o header texto-only por um visual rich
 * estilo "Concierge IA processando seus biomarcadores".
 *
 * SVG inline (não bitmap) garante:
 * - Crispness em qualquer DPR
 * - Sem dependência de geração externa de imagem
 * - Animação leve via CSS pra dar sensação de "vivo"
 */
export function ProtocolHero() {
  return (
    <section
      aria-label="Protocolo personalizado"
      className="relative overflow-hidden rounded-[24px] border border-border bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-8 md:p-10"
    >
      {/* Texto */}
      <div className="relative z-10 flex flex-col gap-3 md:max-w-[55%]">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white/90 backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-300" />
          Personalizado para você
        </span>
        <h1 className="text-[40px] leading-[1.05] font-semibold tracking-tight text-white">
          Protocolo
        </h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-white/80">
          Plano integrado de suplementação, nutrição, treino, sono e hábitos —
          construído pelo Concierge a partir dos seus 100+ biomarcadores mais
          recentes.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-white/70">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            17 ações ativas
          </span>
          <span className="text-white/30">·</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
            Calibrado em 2026-04-22
          </span>
          <span className="text-white/30">·</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
            Próx. revisão em ~9 semanas
          </span>
        </div>
      </div>

      {/* Art SVG — Concierge IA orb com biomarcadores orbitando */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-8 z-0 hidden md:block"
      >
        <svg
          width="420"
          height="380"
          viewBox="0 0 420 380"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Glow do orb central */}
            <radialGradient id="orbCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a8e6c4" stopOpacity="1" />
              <stop offset="60%" stopColor="#3f9a6b" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#1f5d3f" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#9fd4b3" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#9fd4b3" stopOpacity="0" />
            </radialGradient>
            {/* Linhas de conexão tênues */}
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9fd4b3" stopOpacity="0" />
              <stop offset="50%" stopColor="#9fd4b3" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#9fd4b3" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Glow externo */}
          <circle cx="210" cy="190" r="170" fill="url(#orbGlow)" />

          {/* Anéis concêntricos — sensação de "scanner" */}
          <circle
            cx="210"
            cy="190"
            r="120"
            stroke="#9fd4b3"
            strokeOpacity="0.18"
            strokeWidth="1"
            fill="none"
          />
          <circle
            cx="210"
            cy="190"
            r="90"
            stroke="#9fd4b3"
            strokeOpacity="0.25"
            strokeWidth="1"
            strokeDasharray="2 4"
            fill="none"
          />
          <circle
            cx="210"
            cy="190"
            r="60"
            stroke="#a8e6c4"
            strokeOpacity="0.4"
            strokeWidth="1"
            fill="none"
          />

          {/* Linhas conectando biomarcadores ao orb */}
          <line
            x1="210"
            y1="190"
            x2="100"
            y2="100"
            stroke="url(#lineGrad)"
            strokeWidth="1"
          />
          <line
            x1="210"
            y1="190"
            x2="340"
            y2="120"
            stroke="url(#lineGrad)"
            strokeWidth="1"
          />
          <line
            x1="210"
            y1="190"
            x2="90"
            y2="280"
            stroke="url(#lineGrad)"
            strokeWidth="1"
          />
          <line
            x1="210"
            y1="190"
            x2="350"
            y2="280"
            stroke="url(#lineGrad)"
            strokeWidth="1"
          />
          <line
            x1="210"
            y1="190"
            x2="380"
            y2="200"
            stroke="url(#lineGrad)"
            strokeWidth="1"
          />

          {/* Orb central — o "Concierge" */}
          <circle cx="210" cy="190" r="42" fill="url(#orbCore)" />
          <circle
            cx="210"
            cy="190"
            r="42"
            stroke="#ffffff"
            strokeOpacity="0.3"
            strokeWidth="1"
            fill="none"
          />
          {/* Highlight do orb */}
          <ellipse
            cx="198"
            cy="178"
            rx="12"
            ry="8"
            fill="#ffffff"
            fillOpacity="0.35"
          />

          {/* Biomarker dots orbitando */}
          <g>
            {/* Vitamina D — verde alto (ótimo) */}
            <circle cx="100" cy="100" r="5" fill="#34d399" />
            <circle
              cx="100"
              cy="100"
              r="5"
              fill="#34d399"
              fillOpacity="0.3"
              transform="scale(2.2)"
              transform-origin="100 100"
            />
            <text
              x="60"
              y="92"
              fill="#ffffff"
              fillOpacity="0.55"
              fontSize="9"
              fontFamily="ui-sans-serif, system-ui"
            >
              Vit. D
            </text>

            {/* LDL — amarelo (atenção) */}
            <circle cx="340" cy="120" r="5" fill="#fbbf24" />
            <text
              x="350"
              y="115"
              fill="#ffffff"
              fillOpacity="0.55"
              fontSize="9"
              fontFamily="ui-sans-serif, system-ui"
            >
              LDL
            </text>

            {/* HRV — verde */}
            <circle cx="90" cy="280" r="5" fill="#34d399" />
            <text
              x="50"
              y="285"
              fill="#ffffff"
              fillOpacity="0.55"
              fontSize="9"
              fontFamily="ui-sans-serif, system-ui"
            >
              HRV
            </text>

            {/* HbA1c — verde */}
            <circle cx="350" cy="280" r="5" fill="#34d399" />
            <text
              x="358"
              y="285"
              fill="#ffffff"
              fillOpacity="0.55"
              fontSize="9"
              fontFamily="ui-sans-serif, system-ui"
            >
              HbA1c
            </text>

            {/* hsCRP — verde */}
            <circle cx="380" cy="200" r="5" fill="#34d399" />
            <text
              x="350"
              y="218"
              fill="#ffffff"
              fillOpacity="0.55"
              fontSize="9"
              fontFamily="ui-sans-serif, system-ui"
            >
              hsCRP
            </text>

            {/* Pequenas estrelas / particles */}
            <circle cx="160" cy="65" r="1.5" fill="#a8e6c4" />
            <circle cx="280" cy="55" r="1.5" fill="#a8e6c4" />
            <circle cx="60" cy="170" r="1.5" fill="#a8e6c4" />
            <circle cx="380" cy="150" r="1.5" fill="#a8e6c4" />
            <circle cx="140" cy="320" r="1.5" fill="#a8e6c4" />
            <circle cx="290" cy="330" r="1.5" fill="#a8e6c4" />
          </g>
        </svg>
      </div>

      {/* Versão mobile-only do art (menor, no canto) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-4 z-0 md:hidden"
      >
        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="orbCoreMobile" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a8e6c4" stopOpacity="1" />
              <stop offset="60%" stopColor="#3f9a6b" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#1f5d3f" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle
            cx="90"
            cy="90"
            r="60"
            stroke="#9fd4b3"
            strokeOpacity="0.25"
            strokeWidth="1"
            fill="none"
          />
          <circle
            cx="90"
            cy="90"
            r="40"
            stroke="#9fd4b3"
            strokeOpacity="0.4"
            strokeWidth="1"
            strokeDasharray="2 4"
            fill="none"
          />
          <circle cx="90" cy="90" r="28" fill="url(#orbCoreMobile)" />
          <circle cx="40" cy="50" r="3" fill="#34d399" />
          <circle cx="150" cy="60" r="3" fill="#fbbf24" />
          <circle cx="50" cy="140" r="3" fill="#34d399" />
          <circle cx="145" cy="135" r="3" fill="#34d399" />
        </svg>
      </div>
    </section>
  );
}
