import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/app/top-nav";
import { BottomNav } from "@/components/app/bottom-nav";
import { Footer } from "@/components/app/footer";
import { DrLonFloating } from "@/components/app/dr-lon-floating";
import { TourRunner } from "@/components/onboarding/tour/tour-runner";
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

      {/* Dr. Lon mini chat flutuante — visível em desktop E mobile
          (Lucas 2026-05-19: "preciso que a aba do Dr Lon apareça no
          mobile version também"). Em mobile o botão se posiciona
          acima do bottom-nav (ver dr-lon-floating.tsx). */}
      <DrLonFloating />

      {/* Lucas (2026-05-21): "o tutorial tem que interagir com o app
          de modo a mostrar onde estão as diferentes abas e features,
          em vez de só mostrar um texto no pop up."
          TourRunner faz spotlight nos elementos reais com tooltips
          posicionados perto deles (vs FirstTimeTutorial antigo que
          era modal carousel). Decide auto se mostra na primeira
          visita (mesmo localStorage flag). */}
      <TourRunner />
    </UserProvider>
  );
}
