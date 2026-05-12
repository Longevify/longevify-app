import { cn } from "@/lib/utils";

interface BodyAvatarProps {
  className?: string;
}

/**
 * Silhueta corporal estilizada usada como elemento visual central do
 * Painel de saúde (entre a lista de categorias e os scores).
 *
 * SVG inline — sem dependência externa, escala perfeitamente, suporta
 * dark mode via currentColor onde aplicável.
 */
export function BodyAvatar({ className }: BodyAvatarProps) {
  return (
    <svg
      viewBox="0 0 200 540"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Avatar corporal"
      className={cn("block h-auto w-full max-w-[260px]", className)}
    >
      <defs>
        <linearGradient id="body-shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c9d3d6" />
          <stop offset="22%" stopColor="#e8eef0" />
          <stop offset="50%" stopColor="#fafcfc" />
          <stop offset="78%" stopColor="#e1e7e9" />
          <stop offset="100%" stopColor="#b9c3c6" />
        </linearGradient>
        <radialGradient id="body-spot" cx="50%" cy="38%" r="62%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="body-soft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.4" />
        </filter>
      </defs>

      {/* Sombra sutil sob os pés */}
      <ellipse cx="100" cy="525" rx="58" ry="6" fill="#0F3020" opacity="0.07" />

      <g filter="url(#body-soft)">
        {/* Cabeça */}
        <ellipse cx="100" cy="50" rx="30" ry="36" fill="url(#body-shade)" />

        {/* Pescoço */}
        <path
          d="M 86 80 Q 100 92 114 80 L 117 105 Q 100 110 83 105 Z"
          fill="url(#body-shade)"
        />

        {/* Tronco — ombros largos afunilando até a cintura */}
        <path
          d="M 58 112
             Q 48 122 47 140
             L 53 248
             Q 55 268 67 274
             L 133 274
             Q 145 268 147 248
             L 153 140
             Q 152 122 142 112
             L 117 105
             L 83 105 Z"
          fill="url(#body-shade)"
        />

        {/* Braço esquerdo */}
        <path
          d="M 47 130
             Q 36 142 32 162
             L 28 286
             Q 27 304 35 312
             L 46 314
             Q 53 309 53 290
             L 56 200
             L 58 138 Z"
          fill="url(#body-shade)"
        />

        {/* Braço direito */}
        <path
          d="M 153 130
             Q 164 142 168 162
             L 172 286
             Q 173 304 165 312
             L 154 314
             Q 147 309 147 290
             L 144 200
             L 142 138 Z"
          fill="url(#body-shade)"
        />

        {/* Quadril (transição tronco → pernas) */}
        <path
          d="M 60 268
             Q 56 282 60 298
             L 140 298
             Q 144 282 140 268 Z"
          fill="url(#body-shade)"
        />

        {/* Perna esquerda */}
        <path
          d="M 62 296
             Q 64 360 70 420
             L 76 505
             Q 76 518 86 520
             L 96 520
             Q 100 514 99 505
             L 98 420
             Q 98 360 96 296 Z"
          fill="url(#body-shade)"
        />

        {/* Perna direita */}
        <path
          d="M 138 296
             Q 136 360 130 420
             L 124 505
             Q 124 518 114 520
             L 104 520
             Q 100 514 101 505
             L 102 420
             Q 102 360 104 296 Z"
          fill="url(#body-shade)"
        />
      </g>

      {/* Highlight central — luz vinda do alto pra dar profundidade */}
      <ellipse cx="100" cy="200" rx="50" ry="180" fill="url(#body-spot)" />
    </svg>
  );
}
