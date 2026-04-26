import { Logo } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 500px at 20% 0%, rgba(63,154,107,.18) 0%, transparent 60%), radial-gradient(700px 400px at 80% 100%, rgba(63,154,107,.14) 0%, transparent 55%)",
        }}
      />
      <div className="mb-10 flex flex-col items-center gap-3">
        <Logo className="h-9 w-auto" />
        <p className="text-[13px] text-muted">Sua plataforma de longevidade</p>
      </div>
      <div className="w-full max-w-[420px]">{children}</div>
      <p className="mt-10 text-center text-[12px] text-muted">
        © {new Date().getFullYear()} Longevify. Todos os direitos reservados.
      </p>
    </div>
  );
}
