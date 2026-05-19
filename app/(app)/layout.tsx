import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/app/top-nav";
import { BottomNav } from "@/components/app/bottom-nav";
import { Footer } from "@/components/app/footer";
import { DrLonFloating } from "@/components/app/dr-lon-floating";
import { UserProvider } from "@/lib/auth/user-context";
import { getCurrentUser } from "@/lib/auth/current-user";
import { IdentifyUser } from "@/lib/analytics/identify-user";

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
        {/* Reserva espaço no fim do scroll pra BottomNav (h-14 + safe-area
            do iPhone) só em mobile. Em desktop não tem BottomNav. */}
        <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+72px)] sm:pb-0">
          {children}
        </main>
        <Footer />
      </div>

      {/* BottomNav — só visível em mobile, fixo na bottom com ícones
          (Lucas 2026-05-19: "colocar icones para Cada aba, não quero texto"). */}
      <BottomNav />

      {/* Dr. Lon mini chat flutuante — visível só em desktop. Em mobile
          o user usa a aba "Concierge" da bottom nav. */}
      <div className="hidden sm:contents">
        <DrLonFloating />
      </div>

      {/* Identifica o user no PostHog. Demo users ficam anônimos. */}
      <IdentifyUser
        userId={user.isDemo ? null : user.id}
        email={user.email}
        firstName={user.firstName}
        biologicalAge={user.chronologicalAge}
        hasIntake={Boolean(user.intakeCompletedAt)}
      />
    </UserProvider>
  );
}
