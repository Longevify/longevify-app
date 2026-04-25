import Link from "next/link";
import { ResetPasswordForm } from "./reset-form";

export const metadata = {
  title: "Recuperar senha — Longevify",
};

export default function ResetPasswordPage() {
  return (
    <ResetPasswordForm>
      <p className="text-center">
        Lembrou da senha?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-700 hover:text-brand-900"
        >
          Voltar ao login
        </Link>
      </p>
    </ResetPasswordForm>
  );
}
