"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AtSign,
  Briefcase,
  Calendar,
  CreditCard,
  Globe,
  MapPin,
  Phone,
  Ruler,
  Scale,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatDatePtBR } from "@/lib/utils";
import { PATIENT } from "@/lib/mock-data";
import { formatBRL } from "@/lib/products";
import { useCurrentUser } from "@/lib/auth/user-context";
import { MedicalExtractor } from "@/components/openmed/medical-extractor";
import { PLANS } from "@/lib/billing/plans";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** Idade cronológica (anos). Substitui birthDate — armazenada direto no profile do Supabase. */
  chronologicalAge: number;
  cpf: string;
  height: number; // cm
  weight: number; // kg
  bloodType: string;
  city: string;
  uf: string;
  occupation: string;
  goals: string;
  conditions: string;
  medications: string;
  allergies: string;
  language: string;
}

/**
 * Default vazios pra novo usuário. Os campos preenchidos vão sair do
 * usuário autenticado quando disponíveis. Mantemos placeholders úteis
 * pra demos / users sem perfil completo ainda.
 */
const INITIAL: ProfileData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  chronologicalAge: 0,
  cpf: "",
  height: 0,
  weight: 0,
  bloodType: "",
  city: "",
  uf: "",
  occupation: "",
  goals: "",
  conditions: "",
  medications: "",
  allergies: "",
  language: "Português (BR)",
};

export default function PerfilPage() {
  // Hidrata com dados do usuário autenticado (Supabase) na primeira render.
  // Em modo demo (sem login), usa o paciente mock como fallback didático.
  const ctxUser = useCurrentUser();
  const [data, setData] = useState<ProfileData>(() => ({
    ...INITIAL,
    firstName: ctxUser.firstName || (ctxUser.isDemo ? PATIENT.firstName : ""),
    lastName: ctxUser.lastName || (ctxUser.isDemo ? PATIENT.lastName : ""),
    email: ctxUser.email || (ctxUser.isDemo ? "joao.silva@longevify.co" : ""),
    chronologicalAge:
      ctxUser.chronologicalAge ?? (ctxUser.isDemo ? PATIENT.chronologicalAge : 0),
  }));
  const [saved, setSaved] = useState<null | "ok">(null);

  function update<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    setSaved(null);
  }

  function save() {
    // Persistência real virá com Supabase (Wave 3).
    setSaved("ok");
    window.setTimeout(() => setSaved(null), 2200);
  }

  const fullName = `${data.firstName} ${data.lastName}`;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-10">
      <header className="pb-8">
        <span className="text-[13px] text-muted">Conta</span>
        <h1 className="text-[40px] leading-[1.05] font-semibold tracking-tight">
          Meu perfil
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Mantenha seus dados atualizados — eles alimentam diretamente as
          recomendações do Concierge IA, do protocolo e da Loja.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Sidebar — identidade */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="flex flex-col items-center gap-3 p-6 text-center">
            <Avatar name={fullName} className="h-20 w-20 text-[26px]" />
            <div>
              <div className="text-[18px] font-semibold leading-tight">
                {fullName}
              </div>
              <div className="mt-0.5 text-[13px] text-muted">{data.email}</div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 h-6 text-[11px] font-medium text-brand-700">
              <ShieldCheck className="h-3 w-3" />
              Plano Anual ativo
            </span>
            <Button variant="outline" size="sm" className="mt-2">
              Trocar foto
            </Button>
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <h3 className="text-[13px] uppercase tracking-[0.14em] text-muted">
              Saúde recente
            </h3>
            {ctxUser.isDemo ? (
              <>
                <Row label="Longevify Score" value={`${PATIENT.longevifyScore}`} />
                <Row
                  label="Idade biológica"
                  value={`${PATIENT.biologicalAge} (${PATIENT.chronologicalAge} cron.)`}
                />
                <Row
                  label="Último exame"
                  value={formatDatePtBR(PATIENT.latestExamDate)}
                />
              </>
            ) : (
              <>
                <Row
                  label="Idade cronológica"
                  value={
                    data.chronologicalAge ? `${data.chronologicalAge} anos` : "—"
                  }
                />
                <Row
                  label="Idade biológica"
                  value="Em breve (após 1º exame)"
                />
                <Row
                  label="Último exame"
                  value="Sem exames ainda"
                />
              </>
            )}
          </Card>
        </aside>

        {/* Forms */}
        <section className="flex flex-col gap-6">
          <Section
            title="Dados pessoais"
            icon={UserIcon}
            description="Como o time Longevify e os documentos vão te chamar."
          >
            <Field label="Nome">
              <Input
                value={data.firstName}
                onChange={(v) => update("firstName", v)}
              />
            </Field>
            <Field label="Sobrenome">
              <Input
                value={data.lastName}
                onChange={(v) => update("lastName", v)}
              />
            </Field>
            <Field label="E-mail" icon={AtSign}>
              <Input
                value={data.email}
                onChange={(v) => update("email", v)}
                type="email"
              />
            </Field>
            <Field label="Telefone" icon={Phone}>
              <Input value={data.phone} onChange={(v) => update("phone", v)} />
            </Field>
            <Field label="Idade cronológica" icon={Calendar}>
              <Input
                value={data.chronologicalAge ? String(data.chronologicalAge) : ""}
                onChange={(v) => update("chronologicalAge", Number(v) || 0)}
                type="number"
              />
            </Field>
            <Field label="CPF">
              <Input value={data.cpf} onChange={(v) => update("cpf", v)} />
            </Field>
          </Section>

          <Section
            title="Localização & idioma"
            icon={MapPin}
            description="Usado pra concierge, suporte e formato dos exames."
          >
            <Field label="Cidade">
              <Input value={data.city} onChange={(v) => update("city", v)} />
            </Field>
            <Field label="Estado">
              <Input value={data.uf} onChange={(v) => update("uf", v)} />
            </Field>
            <Field label="Profissão" icon={Briefcase}>
              <Input
                value={data.occupation}
                onChange={(v) => update("occupation", v)}
              />
            </Field>
            <Field label="Idioma" icon={Globe}>
              <Input
                value={data.language}
                onChange={(v) => update("language", v)}
              />
            </Field>
          </Section>

          <Section
            title="Dados clínicos"
            icon={Ruler}
            description="Antropometria e info que orientam protocolo e dosagens."
          >
            <Field label="Altura (cm)">
              <Input
                value={String(data.height)}
                onChange={(v) => update("height", Number(v) || 0)}
                type="number"
              />
            </Field>
            <Field label="Peso (kg)" icon={Scale}>
              <Input
                value={String(data.weight)}
                onChange={(v) => update("weight", Number(v) || 0)}
                type="number"
              />
            </Field>
            <Field label="Tipo sanguíneo">
              <Input
                value={data.bloodType}
                onChange={(v) => update("bloodType", v)}
              />
            </Field>
          </Section>

          <SubscriptionSection />

          <Section
            title="Histórico"
            icon={ShieldCheck}
            description="Compartilhar isso ajuda o Concierge IA a personalizar respostas."
          >
            <Field label="Metas pessoais" full>
              <Textarea
                value={data.goals}
                onChange={(v) => update("goals", v)}
              />
            </Field>
            <Field label="Condições conhecidas" full>
              <Textarea
                value={data.conditions}
                onChange={(v) => update("conditions", v)}
              />
            </Field>
            <Field label="Medicações" full>
              <Textarea
                value={data.medications}
                onChange={(v) => update("medications", v)}
              />
            </Field>
            <Field label="Alergias" full>
              <Textarea
                value={data.allergies}
                onChange={(v) => update("allergies", v)}
              />
            </Field>
          </Section>

          <Section
            title="Análise inteligente do histórico"
            icon={ShieldCheck}
            description="Cole um texto livre — sintomas, lista de remédios, anotações antigas — e a gente extrai doenças, medicações e dados pessoais automaticamente. Modelos clínicos open-source (OpenMed) rodando via HuggingFace."
          >
            <div className="md:col-span-2">
              <MedicalExtractor
                placeholder="Ex: 'Tomo losartana 50mg pela manhã pra hipertensão e atorvastatina 20mg à noite. Tenho diabetes tipo 2. Alergia a dipirona. Mãe teve infarto aos 60 anos.'"
              />
            </div>
          </Section>

          {/* Save bar */}
          <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-white/95 px-5 py-3 shadow-[0_12px_32px_-16px_rgba(13,40,24,.18)] backdrop-blur">
            <div className="text-[13px] text-muted">
              {saved === "ok"
                ? "✓ Alterações salvas localmente"
                : "Os dados ficam no seu perfil — Concierge usa pra contextualizar respostas."}
            </div>
            <Button onClick={save} variant="primary">
              Salvar alterações
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13px]">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

function Field({
  label,
  full,
  icon: Icon,
  children,
}: {
  label: string;
  full?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex flex-col gap-1.5 text-[12px]",
        full ? "sm:col-span-2" : "",
      )}
    >
      <span className="inline-flex items-center gap-1.5 text-muted">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-full border border-border bg-brand-50/30 px-4 text-[14px] text-ink outline-none transition-colors focus:border-brand-400 focus:bg-white"
    />
  );
}

function Textarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="rounded-2xl border border-border bg-brand-50/30 px-4 py-3 text-[14px] text-ink outline-none transition-colors focus:border-brand-400 focus:bg-white resize-y"
    />
  );
}

function SubscriptionSection() {
  function handleUpdatePayment() {
    window.alert("Atualização de método de pagamento será habilitada quando o portal de billing da Stripe estiver conectado.");
  }
  function handleCancel() {
    const ok = window.confirm(
      "Tem certeza que quer cancelar sua assinatura? Você perde acesso após o fim do ciclo atual.",
    );
    if (ok) {
      window.alert("Cancelamento agendado para o fim do ciclo (mock).");
    }
  }

  // Default = primeiro plano com highlight (Premium hoje); fallback pro primeiro plano.
  const currentPlan = PLANS.find((p) => p.highlight) ?? PLANS[0];

  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
          <CreditCard className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold leading-tight">Assinatura</h2>
          <p className="text-[12px] text-muted">
            Gerencie seu plano, pagamento e próxima cobrança.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SubRow
          label="Plano atual"
          value={`Plano ${currentPlan.name} Anual`}
          highlight
        />
        <SubRow label="Renovação" value="12 de mar de 2027" />
        <SubRow label="Forma de pagamento" value="Cartão Visa final 4242" />
        <SubRow
          label="Próxima cobrança"
          value={`${formatBRL(currentPlan.priceBRL)} / ano`}
        />
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Link href="/planos">
          <Button variant="primary" size="sm">
            Trocar plano
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={handleUpdatePayment}>
          Atualizar pagamento
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="text-[#B6333A] hover:bg-[#FDECEC]"
        >
          Cancelar assinatura
        </Button>
      </div>
    </Card>
  );
}

function SubRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[14px] border border-border bg-brand-50/20 px-4 py-3">
      <span className="text-[11px] uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <span
        className={cn(
          "text-[14px] font-semibold leading-tight",
          highlight ? "text-brand-800" : "text-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}
