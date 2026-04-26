import Link from "next/link";
import { UpdatePasswordForm } from "./update-password-form";

export const metadata = {
  title: "Definir nova senha — Longevify",
};

export default function UpdatePasswordPage() {
  return (
    <UpdatePasswordForm>
      <p className="text-center">
        <Link
          href="/login"
          className="font-medium text-brand-700 hover:text-brand-900"
        >
          Voltar ao login
        </Link>
      </p>
    </UpdatePasswordForm>
  );
}
