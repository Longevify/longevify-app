import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar — Longevify",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const demo = !isSupabaseConfigured();
  return (
    <LoginForm demo={demo} next={next ?? "/home"}>
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
