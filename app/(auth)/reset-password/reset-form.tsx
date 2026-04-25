"use client";

import { useActionState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthInput } from "@/components/auth/auth-input";
import { Button } from "@/components/ui/button";
import { requestPasswordReset, type AuthActionResult } from "../actions";

export function ResetPasswordForm({ children }: { children: React.ReactNode }) {
  const [state, action, pending] = useActionState<
    AuthActionResult | null,
    FormData
  >(requestPasswordReset, null);

  return (
    <AuthCard
      title="Recuperar senha"
      subtitle="Informe o e-mail cadastrado e enviamos um link seguro para redefinir sua senha."
      footer={children}
    >
      <form action={action} className="flex flex-col gap-4">
        <AuthInput
          label="E-mail"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="voce@exemplo.com"
        />
        {state?.ok && state.message ? (
          <p className="text-[13px] text-brand-700">{state.message}</p>
        ) : null}
        {state && !state.ok ? (
          <p className="text-[13px] text-[color:var(--color-status-out)]">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando..." : "Enviar link"}
        </Button>
      </form>
    </AuthCard>
  );
}
