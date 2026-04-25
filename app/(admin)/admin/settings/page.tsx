"use client";

import { Settings as SettingsIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetAdminStorage } from "@/lib/admin/storage";

export default function SettingsStubPage() {
  function handleReset() {
    if (
      !window.confirm(
        "Resetar storage admin? Os pacientes e exames lançados localmente serão substituídos pelos dados de seed.",
      )
    )
      return;
    resetAdminStorage();
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <span className="text-[12px] font-medium uppercase tracking-wider text-muted">
          Configurações
        </span>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-[14px] text-muted">
          Preferências do painel e utilidades de dev.
        </p>
      </header>

      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-border bg-surface p-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-700">
          <SettingsIcon className="h-5 w-5" />
        </span>
        <h2 className="text-[16px] font-semibold">Em breve — Wave 2</h2>
        <p className="max-w-md text-[13px] text-muted">
          Preferências da clínica, equipe e integração com Supabase chegam na
          próxima wave.
        </p>
      </div>

      <div className="rounded-[16px] border border-border bg-surface p-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">
          Dev & QA
        </h2>
        <p className="mt-2 text-[13px] text-muted">
          O painel usa localStorage como adapter na Wave 1. Você pode resetar o
          estado local para os dados de seed.
        </p>
        <Button variant="outline" className="mt-4 gap-2" onClick={handleReset}>
          <RefreshCw className="h-4 w-4" /> Resetar storage
        </Button>
      </div>
    </div>
  );
}
