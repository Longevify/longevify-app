import Link from "next/link";
import { ChevronDown, LifeBuoy, Mail, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

const WHATSAPP_URL =
  "https://wa.me/5521999999999?text=Oi%2C%20preciso%20de%20ajuda%20com%20a%20Longevify";

interface FaqItem {
  q: string;
  a: string;
}

const FAQ: FaqItem[] = [
  {
    q: "Como funciona a assinatura?",
    a: "A assinatura Longevify é cobrada uma vez por ano e inclui dois painéis completos de exames de longevidade, acesso ao Concierge IA, protocolo personalizado e descontos na Loja. Você pode cancelar a renovação a qualquer momento na sua área de plano e cobrança.",
  },
  {
    q: "Quanto tempo demora pra sair o resultado dos exames?",
    a: "Após a coleta, o laboratório libera os exames em até 7 dias úteis. A equipe Longevify revisa cada laudo, escreve o seu protocolo e publica no app — esse processo leva até mais 48h depois que recebemos o exame.",
  },
  {
    q: "Posso compartilhar meus resultados com meu médico?",
    a: "Pode e a gente incentiva. Você consegue baixar um PDF consolidado a qualquer momento na seção Dados, e dá pra exportar todos os dados pelo menu Preferências > Privacidade.",
  },
  {
    q: "Como cancelo minha assinatura?",
    a: "É só ir em Plano & cobrança no menu do perfil e clicar em \"Cancelar renovação\". Você mantém acesso até o fim do período já pago. Se preferir falar com alguém, manda mensagem no chat ou no WhatsApp.",
  },
  {
    q: "Vocês são uma clínica? Substituem o meu médico?",
    a: "Não. A Longevify é uma plataforma de saúde preventiva e longevidade. As recomendações são feitas pela nossa equipe médica e nutricional, mas não substituem seu médico assistente — sempre comente as mudanças com ele.",
  },
  {
    q: "Como vocês tratam meus dados? (LGPD)",
    a: "Estamos conformes com a LGPD. Seus dados são processados no Brasil, nunca são vendidos e só são usados pra entregar o serviço e melhorar o protocolo. Veja a política completa no link no final desta página.",
  },
  {
    q: "Meus dados de saúde estão seguros?",
    a: "Tudo é criptografado em trânsito (TLS 1.3) e em repouso (AES-256). O acesso é limitado a profissionais autorizados, com auditoria de log. Você pode ativar autenticação em dois fatores nas Preferências.",
  },
  {
    q: "Posso pausar a assinatura?",
    a: "Hoje não temos pausa, mas você pode escolher remarcar a próxima coleta para até 90 dias depois da data prevista — sem custo. Fala com a equipe que a gente acerta.",
  },
  {
    q: "O Concierge IA é uma pessoa real ou um robô?",
    a: "É um misto. Perguntas rápidas são respondidas pela IA (Claude) treinada com seus dados. Casos clínicos e mudanças de protocolo passam sempre por revisão humana antes de ir pra você.",
  },
  {
    q: "Como peço reembolso?",
    a: "Você tem 7 dias depois da contratação para pedir reembolso integral, sem perguntas. Depois disso, avaliamos caso a caso. Manda email pra suporte@longevify.com.br com o assunto \"Reembolso\".",
  },
];

export default function SuportePage() {
  return (
    <div className="mx-auto w-full max-w-[1000px] px-6 py-10">
      <header className="pb-10">
        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
          <LifeBuoy className="h-3.5 w-3.5" />
          Conta
        </span>
        <h1 className="mt-1 text-[40px] leading-[1.05] font-semibold tracking-tight">
          Estamos aqui pra ajudar
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Resposta média da equipe: 2h em horário comercial. Fora disso, a gente
          retorna na primeira hora útil.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 pb-10 sm:grid-cols-3">
        <ChannelCard
          href="/concierge"
          icon={LifeBuoy}
          title="Chat com equipe"
          description="Resposta rápida no Concierge."
          cta="Abrir chat"
        />
        <ChannelCard
          href={WHATSAPP_URL}
          external
          icon={MessageCircle}
          title="WhatsApp"
          description="Pra quando você está fora do app."
          cta="Abrir WhatsApp"
        />
        <ChannelCard
          href="mailto:suporte@longevify.com.br"
          external
          icon={Mail}
          title="E-mail"
          description="Suporte técnico e financeiro."
          cta="Mandar e-mail"
        />
      </section>

      <section>
        <h2 className="text-[20px] font-semibold tracking-tight">
          Perguntas frequentes
        </h2>
        <p className="mt-1 text-[13px] text-muted">
          Respostas rápidas pras dúvidas mais comuns.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-[16px] border border-border bg-surface px-5 py-4 open:bg-brand-50/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-medium text-ink">
                <span>{item.q}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <footer className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-6 text-[12.5px] text-muted">
        <Link
          href="/termos"
          className="underline-offset-2 hover:text-ink hover:underline"
        >
          Termos de uso
        </Link>
        <Link
          href="/privacidade"
          className="underline-offset-2 hover:text-ink hover:underline"
        >
          Política de privacidade
        </Link>
        <span className="text-muted/70">
          Longevify · CNPJ 00.000.000/0001-00
        </span>
      </footer>
    </div>
  );
}

function ChannelCard({
  href,
  external,
  icon: Icon,
  title,
  description,
  cta,
}: {
  href: string;
  external?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  cta: string;
}) {
  const content = (
    <Card className="group flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-[0_8px_24px_rgba(13,40,24,.08)]">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-[15px] font-semibold leading-tight">{title}</div>
        <p className="mt-1 text-[12.5px] text-muted">{description}</p>
      </div>
      <span className="mt-auto inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 group-hover:text-brand-800">
        {cta}
      </span>
    </Card>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}
