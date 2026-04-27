"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthInput } from "@/components/auth/auth-input";
import { PasswordMatchInput } from "@/components/auth/password-match-input";
import { BRDateInput } from "@/components/ui/br-date-input";
import { Button } from "@/components/ui/button";
import {
  resendConfirmationEmail,
  signUp,
  type AuthActionResult,
} from "../actions";

interface SignupFormProps {
  demo: boolean;
  children: React.ReactNode;
}

export function SignupForm({ demo, children }: SignupFormProps) {
  const [state, action, pending] = useActionState<
    AuthActionResult | null,
    FormData
  >(signUp, null);

  // Controlled inputs — necessário pro indicador de match de senha + pra
  // preencher o link de "Entrar" com o e-mail digitado.
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsDiffer =
    password.length > 0 && confirmPassword.length > 0 && password !== confirmPassword;

  // ---- Sucesso: mostra painel de "verifique seu e-mail" + botão pra login.
  if (state?.ok) {
    return (
      <AuthCard
        title="Conta criada!"
        subtitle="Falta só um passo: confirmar seu e-mail."
        footer={children}
      >
        <SuccessPanel email={state.email ?? email} message={state.message} />
      </AuthCard>
    );
  }

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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <BRDateInput
          label="Data de nascimento"
          name="birthDate"
          value={birthDate}
          onChange={setBirthDate}
          required
          max={new Date().toISOString().slice(0, 10)}
          hint="Usamos pra calcular sua idade biológica vs cronológica."
        />
        <AuthInput
          label="Senha"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          hint="Mínimo 8 caracteres."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordMatchInput
          label="Confirmar senha"
          name="confirmPassword"
          value={confirmPassword}
          compareTo={password}
          onChange={setConfirmPassword}
          required
        />

        {/* Erro: e-mail já cadastrado → atalho pro login com e-mail pré-preenchido. */}
        {state && !state.ok && state.emailAlreadyRegistered ? (
          <div className="rounded-xl border border-[#FBE1E1] bg-[#FBE1E1]/40 px-4 py-3 text-[13px] text-[#B6333A]">
            <p className="font-medium">{state.error}</p>
            <Link
              href={`/login?email=${encodeURIComponent(state.email ?? email)}`}
              className="mt-2 inline-block text-[12px] font-semibold underline"
            >
              Entrar com este e-mail →
            </Link>
          </div>
        ) : state && !state.ok ? (
          <p className="text-[13px] text-[color:var(--color-status-out)]">
            {state.error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={pending || passwordsDiffer}
          className="mt-1"
        >
          {pending ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>
    </AuthCard>
  );
}

// ---------------------------------------------------------------------------
// Painel de sucesso depois do signup — "verifique seu e-mail" + botão login
// + opção de reenviar confirmação.
// ---------------------------------------------------------------------------
function SuccessPanel({
  email,
  message,
}: {
  email: string;
  message?: string;
}) {
  const [resendState, resendAction, resendPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(resendConfirmationEmail, null);
  const [, startNav] = useTransition();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-5 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-700">
          <MailCheck className="h-6 w-6" />
        </span>
        <p className="text-[14px] text-ink">
          {message ??
            `Conta criada. Enviamos um link de confirmação para ${email}.`}
        </p>
        <p className="text-[12px] text-muted">
          Confira sua caixa de entrada — e olhe na pasta de spam, às vezes ele
          cai lá.
        </p>
      </div>

      <Link
        href={`/login?email=${encodeURIComponent(email)}`}
        prefetch={false}
        onClick={() => startNav(() => {})}
        className="block"
      >
        <Button type="button" variant="primary" className="w-full">
          Ir para o login
        </Button>
      </Link>

      <form action={resendAction} className="flex flex-col gap-2">
        <input type="hidden" name="email" value={email} />
        <Button
          type="submit"
          variant="outline"
          className="w-full"
          disabled={resendPending}
        >
          {resendPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Reenviando...
            </>
          ) : (
            "Não recebi — reenviar e-mail"
          )}
        </Button>
        {resendState?.ok && resendState.message ? (
          <p className="flex items-center gap-1.5 text-[12px] text-[#1F9D55]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {resendState.message}
          </p>
        ) : resendState && !resendState.ok ? (
          <p className="text-[12px] text-[color:var(--color-status-out)]">
            {resendState.error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
