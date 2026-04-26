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

  // Confirma que o usuário tem uma sessão de recovery válida.
  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) {
      setHasSession(true); // demo mode — deixa passar
      return;
    }
    (
      supabase.auth.getSession() as Promise<{ data: { session: unknown } }>
    ).then((res) => {
      setHasSession(!!res.data.session);
    });
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
        setTimeout(() => router.push("/home"), 1500);
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
      setSuccess(true);
      setTimeout(() => router.push("/home"), 1800);
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
            Senha atualizada. Redirecionando…
          </p>
        ) : null}
        <Button type="submit" disabled={pending || success}>
          {pending ? "Salvando..." : success ? "Pronto" : "Atualizar senha"}
        </Button>
      </form>
    </AuthCard>
  );
}
