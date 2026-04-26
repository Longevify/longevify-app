import type { Metadata } from "next";
import {
  ArrowUpRight,
  Download,
  FileEdit,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Direitos LGPD · Longevify",
  description:
    "Exerça seus direitos de titular de dados conforme a LGPD: acesso, correção, exclusão e portabilidade dos seus dados na Longevify.",
};

interface RightAction {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  cta: string;
  subject: string;
  body: string;
}

const ACTIONS: RightAction[] = [
  {
    icon: Download,
    title: "Solicitar meus dados",
    description:
      "Receba uma cópia completa dos dados que a Longevify guarda sobre você, em formato legível por máquina (JSON ou CSV).",
    cta: "Solicitar acesso aos meus dados",
    subject: "Solicitação LGPD - Acesso aos meus dados",
    body: `Olá, time Longevify.

Conforme o art. 18, II da LGPD, solicito o acesso completo aos meus dados pessoais e de saúde tratados pela Longevify, incluindo:

- dados de cadastro e perfil clínico
- resultados de exames laboratoriais
- entradas de sintomas, hábitos e questionários
- dados recebidos de wearables integrados
- histórico de interação com o Concierge IA

Por favor, me enviem em formato estruturado (JSON ou CSV) no prazo de 15 dias.

Meu nome completo:
CPF:
E-mail cadastrado:`,
  },
  {
    icon: FileEdit,
    title: "Corrigir meus dados",
    description:
      "Pra dados incompletos, inexatos ou desatualizados que você não consegue corrigir direto no app.",
    cta: "Pedir correção",
    subject: "Solicitação LGPD - Correção de dados",
    body: `Olá, time Longevify.

Conforme o art. 18, III da LGPD, solicito a correção dos seguintes dados:

Dado a corrigir:
Valor atual:
Valor correto:

Justificativa (opcional):

Meu nome completo:
CPF:
E-mail cadastrado:`,
  },
  {
    icon: Trash2,
    title: "Excluir meus dados",
    description:
      "Encerre sua conta e elimine os dados pessoais que não precisamos manter por obrigação legal (laudos clínicos seguem retenção CFM).",
    cta: "Pedir exclusão",
    subject: "Solicitação LGPD - Exclusão de dados / encerramento",
    body: `Olá, time Longevify.

Conforme o art. 18, VI da LGPD, solicito a eliminação dos meus dados pessoais e o encerramento da minha conta na Longevify.

Estou ciente de que dados clínicos podem ser retidos pelo prazo legal (Resolução CFM 1.821/2007) e que dados fiscais seguem prazo de 5 anos.

Meu nome completo:
CPF:
E-mail cadastrado:

Motivo (opcional, ajuda a gente a melhorar):`,
  },
  {
    icon: ArrowUpRight,
    title: "Portar meus dados",
    description:
      "Exporte seus dados em formato interoperável pra levar pra outro serviço de saúde digital.",
    cta: "Solicitar portabilidade",
    subject: "Solicitação LGPD - Portabilidade",
    body: `Olá, time Longevify.

Conforme o art. 18, V da LGPD, solicito a portabilidade dos meus dados.

Destino (nome da empresa / e-mail / API):
Tipo de dados desejados (todos / clínicos / wearables / outro):

Meu nome completo:
CPF:
E-mail cadastrado:`,
  },
];

function buildMailto(action: RightAction): string {
  const params = new URLSearchParams({
    subject: action.subject,
    body: action.body,
  });
  return `mailto:dpo@longevify.com.br?${params.toString()}`;
}

export default function LgpdPage() {
  return (
    <article className="mx-auto w-full max-w-[900px] px-6 py-12">
      <header className="pb-10">
        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
          <ShieldCheck className="h-3.5 w-3.5" />
          LGPD · Direitos do titular
        </span>
        <h1 className="mt-1 text-[40px] leading-[1.05] font-semibold tracking-tight">
          Seus direitos sobre seus dados
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] text-muted">
          Os botões abaixo abrem um e-mail pré-preenchido pro nosso
          encarregado pelo tratamento de dados (DPO). Respondemos toda
          solicitação em até 15 dias, conforme art. 19 da LGPD. Se preferir,
          escreva direto pra{" "}
          <a className="underline-offset-2 hover:underline" href="mailto:dpo@longevify.com.br">
            dpo@longevify.com.br
          </a>
          .
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ACTIONS.map((a) => (
          <a
            key={a.title}
            href={buildMailto(a)}
            className="block focus-visible:outline-none"
          >
            <Card className="group flex h-full flex-col gap-3 p-6 transition-shadow hover:shadow-[0_8px_24px_rgba(13,40,24,.08)] focus-within:ring-2 focus-within:ring-brand-400">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700">
                <a.icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-[16px] font-semibold leading-tight">
                  {a.title}
                </h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  {a.description}
                </p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 group-hover:text-brand-800">
                {a.cta}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </Card>
          </a>
        ))}
      </section>

      <section className="mt-10 border-t border-border pt-8">
        <h2 className="text-[18px] font-semibold tracking-tight">
          Encarregado pelo tratamento de dados (DPO)
        </h2>
        <p className="mt-2 text-[14px] text-muted">
          Lucas Valle — Longevify Saúde e Longevidade Ltda.
          <br />
          E-mail:{" "}
          <a className="text-brand-700 underline-offset-2 hover:underline" href="mailto:dpo@longevify.com.br">
            dpo@longevify.com.br
          </a>
          <br />
          Você também pode reclamar à ANPD (Autoridade Nacional de Proteção de
          Dados) em gov.br/anpd.
        </p>
      </section>

      <section className="mt-10 rounded-[20px] border border-border bg-brand-50/40 p-6">
        <h3 className="text-[15px] font-semibold leading-tight">
          O que esperar quando você pedir
        </h3>
        <ol className="mt-3 flex flex-col gap-2 text-[13.5px] text-ink/85">
          <li>
            <strong>1. Confirmação em até 48h</strong> — abrimos um chamado
            interno e você recebe número de protocolo.
          </li>
          <li>
            <strong>2. Verificação de identidade</strong> — pedimos
            confirmação simples (frequentemente já temos no cadastro).
          </li>
          <li>
            <strong>3. Resposta em até 15 dias</strong> — entregamos os dados,
            confirmamos a alteração ou explicamos por que parte do pedido não
            pode ser atendida (ex.: retenção legal de laudos).
          </li>
        </ol>
      </section>
    </article>
  );
}
