"use client";

import { useActionState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthInput } from "@/components/auth/auth-input";
import { Button } from "@/components/ui/button";
import { signUp, type AuthActionResult } from "../actions";

interface SignupFormProps {
  demo: boolean;
  children: React.ReactNode;
}

export function SignupForm({ demo, children }: SignupFormProps) {
  const [state, action, pending] = useActionState<
    AuthActionResult | null,
    FormData
  >(signUp, null);

  return (
    <AuthCard
      title="Criar sua conta Longevify"
      subtitle={
        demo
          ? "Modo demo — qualquer dado válido entra direto no painel."
          : "Leva menos de um minuto. Depois é só subir seu primeiro exame."
      }
      footer={children}
    >
      <form action={action} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AuthInput
            label="Primeiro nome"
            name="firstName"
            autoComplete="given-name"
            required
            placeholder="João"
          />
          <AuthInput
            label="Sobrenome"
            name="lastName"
            autoComplete="family-name"
            required
            placeholder="Silva"
          />
        </div>
        <AuthInput
          label="E-mail"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="voce@exemplo.com"
        />
        <AuthInput
          label="Data de nascimento"
          type="date"
          name="birthDate"
          required
          hint="Usamos pra calcular sua idade biológica vs cronológica."
        />
        <AuthInput
          label="Senha"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          hint="Mínimo 8 caracteres."
        />
        <AuthInput
          label="Confirmar senha"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
        />
        {state?.ok && state.message ? (
          <p className="text-[13px] text-brand-700">{state.message}</p>
        ) : null}
        {state && !state.ok ? (
          <p className="text-[13px] text-[color:var(--color-status-out)]">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="mt-1">
          {pending ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>
    </AuthCard>
  );
}
