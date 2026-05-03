import { recordToForm } from "@/lib/profile/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { PATIENT } from "@/lib/mock-data";
import { PerfilForm } from "./perfil-form";

// Sem cache de página: força re-render server-side a cada request.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PerfilPage() {
  // ESTRATÉGIA "ZERO SUPABASE NA PAGE": a página NUNCA chama supabase
  // server-side. Renderiza apenas o shell do form vazio. O cliente
  // (perfil-form.tsx useEffect) chama /api/me/profile que tem ÚNICA
  // chamada de getSession do request — eliminando race condition que
  // estava clearando cookies de sessão e levando user pra modo demo.
  //
  // Caminho A: Supabase NÃO configurado → modo demo legítimo, mock UI.
  // Caminho B: Supabase configurado → form vazio + self-heal preenche.

  if (!isSupabaseConfigured()) {
    return (
      <PerfilForm
        initial={{
          ...recordToForm(null, "joao.silva@longevify.co"),
          firstName: PATIENT.firstName,
          lastName: PATIENT.lastName,
          email: "joao.silva@longevify.co",
          chronologicalAge: PATIENT.chronologicalAge,
        }}
        isDemo={true}
        longevifyScore={PATIENT.longevifyScore}
        biologicalAge={PATIENT.biologicalAge}
        latestExamDate={PATIENT.latestExamDate}
      />
    );
  }

  // Supabase configurado: form vazio. Cliente busca via API e preenche.
  return (
    <PerfilForm
      initial={recordToForm(null, "")}
      isDemo={true}
      longevifyScore={null}
      biologicalAge={null}
      latestExamDate={null}
    />
  );
}
