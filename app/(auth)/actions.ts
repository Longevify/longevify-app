"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type AuthActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

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
  if (error) return { ok: false, error: translateAuthError(error.message) };
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
  const chronologicalAge = Number(formData.get("chronologicalAge") ?? 0);

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
  if (!chronologicalAge || chronologicalAge < 16 || chronologicalAge > 120) {
    return { ok: false, error: "Informe uma idade válida (16-120)." };
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
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: buildRedirectUrl(h, "/auth/callback"),
      data: {
        first_name: firstName,
        last_name: lastName,
        chronological_age: String(chronologicalAge),
      },
    },
  });
  if (error) return { ok: false, error: translateAuthError(error.message) };
  return {
    ok: true,
    message:
      "Conta criada. Se a confirmação por e-mail estiver ativa no Supabase, verifique sua caixa para completar o login.",
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
    redirectTo: buildRedirectUrl(h, "/auth/callback"),
  });
  if (error) return { ok: false, error: translateAuthError(error.message) };
  return {
    ok: true,
    message: "Link de recuperação enviado. Confira seu e-mail.",
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
  if (lower.includes("email rate limit"))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (lower.includes("user already registered"))
    return "E-mail já cadastrado. Tente entrar ou recuperar a senha.";
  return msg;
}
