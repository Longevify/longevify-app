import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Version check endpoint pra apps mobile (Capacitor) e PWA.
 *
 * Apps mobile precisam saber a menor versão "ainda suportada" do backend
 * pra forçar update quando o user tá com binário muito velho. Sem isso,
 * UI antigo + API nova = bugs aleatórios e suporte vira inferno.
 *
 * Resposta:
 *   {
 *     latest: "1.0.0",      // versão mais recente disponível
 *     minimum: "1.0.0",     // versões abaixo desta são FORÇADAS a updatar
 *     buildHash: "abc123",  // git SHA do build atual no servidor
 *   }
 *
 * Como o cliente usa:
 *   1. Boot do app: GET /api/version
 *   2. Compara `minimum` com Capacitor.getAppVersion()
 *   3. Se app < minimum: mostra modal "Atualize o app pra continuar"
 *      bloqueando navegação até o user updatar pela App Store/Play Store.
 *   4. Se app < latest mas >= minimum: mostra banner sugerindo update
 *      (não-bloqueante).
 *
 * Pra atualizar `minimum`, mude as constantes abaixo e deploya. App
 * mobile next time que abrir vai pegar a versão nova e bloquear se
 * preciso. Sem necessidade de code-push ou outro mecanismo.
 *
 * Versão é semver. Comparação string→number split por "." é suficiente
 * pra esse uso (cliente faz a lógica).
 */
const APP_VERSION = {
  latest: "1.0.0",
  minimum: "1.0.0",
};

export function GET() {
  return NextResponse.json(
    {
      ...APP_VERSION,
      buildHash:
        process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      timestamp: new Date().toISOString(),
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
