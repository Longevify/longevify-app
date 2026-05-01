"use client";

import { Settings as SettingsIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetAdminStorage } from "@/lib/admin/storage";

export default function SettingsStubPage() {
  function handleReset() {
    if (
      !window.confirm(
        "Restaurar dados iniciais? Os pacientes e exames cadastrados durante o teste serão substituídos pelos dados de exemplo originais.",
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
        <h2 className="text-[16px] font-semibold">Em breve</h2>
        <p className="max-w-md text-[13px] text-muted">
          Preferências da clínica, gestão de equipe e integrações vão aparecer
          aqui na próxima atualização.
        </p>
      </div>

      <div className="rounded-[16px] border border-border bg-surface p-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">
          Manutenção
        </h2>
        <p className="mt-2 text-[13px] text-muted">
          Use este botão pra restaurar o painel ao estado inicial caso algo
          fique com problema visual ou os dados de demonstração precisem voltar.
        </p>
        <Button variant="outline" className="mt-4 gap-2" onClick={handleReset}>
          <RefreshCw className="h-4 w-4" /> Restaurar dados iniciais
        </Button>
      </div>
    </div>
  );
}
