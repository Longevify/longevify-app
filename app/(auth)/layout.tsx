import { Logo } from "@/components/brand/logo";

/**
 * Auth layout — split-screen em desktop, single-column em mobile.
 *
 * Mobile (< lg): card centralizado com logo em cima + footer (mesmo
 * comportamento original).
 *
 * Desktop (lg+): split 50/50:
 *   - Esquerda: hero verde escuro com logo + tagline + 3 trust signals
 *     (preenche espaço vazio que ficava antes — pages com card pequeno
 *     tipo /reset-password parecia 'flutuando no vazio')
 *   - Direita: form auth alinhado vertical center
 *
 * Mantém compat com TODAS as auth pages (login, signup, reset-password,
 * update-password) sem mudança nos forms internos.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Hero — só desktop. Mobile esconde. */}
      <aside
        className="hidden lg:flex lg:flex-col lg:justify-between lg:p-12 lg:text-white"
        style={{
          background:
            "linear-gradient(135deg, #1f5d3f 0%, #0d2818 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            className="h-10 w-10"
            aria-hidden
          >
            <path
              d="M 256 158.5 A 130 130 0 1 1 256 353.5 A 130 130 0 1 1 256 158.5 Z"
              stroke="#d8eecf"
              strokeWidth="46"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <span className="text-[22px] font-semibold tracking-tight">
            Longevify
          </span>
        </div>

        <div className="max-w-md">
          <h2 className="text-[36px] font-semibold leading-[1.1] tracking-tight">
            Sua plataforma de longevidade personalizada.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/80">
            Mais de 100 biomarcadores, idade biológica, recomendações
            clínicas e Concierge IA — tudo num só lugar.
          </p>

          <div className="mt-10 space-y-4">
            <TrustSignal
              title="Coleta domiciliar"
              description="Profissional Longevify vai até você, sem sair de casa."
            />
            <TrustSignal
              title="Resultados em 5 dias"
              description="Painéis processados pelo laboratório parceiro."
            />
            <TrustSignal
              title="Plano personalizado"
              description="Recomendações baseadas no seu perfil + objetivos."
            />
          </div>
        </div>

        <p className="text-[12px] text-white/60">
          © {new Date().getFullYear()} Longevify. Todos os direitos reservados.
        </p>
      </aside>

      {/* Form — center vertical em ambos viewports */}
      <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12 lg:min-h-0">
        {/* Mobile-only background accent (em desktop, hero ja faz isso) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 lg:hidden"
          style={{
            background:
              "radial-gradient(900px 500px at 20% 0%, rgba(63,154,107,.18) 0%, transparent 60%), radial-gradient(700px 400px at 80% 100%, rgba(63,154,107,.14) 0%, transparent 55%)",
          }}
        />

        {/* Logo header — só mobile */}
        <div className="mb-10 flex flex-col items-center gap-3 lg:hidden">
          <Logo className="h-9 w-auto" />
          <p className="text-[13px] text-muted">
            Sua plataforma de longevidade
          </p>
        </div>

        <div className="w-full max-w-[420px]">{children}</div>

        {/* Footer copyright — só mobile (desktop já tem no aside) */}
        <p className="mt-10 text-center text-[12px] text-muted lg:hidden">
          © {new Date().getFullYear()} Longevify. Todos os direitos reservados.
        </p>
      </main>
    </div>
  );
}

function TrustSignal({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#9fd4b3] text-[11px] font-bold text-[#0d2818]">
        ✓
      </span>
      <div>
        <div className="text-[14px] font-semibold leading-tight">
          {title}
        </div>
        <p className="mt-0.5 text-[13px] text-white/70">{description}</p>
      </div>
    </div>
  );
}
