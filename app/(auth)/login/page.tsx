import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/auth/current-user";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar — Longevify",
};

// Sem cache — precisamos checar auth fresh em cada hit pra evitar
// flash de /login pra users já autenticados.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Mensagens amigáveis pra erros de auth comuns que vêm do callback
const ERROR_MESSAGES: Record<string, string> = {
  otp_expired:
    "Esse link de e-mail expirou. Solicite um novo abaixo em 'Esqueci minha senha'.",
  access_denied:
    "Acesso negado. O link pode ter sido usado ou expirado — tenta de novo.",
  recovery_exchange_failed:
    "Não conseguimos validar o link de recuperação. Solicite um novo abaixo.",
  default:
    "Algo deu errado na autenticação. Tenta de novo ou solicite um novo link.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    email?: string;
    error?: string;
    error_description?: string;
    confirmed?: string;
  }>;
}) {
  const params = await searchParams;
  const demo = !isSupabaseConfigured();

  // Se o user já está autenticado, manda direto pra rota destino.
  // Resolve o "loga 2 vezes" causado quando o proxy bounceia user
  // já válido pra /login (race no refresh de cookies). Se não vier
  // explicit ?error=, e o user JÁ tem sessão, segue direto.
  // Exceção: se ?confirmed=1 (vindo do callback de email confirmation),
  // mostra a mensagem de confirmação e deixa o user logar manualmente.
  if (!demo && !params.error && !params.confirmed) {
    const user = await getCurrentUser();
    if (!user.isDemo) {
      redirect(params.next ?? "/home");
    }
  }

  // Prefere mensagem mapeada; se vier um error_description do Supabase
  // (mais específico), mostra ele em paralelo pra ajudar debug.
  const baseMsg = params.error
    ? ERROR_MESSAGES[params.error] ?? ERROR_MESSAGES.default
    : null;
  const errorBanner =
    baseMsg && params.error_description
      ? `${baseMsg} (detalhe: ${decodeURIComponent(params.error_description)})`
      : baseMsg;

  // Banner de sucesso quando o user acabou de confirmar o email
  const confirmedBanner = params.confirmed === "1";

  return (
    <LoginForm
      demo={demo}
      next={params.next ?? "/home"}
      prefilledEmail={params.email ?? ""}
      errorBanner={errorBanner}
      confirmedBanner={confirmedBanner}
    >
      <p className="text-center">
        Novo por aqui?{" "}
        <Link
          href="/signup"
          className="font-medium text-brand-700 hover:text-brand-900"
        >
          Criar conta
        </Link>
      </p>
      <p className="mt-2 text-center">
        <Link
          href="/reset-password"
          className="text-muted hover:text-ink"
        >
          Esqueci minha senha
        </Link>
      </p>
    </LoginForm>
  );
}
