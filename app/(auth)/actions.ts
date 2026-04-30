"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type AuthActionResult =
  | { ok: true; message?: string; email?: string }
  | {
      ok: false;
      error: string;
      emailNotConfirmed?: boolean;
      emailAlreadyRegistered?: boolean;
      email?: string;
    };

const DEMO_COOKIE = "longevify_demo_session";

function buildRedirectUrl(request: Headers, path: string): string {
  const proto =
    request.get("x-forwarded-proto") ?? "http";
  const host =
    request.get("x-forwarded-host") ?? request.get("host") ?? "localhost:3000";
  return `${proto}://${host}${path}`;
}

// ---------------------------------------------------------------------------
// sign in with email + password
// ---------------------------------------------------------------------------
export async function signInWithPassword(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/home");

  if (!email || !password) {
    return { ok: false, error: "Informe e-mail e senha." };
  }

  if (!isSupabaseConfigured()) {
    const store = await cookies();
    store.set(DEMO_COOKIE, "1", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
    redirect(next);
  }

  const supabase = await getServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const isEmailNotConfirmed = error.message.toLowerCase().includes("email not confirmed");
    return {
      ok: false,
      error: translateAuthError(error.message),
      ...(isEmailNotConfirmed ? { emailNotConfirmed: true } : {}),
    };
  }
  redirect(next);
}

// ---------------------------------------------------------------------------
// sign in with magic link
// ---------------------------------------------------------------------------
export async function signInWithMagicLink(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, error: "Informe seu e-mail." };

  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      message: "Modo demo: ative Supabase para envio real de links mágicos.",
    };
  }

  const supabase = await getServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const h = await headers();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: buildRedirectUrl(h, "/auth/callback"),
    },
  });
  if (error) return { ok: false, error: translateAuthError(error.message) };
  return {
    ok: true,
    message: "Enviamos um link mágico para o seu e-mail. Confira a caixa de entrada.",
  };
}

// ---------------------------------------------------------------------------
// sign up
// ---------------------------------------------------------------------------
export async function signUp(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const birthDate = String(formData.get("birthDate") ?? "").trim();

  if (!firstName || !lastName) {
    return { ok: false, error: "Informe seu nome completo." };
  }
  if (!email || !password) {
    return { ok: false, error: "Informe e-mail e senha." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Senha precisa ter no mínimo 8 caracteres." };
  }
  if (password !== confirmPassword) {
    return { ok: false, error: "As senhas não coincidem." };
  }
  // Validar data de nascimento (YYYY-MM-DD do <input type=date>) e calcular idade
  const chronologicalAge = (() => {
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return 0;
    const today = new Date();
    const birth = new Date(birthDate + "T00:00:00");
    if (Number.isNaN(birth.getTime())) return 0;
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  })();
  if (!chronologicalAge || chronologicalAge < 16 || chronologicalAge > 120) {
    return {
      ok: false,
      error: "Informe uma data de nascimento válida (idade entre 16 e 120).",
    };
  }

  if (!isSupabaseConfigured()) {
    const store = await cookies();
    store.set(DEMO_COOKIE, "1", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
    redirect("/home");
  }

  const supabase = await getServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const h = await headers();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: buildRedirectUrl(h, "/auth/callback"),
      data: {
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        chronological_age: String(chronologicalAge),
      },
    },
  });
  if (error) {
    const lower = error.message.toLowerCase();
    const alreadyRegistered =
      lower.includes("user already registered") ||
      lower.includes("already been registered");
    return {
      ok: false,
      error: translateAuthError(error.message),
      ...(alreadyRegistered ? { emailAlreadyRegistered: true, email } : {}),
    };
  }
  // Quando "Confirm email" está ON no Supabase, signUp retorna sucesso com
  // identities vazio se o e-mail já existir (proteção contra enumeração).
  // Detectamos isso e tratamos como email já cadastrado.
  const identities = data?.user?.identities ?? [];
  if (data?.user && identities.length === 0) {
    return {
      ok: false,
      error:
        "E-mail já cadastrado. Tente entrar com sua senha ou recuperar o acesso.",
      emailAlreadyRegistered: true,
      email,
    };
  }
  return {
    ok: true,
    email,
    message:
      "Conta criada. Enviamos um link de confirmação para " +
      email +
      ". Verifique sua caixa de entrada (e a pasta de spam) antes de entrar.",
  };
}

// ---------------------------------------------------------------------------
// reset password — sends recovery email
// ---------------------------------------------------------------------------
export async function requestPasswordReset(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, error: "Informe seu e-mail." };

  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      message:
        "Modo demo: em produção, enviaríamos um link de recuperação para o e-mail informado.",
    };
  }

  const supabase = await getServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const h = await headers();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // ?type=recovery garante que o /auth/callback roteia pra /update-password
    // em vez de mandar direto pra /home (Supabase não anexa o type sozinho).
    redirectTo: buildRedirectUrl(h, "/auth/callback?type=recovery"),
  });
  if (error) return { ok: false, error: translateAuthError(error.message) };
  return {
    ok: true,
    message: "Link de recuperação enviado. Confira seu e-mail.",
  };
}

// ---------------------------------------------------------------------------
// reenviar e-mail de confirmação
// ---------------------------------------------------------------------------
export async function resendConfirmationEmail(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, error: "Informe seu e-mail." };

  if (!isSupabaseConfigured()) {
    return { ok: true, message: "Modo demo: Supabase não configurado." };
  }

  const supabase = await getServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const h = await headers();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: buildRedirectUrl(h, "/auth/callback"),
    },
  });
  if (error) return { ok: false, error: translateAuthError(error.message) };
  return {
    ok: true,
    message: "E-mail de confirmação reenviado. Verifique sua caixa de entrada.",
  };
}

// ---------------------------------------------------------------------------
// demo bypass — skip auth in demo mode
// ---------------------------------------------------------------------------
export async function enterDemoMode(): Promise<void> {
  const store = await cookies();
  store.set(DEMO_COOKIE, "1", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/home");
}

function translateAuthError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login")) return "E-mail ou senha inválidos.";
  if (lower.includes("email not confirmed"))
    return "E-mail ainda não confirmado. Verifique sua caixa de entrada e clique no link que enviamos — ou use o link mágico abaixo para entrar sem senha.";
  if (lower.includes("email rate limit"))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (lower.includes("user already registered"))
    return "E-mail já cadastrado. Tente entrar ou recuperar a senha.";
  // SMTP / envio de e-mail (Resend, Sendgrid, etc) — costuma cair aqui quando
  // o domínio do sender ainda não foi verificado ou o provedor está fora do ar.
  if (
    lower.includes("error sending confirmation email") ||
    lower.includes("error sending magic link") ||
    lower.includes("error sending recovery email") ||
    lower.includes("error sending email")
  )
    return "Não conseguimos enviar o e-mail agora. Tente novamente em alguns minutos — se persistir, fala com o suporte.";
  if (lower.includes("for security purposes") && lower.includes("seconds"))
    return "Aguarde alguns segundos antes de pedir outro e-mail.";
  if (lower.includes("signup is disabled"))
    return "Cadastro temporariamente desativado. Tente novamente mais tarde.";
  return msg;
}
