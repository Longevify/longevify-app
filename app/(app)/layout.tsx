import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/app/top-nav";
import { Footer } from "@/components/app/footer";
import { DrLonFloating } from "@/components/app/dr-lon-floating";
import { UserProvider } from "@/lib/auth/user-context";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ONBOARDING_BYPASS_PREFIXES = ["/onboarding", "/logout"];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

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

      {/* Dr. Lon mini chat flutuante — visível em todas as abas do app
          autenticado. Click pra expandir conversa rápida, ou botão pra
          continuar no /concierge full screen. */}
      <DrLonFloating />
    </UserProvider>
  );
}
