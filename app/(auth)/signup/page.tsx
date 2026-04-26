import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SignupForm } from "./signup-form";

export const metadata = {
  title: "Criar conta — Longevify",
};

export default function SignupPage() {
  const demo = !isSupabaseConfigured();
  return (
    <SignupForm demo={demo}>
      <p className="text-center">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-700 hover:text-brand-900"
        >
          Entrar
        </Link>
      </p>
    </SignupForm>
  );
}
