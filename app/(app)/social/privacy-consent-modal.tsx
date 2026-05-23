"use client";

import { useState, useTransition } from "react";
import { X, Globe, AlertTriangle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RANKING_SCOPE_LABEL, type RankingScope } from "@/lib/social/types";
import { toast } from "@/lib/toast";

/**
 * Modal de consent explícito antes de entrar em ranking público.
 *
 * Lucas (2026-05-23): "tem que só tomar cuidado para comparar
 * diretamente dados de saúde, a pessoa tem que ser notificada que ao
 * entrar em certos rankings ela deve estar ciente que pode compartilhar
 * com o público dados de saúde."
 *
 * Padrão LGPD-compliant: opt-in explícito, com timestamp + versão.
 */

const CONSENT_VERSION = "v1.2026-05-23";

interface PrivacyConsentModalProps {
  scope: RankingScope;
  onClose: () => void;
  onConsented: () => void;
}

export function PrivacyConsentModal({
  scope,
  onClose,
  onConsented,
}: PrivacyConsentModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [saving, startSaving] = useTransition();

  const scopeLabel = RANKING_SCOPE_LABEL[scope];

  const handleConsent = () => {
    if (!acknowledged) return;
    startSaving(async () => {
      try {
        const res = await fetch("/api/social/privacy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope,
            opt_in: true,
            consent_version: CONSENT_VERSION,
          }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error ?? "erro");
        toast.success({
          title: "Pronto!",
          description: `Você agora aparece no ranking ${scopeLabel.toLowerCase()}.`,
        });
        onConsented();
      } catch (e) {
        toast.error({
          title: "Erro ao salvar",
          description: e instanceof Error ? e.message : "—",
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-[520px] sm:rounded-3xl rounded-t-3xl">
        <header className="flex items-start justify-between border-b border-zinc-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700">
              <Globe className="h-5 w-5" />
            </span>
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                Ranking público
              </div>
              <h2 className="mt-0.5 text-[17px] font-semibold leading-tight text-zinc-900">
                Aparecer no ranking {scopeLabel.toLowerCase()}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 text-[13px] leading-relaxed text-zinc-700">
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[12px] text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Ao entrar nesse ranking, <strong>outros usuários</strong> da
              Longevify poderão ver:
            </span>
          </div>

          <ul className="mt-3 space-y-1.5 text-[12.5px]">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              Seu <strong>primeiro nome</strong>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <strong>Pontos totais</strong> e nível atual
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <strong>Sua cidade/estado</strong> (sem endereço)
            </li>
            {(scope === "city" || scope === "state" || scope === "country") && (
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                Métricas comparativas <strong>do mês</strong>: km corrida, treinos,
                streak
              </li>
            )}
          </ul>

          <h3 className="mt-5 text-[11.5px] font-semibold uppercase tracking-wider text-zinc-500">
            O que NUNCA é compartilhado
          </h3>
          <ul className="mt-1.5 space-y-1.5 text-[12.5px]">
            <li className="flex items-start gap-2">
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
              <span>
                Valores específicos de biomarcadores (glicose, colesterol, etc)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
              <span>Histórico médico, condições, medicações</span>
            </li>
            <li className="flex items-start gap-2">
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
              <span>Idade biológica, Longevify Score</span>
            </li>
            <li className="flex items-start gap-2">
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
              <span>Sobrenome, foto, contato, qualquer dado pessoal</span>
            </li>
          </ul>

          <p className="mt-5 rounded-xl bg-zinc-50 px-3 py-2.5 text-[11.5px] text-zinc-600">
            🔒 Você pode <strong>desativar a qualquer momento</strong> em Perfil →
            Privacidade dos rankings. Seus dados deixam de aparecer
            imediatamente.
          </p>

          <p className="mt-3 text-[10.5px] text-zinc-500">
            Termos: ao optar pelo ranking público você consente com o
            compartilhamento descrito acima conforme nossa{" "}
            <a href="/privacidade" className="underline">
              Política de Privacidade
            </a>
            . LGPD Art. 7º, §1º — consentimento livre, informado e específico.
          </p>

          <label
            className={cn(
              "mt-5 flex cursor-pointer items-start gap-2.5 rounded-xl border-2 px-3 py-2.5 transition",
              acknowledged
                ? "border-brand-300 bg-brand-50/40"
                : "border-zinc-200 hover:border-zinc-300",
            )}
          >
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-700"
            />
            <span className="text-[12.5px] text-zinc-700">
              Entendo e concordo em compartilhar essas informações no ranking{" "}
              {scopeLabel.toLowerCase()}.
            </span>
          </label>
        </div>

        <footer className="flex gap-2 border-t border-zinc-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConsent}
            disabled={!acknowledged || saving}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Salvando…
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Entrar no ranking
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
