"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthInput } from "@/components/auth/auth-input";
import { Button } from "@/components/ui/button";
import { getBrowserClient } from "@/lib/supabase/browser";

/**
 * Esta página é destino do email de "Reset password" do Supabase. Quando o
 * usuário clica no link, o Supabase já cria uma sessão temporária no browser
 * (via callback). Aqui ele só precisa digitar a nova senha — chamamos
 * `auth.updateUser({ password })` que é válido enquanto a sessão temp existir.
 */
export function UpdatePasswordForm({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  // 1. Se vier `?code=XXX` na URL (link do email de recovery), troca
  //    pelo session temp.
  // 2. Senão, verifica se já tem sessão (caso o user atualize a página).
  // 3. Captura o email do user pra pré-preencher no /login após o sign-out.
  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) {
      setHasSession(true); // demo mode — deixa passar
      return;
    }

    async function init() {
      // Pega `?code=` se veio do email de recovery
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const errorCode = url.searchParams.get("error_code");
      if (errorCode) {
        setHasSession(false);
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase!.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setHasSession(false);
          return;
        }
        // Limpa o code da URL pra não vazar e pra refresh não tentar reutilizar
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.toString());
      }

      const res = (await supabase!.auth.getSession()) as {
        data: { session: { user?: { email?: string } } | null };
      };
      const session = res.data.session;
      setHasSession(!!session);
      if (session?.user?.email) setUserEmail(session.user.email);
    }

    void init();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Senha precisa ter no mínimo 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setPending(true);
    try {
      const supabase = getBrowserClient();
      if (!supabase) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 1500);
        return;
      }
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(
          err.message.includes("session") || err.message.includes("Auth")
            ? "Sua sessão de recuperação expirou. Solicite um novo link de reset."
            : err.message,
        );
        setPending(false);
        return;
      }
      // Desloga a sessão de recovery e força o user a logar de novo com a
      // senha nova — UX combinada com o pedido do Lucas: redefinir senha →
      // tela de login → entrar com a senha nova.
      await supabase.auth.signOut();
      setSuccess(true);
      const next = userEmail
        ? `/login?email=${encodeURIComponent(userEmail)}`
        : "/login";
      setTimeout(() => router.push(next), 1800);
    } catch {
      setError("Algo deu errado. Tenta de novo em alguns segundos.");
      setPending(false);
    }
  }

  if (hasSession === false) {
    return (
      <AuthCard
        title="Link expirado"
        subtitle="Sua sessão de recuperação não está mais válida. Solicite um novo link de reset."
        footer={children}
      >
        <Button onClick={() => router.push("/reset-password")}>
          Solicitar novo link
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Definir nova senha"
      subtitle="Escolha uma nova senha pra finalizar a recuperação."
      footer={children}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthInput
          label="Nova senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          hint="Mínimo 8 caracteres."
        />
        <AuthInput
          label="Confirmar nova senha"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />
        {error ? (
          <p className="text-[13px] text-[color:var(--color-status-out)]">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-[13px] text-brand-700">
            Senha atualizada. Te mandando pra tela de login…
          </p>
        ) : null}
        <Button type="submit" disabled={pending || success}>
          {pending ? "Salvando..." : success ? "Pronto" : "Atualizar senha"}
        </Button>
      </form>
    </AuthCard>
  );
}
