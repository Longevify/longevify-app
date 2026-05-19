import {
  fetchMyMenstrualEntries,
  fetchMyMenstrualProfile,
} from "@/lib/menstrual/storage";
import { CycleClient } from "./cycle-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Aba de tracking de ciclo menstrual.
 *
 * Lucas (2026-05-18): "crie uma aba no app para usuários femininos para
 * acompanhar o ciclo menstrual... Na conta demo, pode deixar isso
 * disponível, mesmo que seja um homem a principio."
 *
 * Lógica de exibição:
 *   - User sem profile (ainda não onboarded) → mostra wizard
 *   - User com profile + tracking_enabled true → dashboard
 *   - User com profile + tracking_enabled false → tela "ativar tracking"
 */
export default async function CicloPage() {
  const [profile, entries] = await Promise.all([
    fetchMyMenstrualProfile(),
    fetchMyMenstrualEntries(),
  ]);

  return <CycleClient initialProfile={profile} initialEntries={entries ?? []} />;
}
