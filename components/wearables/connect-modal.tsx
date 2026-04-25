"use client";

import { ExternalLink, Mail, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AppleHealthUpload } from "./apple-health-upload";
import type { DailyHealthMetrics, WearableBrand } from "@/lib/wearables-mock";

type ConnectMode =
  | { kind: "oauth"; provider: "oura" | "whoop" }
  | { kind: "apple" }
  | { kind: "garmin" }
  | { kind: "coming"; brand: WearableBrand; name: string };

const PROVIDER_COPY = {
  oura: {
    name: "Oura",
    desc: "Sono, recuperação e HRV do seu Oura Ring direto na Longevify.",
    perms: ["Sono diário", "Atividade", "HRV e frequência cardíaca", "Workouts"],
  },
  whoop: {
    name: "Whoop",
    desc: "Recovery, strain e ciclos do seu Whoop sincronizados a cada acesso.",
    perms: ["Recovery score", "Sleep stages", "Cycles", "Workouts"],
  },
} as const;

export function ConnectModal({
  mode,
  onClose,
  onAppleParsed,
  onNotify,
}: {
  mode: ConnectMode | null;
  onClose: () => void;
  onAppleParsed?: (metrics: DailyHealthMetrics[]) => void;
  onNotify?: (brand: WearableBrand, email: string) => void;
}) {
  const [oauthState, setOauthState] = useState<{
    loading: boolean;
    error: string | null;
  }>({ loading: false, error: null });

  useEffect(() => {
    setOauthState({ loading: false, error: null });
  }, [mode]);

  if (!mode) return null;

  async function startOAuth(provider: "oura" | "whoop") {
    setOauthState({ loading: true, error: null });
    try {
      const res = await fetch(`/api/wearables/${provider}/connect`, {
        method: "GET",
        redirect: "manual",
      });
      if (res.status === 503) {
        const body = await res.json().catch(() => ({}));
        setOauthState({
          loading: false,
          error:
            body.message ??
            "Em breve - estamos finalizando a integração.",
        });
        return;
      }
      window.location.href = `/api/wearables/${provider}/connect`;
    } catch {
      setOauthState({ loading: false, error: "Falha ao iniciar conexão." });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[520px] rounded-[20px] border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-black/5"
        >
          <X className="h-4 w-4" />
        </button>

        {mode.kind === "oauth" ? (
          <OAuthBody
            provider={mode.provider}
            state={oauthState}
            onStart={() => startOAuth(mode.provider)}
          />
        ) : null}

        {mode.kind === "apple" ? (
          <AppleBody
            onParsed={(m) => {
              onAppleParsed?.(m);
            }}
            onClose={onClose}
          />
        ) : null}

        {mode.kind === "garmin" ? (
          <GarminBody
            onNotify={(email) => onNotify?.("garmin", email)}
            onClose={onClose}
          />
        ) : null}

        {mode.kind === "coming" ? (
          <ComingBody
            name={mode.name}
            onNotify={(email) => onNotify?.(mode.brand, email)}
            onClose={onClose}
          />
        ) : null}
      </div>
    </div>
  );
}

function OAuthBody({
  provider,
  state,
  onStart,
}: {
  provider: "oura" | "whoop";
  state: { loading: boolean; error: string | null };
  onStart: () => void;
}) {
  const copy = PROVIDER_COPY[provider];
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[12px] uppercase tracking-[0.12em] text-muted">
          Conexão OAuth
        </div>
        <h3 className="mt-1 text-[20px] font-semibold tracking-tight">
          Conectar {copy.name}
        </h3>
        <p className="mt-2 text-[13px] text-muted">{copy.desc}</p>
      </div>

      <div className="rounded-[14px] border border-border bg-brand-50/40 p-4">
        <div className="text-[12px] font-medium text-ink">
          Permissões solicitadas
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-y-1 text-[12px] text-muted">
          {copy.perms.map((p) => (
            <li key={p} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {p}
            </li>
          ))}
        </ul>
      </div>

      {state.error ? (
        <div className="rounded-xl bg-[#FBF0D4] px-3 py-2 text-[13px] text-[#8A6A13]">
          {state.error}
          <div className="mt-2 text-[12px]">
            Quer ser avisado quando estiver disponível?{" "}
            <a
              href={`mailto:hello@longevify.app?subject=Waitlist ${copy.name}`}
              className="underline"
            >
              Entrar na waitlist
            </a>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={onStart}
          disabled={state.loading}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {state.loading
            ? "Iniciando..."
            : `Conectar com ${copy.name}`}
        </Button>
        <span className="text-[12px] text-muted">
          Você será redirecionado ao site do {copy.name}.
        </span>
      </div>
    </div>
  );
}

function AppleBody({
  onParsed,
  onClose,
}: {
  onParsed: (m: DailyHealthMetrics[]) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[12px] uppercase tracking-[0.12em] text-muted">
          Importação manual
        </div>
        <h3 className="mt-1 text-[20px] font-semibold tracking-tight">
          Importar Apple Health
        </h3>
        <p className="mt-2 text-[13px] text-muted">
          Sem app iOS instalado, importamos diretamente do export do iPhone.
          Processado localmente — nada sai do seu navegador.
        </p>
      </div>

      <ol className="flex flex-col gap-3 text-[13px]">
        <Step
          n={1}
          title="Abra o app Saúde"
          desc="No iPhone, abra Saúde, toque na sua foto (canto superior direito) > Exportar todos os dados de saúde."
        />
        <Step
          n={2}
          title="Aguarde e descompacte"
          desc="O iPhone gera um .zip — pode levar alguns minutos. Extraia e localize export.xml dentro da pasta apple_health_export."
        />
        <Step
          n={3}
          title="Envie o arquivo"
          desc="Selecione o export.xml abaixo. Mostramos as métricas extraídas em seguida."
        />
      </ol>

      <AppleHealthUpload
        onParsed={(m) => {
          onParsed(m);
          setTimeout(onClose, 1200);
        }}
      />
    </div>
  );
}

function GarminBody({
  onNotify,
  onClose,
}: {
  onNotify: (email: string) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[12px] uppercase tracking-[0.12em] text-muted">
          Garmin Connect
        </div>
        <h3 className="mt-1 text-[20px] font-semibold tracking-tight">
          Conectar Garmin
        </h3>
        <p className="mt-2 text-[13px] text-muted">
          A Garmin não disponibiliza API web direta sem partnership. Temos duas
          alternativas até nossa parceria sair:
        </p>
      </div>

      <div className="rounded-[14px] border border-brand-200 bg-brand-50/50 p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-700 text-white">
            <Smartphone className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <div className="text-[14px] font-semibold">
              Opção A — Apple Watch como ponte
            </div>
            <p className="mt-1 text-[13px] text-muted">
              Se você usa iPhone, o Garmin Connect já sincroniza com o app
              Saúde. Exporte o histórico do Apple Health e importamos tudo aqui.
            </p>
            <p className="mt-2 text-[12px] text-muted">
              Configure em: Garmin Connect {">"} Mais {">"} Configurações {">"}{" "}
              Apple Saúde.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-border bg-surface p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0a2a43] text-white">
            <Mail className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <div className="text-[14px] font-semibold">
              Opção B — Avise-me da parceria oficial
            </div>
            <p className="mt-1 text-[13px] text-muted">
              Estamos finalizando partnership com Garmin Connect. Deixe seu
              email pra ser avisado primeiro.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 flex-1 rounded-full border border-border bg-white px-3 text-[13px] outline-none focus:border-brand-500"
              />
              <Button
                variant="primary"
                size="sm"
                disabled={!email.includes("@")}
                onClick={() => {
                  onNotify(email);
                  onClose();
                }}
              >
                Avisar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComingBody({
  name,
  onNotify,
  onClose,
}: {
  name: string;
  onNotify: (email: string) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[12px] uppercase tracking-[0.12em] text-muted">
          Em breve
        </div>
        <h3 className="mt-1 text-[20px] font-semibold tracking-tight">
          Conectar {name}
        </h3>
        <p className="mt-2 text-[13px] text-muted">
          Estamos finalizando a integração com {name}. Deixe seu email para
          avisarmos assim que estiver pronto.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 flex-1 rounded-full border border-border bg-white px-4 text-[13px] outline-none focus:border-brand-500"
        />
        <Button
          variant="primary"
          size="sm"
          disabled={!email.includes("@")}
          onClick={() => {
            onNotify(email);
            onClose();
          }}
        >
          Entrar na lista
        </Button>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  desc,
}: {
  n: number;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-900 text-[12px] font-semibold text-white">
        {n}
      </span>
      <div>
        <div className="text-[13px] font-medium">{title}</div>
        <div className="text-[12px] text-muted">{desc}</div>
      </div>
    </li>
  );
}
