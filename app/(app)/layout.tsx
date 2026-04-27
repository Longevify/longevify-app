import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/app/top-nav";
import { Footer } from "@/components/app/footer";
import { UserProvider } from "@/lib/auth/user-context";
import { getCurrentUser } from "@/lib/auth/current-user";

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
      <div className="flex min-h-screen flex-col">
        <TopNav />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </UserProvider>
  );
}
