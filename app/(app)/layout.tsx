import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/app/top-nav";
import { Footer } from "@/components/app/footer";
import { UserProvider } from "@/lib/auth/user-context";
import { getCurrentUser } from "@/lib/auth/current-user";

// Todas as rotas autenticadas precisam render fresh a cada request.
// Sem isso, o Vercel/Next pode servir HTML em cache que parece "logado"
// mesmo após a sessão Supabase expirar — o user vê /home renderizada
// mas, ao clicar num link tipo /perfil, o proxy roda fresh, não acha
// sessão válida e manda pra /login. Resultado: "ele me pede pra logar
// duas vezes". force-dynamic + revalidate=0 quebram esse cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Rotas que NÃO devem forçar onboarding mesmo se intake estiver pendente.
 * /onboarding (óbvio), logout (sair), perfil (visualizar dados).
 */
const ONBOARDING_BYPASS_PREFIXES = [
  "/onboarding",
  "/logout",
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Primeiro acesso real (não-demo, sem intake completado) → manda pro onboarding.
  if (!user.isDemo && !user.intakeCompletedAt) {
    const h = await headers();
    const pathname = h.get("x-pathname") ?? "";
    const shouldBypass = ONBOARDING_BYPASS_PREFIXES.some((p) =>
      pathname.startsWith(p),
    );
    if (!shouldBypass) {
      redirect("/onboarding");
    }
  }

  return (
    <UserProvider user={user}>
      {/* SessionKeeper removido — estava causando router.refresh em loop
          quando cookies httpOnly server vs cookies regulares browser
          conflitavam. Sessão é mantida via cookie do supabase ssr,
          que persiste entre requests sem precisar de refresh client. */}
      <div className="flex min-h-screen flex-col">
        <TopNav />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </UserProvider>
  );
}
