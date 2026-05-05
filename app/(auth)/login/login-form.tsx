"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthInput } from "@/components/auth/auth-input";
import { Button } from "@/components/ui/button";
import {
  enterDemoMode,
  resendConfirmationEmail,
  signInWithMagicLink,
  signInWithPassword,
  type AuthActionResult,
} from "../actions";

interface LoginFormProps {
  demo: boolean;
  next: string;
  prefilledEmail?: string;
  errorBanner?: string | null;
  confirmedBanner?: boolean;
  children: React.ReactNode;
}

export function LoginForm({
  demo,
  next,
  prefilledEmail = "",
  errorBanner,
  confirmedBanner = false,
  children,
}: LoginFormProps) {
  const [email, setEmail] = useState(prefilledEmail);
  const [loginState, loginAction, loginPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(signInWithPassword, null);
  const [magicState, magicAction, magicPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(signInWithMagicLink, null);
  const [resendState, resendAction, resendPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(resendConfirmationEmail, null);
  const [demoPending, startDemo] = useTransition();

  const showResendButton =
    loginState && !loginState.ok && "emailNotConfirmed" in loginState && loginState.emailNotConfirmed;

  // Após login bem-sucedido, faz hard-navigation pra carregar a página
  // destino com os cookies de sessão recém setados. Soft-nav (router.push
  // ou next/navigation redirect) renderizaria como deslogado até refresh.
  useEffect(() => {
    if (loginState && loginState.ok && loginState.redirectTo) {
      window.location.replace(loginState.redirectTo);
    }
  }, [loginState]);

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
      {confirmedBanner ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-[13px] text-brand-800">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-700 text-white">
            ✓
          </span>
          <div>
            <div className="font-semibold">E-mail confirmado!</div>
            <div className="mt-0.5 text-brand-700">
              Sua conta está ativa. Faça login abaixo para entrar na plataforma.
            </div>
          </div>
        </div>
      ) : null}
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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

      {/* Reenvio de confirmação — só aparece quando o erro é email not confirmed.
          Usa o e-mail já digitado no form de login. */}
      {showResendButton ? (
        <form action={resendAction} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="email" value={email} />
          {resendState?.ok && resendState.message ? (
            <p className="text-[13px] text-brand-700">{resendState.message}</p>
          ) : null}
          {resendState && !resendState.ok ? (
            <p className="text-[13px] text-[color:var(--color-status-out)]">
              {resendState.error}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="outline"
            disabled={resendPending || !email}
            className="text-[13px]"
          >
            {resendPending ? "Enviando..." : "Reenviar e-mail de confirmação"}
          </Button>
        </form>
      ) : null}

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
        {/* H6: borda brand-700 + texto verde pra diferenciar visualmente do fundo do card */}
        <Button
          type="submit"
          variant="outline"
          disabled={magicPending}
          className="border-brand-700 text-brand-700 hover:bg-brand-50"
        >
          {magicPending ? "Enviando..." : "Enviar link mágico"}
        </Button>
      </form>

      {/* Botão demo — sempre visível pra permitir explorar a plataforma com
          dados fictícios do paciente exemplo João Silva, sem precisar criar
          conta. Cookie longevify_demo_session tem prioridade sobre o JWT
          do Supabase, então funciona mesmo com Supabase configurado. */}
      <div className="mt-6">
        <div className="mb-2 text-center text-[12px] text-muted">
          {demo
            ? "Sem Supabase configurado — qualquer credencial entra."
            : "Quer só conhecer? Use os dados fictícios do João Silva:"}
        </div>
        <form action={() => startDemo(() => enterDemoMode())}>
          <Button
            type="submit"
            variant="dark"
            className="w-full"
            disabled={demoPending}
          >
            {demoPending ? "Carregando..." : "Entrar como demo"}
          </Button>
        </form>
      </div>
    </AuthCard>
  );
}
