import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { HiggsfieldClient } from "./higgsfield-client";

export const dynamic = "force-dynamic";

/**
 * Lucas (2026-05-23): Higgsfield admin pra gerar fotos de produtos
 * curados da loja. Lucas escolhe produto/cria prompt → resultado
 * mostrado lado-a-lado com a foto atual → baixa o PNG → commita em
 * public/marketplace/.
 *
 * Server-only — checa role admin. Não há rota pública.
 */
export default async function HiggsfieldAdminPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    redirect("/home");
  }

  return <HiggsfieldClient />;
}
