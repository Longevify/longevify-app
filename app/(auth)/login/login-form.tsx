"use client";

import { useActionState, useTransition } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthInput } from "@/components/auth/auth-input";
import { Button } from "@/components/ui/button";
import {
  enterDemoMode,
  signInWithMagicLink,
  signInWithPassword,
  type AuthActionResult,
} from "../actions";

interface LoginFormProps {
  demo: boolean;
  next: string;
  errorBanner?: string | null;
  children: React.ReactNode;
}

export function LoginForm({ demo, next, errorBanner, children }: LoginFormProps) {
  const [loginState, loginAction, loginPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(signInWithPassword, null);
  const [magicState, magicAction, magicPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(signInWithMagicLink, null);
  const [demoPending, startDemo] = useTransition();

  return (
    <AuthCard
      title="Bem-vindo de volta"
      subtitle={
        demo
          ? "Modo demo ativo — entre com qualquer e-mail/senha ou use 'Entrar como demo'."
          : "Entre com seu e-mail e senha para acessar seu painel."
      }
      footer={children}
    >
      {errorBanner ? (
        <div className="mb-4 rounded-xl border border-[#FBE1E1] bg-[#FBE1E1]/40 px-4 py-3 text-[13px] text-[#B6333A]">
          {errorBanner}
        </div>
      ) : null}
      <form action={loginAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <AuthInput
          label="E-mail"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="voce@exemplo.com"
        />
        <AuthInput
          label="Senha"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
        {loginState && !loginState.ok ? (
          <p className="text-[13px] text-[color:var(--color-status-out)]">
            {loginState.error}
          </p>
        ) : null}
        <Button type="submit" disabled={loginPending} className="mt-1">
          {loginPending ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={magicAction} className="flex flex-col gap-3">
        <AuthInput
          label="Receber link mágico"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          hint="Enviamos um link para entrar sem senha."
        />
        {magicState?.ok && magicState.message ? (
          <p className="text-[13px] text-brand-700">{magicState.message}</p>
        ) : null}
        {magicState && !magicState.ok ? (
          <p className="text-[13px] text-[color:var(--color-status-out)]">
            {magicState.error}
          </p>
        ) : null}
        <Button type="submit" variant="outline" disabled={magicPending}>
          {magicPending ? "Enviando..." : "Enviar link mágico"}
        </Button>
      </form>

      {demo ? (
        <form
          className="mt-6"
          action={() => startDemo(() => enterDemoMode())}
        >
          <Button
            type="submit"
            variant="dark"
            className="w-full"
            disabled={demoPending}
          >
            {demoPending ? "Carregando..." : "Entrar como demo"}
          </Button>
        </form>
      ) : null}
    </AuthCard>
  );
}
