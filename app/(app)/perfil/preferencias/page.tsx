"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Globe,
  Lock,
  Palette,
  Ruler,
  Settings,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

type LanguageCode = "pt-BR" | "en-US" | "es-ES";
type Theme = "claro" | "escuro" | "auto";
type UnitSystem = "metric" | "imperial";
type GlucoseUnit = "mgdl" | "mmoll";
type CholesterolUnit = "mgdl" | "mmoll";

interface Preferences {
  language: LanguageCode;
  theme: Theme;
  units: UnitSystem;
  glucose: GlucoseUnit;
  cholesterol: CholesterolUnit;
  shareAnonymized: boolean;
  allowProtocolImprovement: boolean;
}

const DEFAULT_PREFS: Preferences = {
  language: "pt-BR",
  theme: "claro",
  units: "metric",
  glucose: "mgdl",
  cholesterol: "mgdl",
  shareAnonymized: false,
  allowProtocolImprovement: true,
};

const STORAGE_KEY = "longevify.preferences";

const LANGUAGES: { value: LanguageCode; label: string; available: boolean }[] = [
  { value: "pt-BR", label: "Português (BR)", available: true },
  { value: "en-US", label: "English (US)", available: false },
  { value: "es-ES", label: "Español (ES)", available: false },
];

const THEMES: { value: Theme; label: string; available: boolean }[] = [
  { value: "claro", label: "Claro", available: true },
  { value: "escuro", label: "Escuro", available: false },
  { value: "auto", label: "Automático", available: false },
];

export default function PreferenciasPage() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Preferences>;
        setPrefs((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, []);

  function update<K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function handleLanguage(value: LanguageCode) {
    const opt = LANGUAGES.find((l) => l.value === value)!;
    if (!opt.available) {
      toast.info({
        title: "Em breve",
        description: `${opt.label} está em desenvolvimento.`,
      });
      return;
    }
    update("language", value);
  }

  function handleTheme(value: Theme) {
    const opt = THEMES.find((t) => t.value === value)!;
    if (!opt.available) {
      toast.info({
        title: "Em breve",
        description: `Tema ${opt.label.toLowerCase()} chega em breve.`,
      });
      return;
    }
    update("theme", value);
  }

  function downloadData() {
    toast.info({
      title: "Solicitação registrada",
      description: "Vamos preparar seu pacote de dados em até 7 dias úteis.",
    });
  }

  function deleteAccount() {
    const ok = window.confirm(
      "Tem certeza que quer excluir sua conta? Essa ação é definitiva.",
    );
    if (!ok) return;
    toast.success({
      title: "Solicitação enviada",
      description: "A equipe te contata em até 48h.",
    });
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-6 py-10">
      <header className="pb-8">
        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
          <Settings className="h-3.5 w-3.5" />
          Conta
        </span>
        <h1 className="mt-1 text-[40px] leading-[1.05] font-semibold tracking-tight">
          Preferências
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Idioma, tema, unidades e privacidade. Algumas opções ainda estão em
          desenvolvimento — vamos te avisar quando ficarem prontas.
        </p>
      </header>

      <div className="flex flex-col gap-5">
        <Section title="Idioma" description="Idioma da interface e dos relatórios." icon={Globe}>
          <label className="flex flex-col gap-1.5 text-[12px] sm:max-w-sm">
            <span className="text-muted">Idioma</span>
            <select
              value={prefs.language}
              onChange={(e) => handleLanguage(e.target.value as LanguageCode)}
              className="h-10 rounded-full border border-border bg-brand-50/30 px-4 text-[14px] text-ink outline-none transition-colors focus:border-brand-400 focus:bg-white"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                  {l.available ? "" : " — em breve"}
                </option>
              ))}
            </select>
          </label>
        </Section>

        <Section title="Tema" description="Aparência geral do app." icon={Palette}>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => {
              const active = prefs.theme === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTheme(t.value)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 h-9 text-[13px] font-medium transition-colors",
                    active
                      ? "border-brand-500 bg-brand-50 text-brand-800"
                      : "border-border bg-white text-ink hover:bg-brand-50/50",
                    !t.available && !active && "text-muted",
                  )}
                  aria-pressed={active}
                >
                  {t.label}
                  {!t.available ? (
                    <span className="rounded-full bg-brand-100 px-2 text-[10px] font-medium text-brand-700">
                      em breve
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Section>

        <Section
          title="Unidades"
          description="Como mostramos números nos seus painéis."
          icon={Ruler}
        >
          <RadioRow
            label="Sistema"
            value={prefs.units}
            onChange={(v) => update("units", v as UnitSystem)}
            options={[
              { value: "metric", label: "Métrico (kg, cm, °C)" },
              { value: "imperial", label: "Imperial (lb, in, °F)" },
            ]}
          />
          <RadioRow
            label="Glicemia"
            value={prefs.glucose}
            onChange={(v) => update("glucose", v as GlucoseUnit)}
            options={[
              { value: "mgdl", label: "mg/dL" },
              { value: "mmoll", label: "mmol/L" },
            ]}
          />
          <RadioRow
            label="Colesterol"
            value={prefs.cholesterol}
            onChange={(v) => update("cholesterol", v as CholesterolUnit)}
            options={[
              { value: "mgdl", label: "mg/dL" },
              { value: "mmoll", label: "mmol/L" },
            ]}
          />
        </Section>

        <Section
          title="Privacidade"
          description="Você manda nos seus dados. Sempre."
          icon={Lock}
        >
          <ToggleRow
            label="Compartilhar dados anonimizados pra pesquisa"
            description="Ajuda estudos científicos. Nada que te identifique."
            checked={prefs.shareAnonymized}
            onChange={(v) => update("shareAnonymized", v)}
          />
          <ToggleRow
            label="Permitir que a equipe Longevify use meus dados pra melhorar o protocolo"
            description="Ajusta recomendações. Não compartilhamos com terceiros."
            checked={prefs.allowProtocolImprovement}
            onChange={(v) => update("allowProtocolImprovement", v)}
          />

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="outline" onClick={downloadData}>
              <Download className="h-4 w-4" />
              Baixar todos meus dados
            </Button>
            <Button
              variant="ghost"
              onClick={deleteAccount}
              className="text-[#B6333A] hover:bg-[#FDECEC]"
            >
              <Trash2 className="h-4 w-4" />
              Excluir minha conta
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold leading-tight">{title}</h2>
          <p className="text-[12px] text-muted">{description}</p>
        </div>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </Card>
  );
}

function RadioRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12px] text-muted">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-full border px-4 h-9 text-[13px] font-medium transition-colors",
                active
                  ? "border-brand-500 bg-brand-50 text-brand-800"
                  : "border-border bg-white text-ink hover:bg-brand-50/50",
              )}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium leading-tight">{label}</div>
        <p className="mt-0.5 text-[12.5px] text-muted">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} ariaLabel={label} />
    </div>
  );
}
