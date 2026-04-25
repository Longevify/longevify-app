import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidade · Longevify",
  description:
    "Como a Longevify coleta, usa, armazena e protege seus dados pessoais e de saúde — em conformidade com a LGPD.",
};

export default function PrivacidadePage() {
  return (
    <article className="mx-auto w-full max-w-[760px] px-6 py-12">
      <header className="pb-8">
        <span className="text-[13px] text-muted">Atualizado em 01 de fevereiro de 2026</span>
        <h1 className="mt-1 text-[40px] leading-[1.05] font-semibold tracking-tight">
          Política de privacidade
        </h1>
        <p className="mt-3 text-[14px] text-muted">
          Saúde é um dado sensível e a gente trata com esse respeito. Esta
          política explica, em português direto, o que coletamos, por que,
          quem acessa, por quanto tempo guardamos e quais são os seus direitos.
        </p>
      </header>

      <Section title="Resumo de uma página">
        <ul>
          <li>
            <strong>Não vendemos seus dados.</strong> Nem pra anunciante,
            seguradora ou laboratório.
          </li>
          <li>
            <strong>Tudo é processado no Brasil</strong>, em provedores com
            certificação ISO 27001 e contratos de tratamento alinhados à LGPD.
          </li>
          <li>
            Seus dados de saúde são <strong>criptografados em trânsito</strong>{" "}
            (TLS 1.3) e <strong>em repouso</strong> (AES-256).
          </li>
          <li>
            Você tem total controle: pode acessar, corrigir, exportar e
            apagar seus dados a qualquer momento na página{" "}
            <a className="underline-offset-2 hover:underline" href="/lgpd">
              LGPD
            </a>
            .
          </li>
        </ul>
      </Section>

      <Section title="1. Quem é o controlador">
        <p>
          A Longevify Saúde e Longevidade Ltda. (CNPJ XX.XXX.XXX/0001-XX) é
          a controladora dos seus dados pessoais nos termos da Lei
          13.709/2018 (LGPD). Nosso encarregado (DPO) é Lucas Valle —
          contato:{" "}
          <a className="underline-offset-2 hover:underline" href="mailto:dpo@longevify.com.br">
            dpo@longevify.com.br
          </a>
          .
        </p>
      </Section>

      <Section title="2. Quais dados coletamos">
        <h3 className="mt-1 text-[15px] font-semibold">Dados que você nos dá</h3>
        <ul>
          <li>
            <strong>Cadastro:</strong> nome, e-mail, telefone, CPF, data de
            nascimento, endereço.
          </li>
          <li>
            <strong>Perfil clínico:</strong> altura, peso, tipo sanguíneo,
            condições conhecidas, medicações, alergias, metas pessoais.
          </li>
          <li>
            <strong>Sintomas, hábitos e questionários:</strong> entradas
            diárias, respostas a escalas validadas (PHQ-9, GAD-7, PSQI,
            PSS-10), notas livres.
          </li>
          <li>
            <strong>Pagamento:</strong> processado por gateway externo (não
            armazenamos número completo de cartão).
          </li>
        </ul>

        <h3 className="mt-4 text-[15px] font-semibold">Dados que recebemos de terceiros</h3>
        <ul>
          <li>
            <strong>Resultados laboratoriais</strong> dos parceiros de coleta,
            via integração ou laudo enviado por você.
          </li>
          <li>
            <strong>Wearables</strong> (Apple Health, Oura, Garmin, etc.):
            sono, frequência cardíaca, VO2max, atividade — só quando você
            autoriza a integração.
          </li>
        </ul>

        <h3 className="mt-4 text-[15px] font-semibold">Dados coletados automaticamente</h3>
        <ul>
          <li>
            Logs técnicos (IP, dispositivo, navegador, horário) usados pra
            segurança e diagnóstico de erros.
          </li>
          <li>
            Cookies estritamente necessários pra autenticação. Não usamos
            cookies de tracking publicitário.
          </li>
        </ul>
      </Section>

      <Section title="3. Por que coletamos (base legal)">
        <p>
          A LGPD exige uma base legal pra cada uso. As nossas:
        </p>
        <ul>
          <li>
            <strong>Execução de contrato</strong> (art. 7º, V): pra entregar a
            assinatura, agendar coleta, processar exames e mostrar dados no app.
          </li>
          <li>
            <strong>Consentimento</strong> (art. 11, I): pra processar dados
            de saúde — coletado no momento da contratação e revogável a
            qualquer tempo na página LGPD.
          </li>
          <li>
            <strong>Cumprimento de obrigação legal/regulatória</strong> (art.
            7º, II): pra reter laudos médicos pelo prazo exigido por
            normativas do CFM e da ANVISA.
          </li>
          <li>
            <strong>Legítimo interesse</strong> (art. 7º, IX): pra prevenção
            de fraude, segurança da informação e melhoria do serviço (sempre
            sem dados sensíveis).
          </li>
        </ul>
      </Section>

      <Section title="4. Com quem compartilhamos">
        <p>Apenas com quem é estritamente necessário pra entregar o serviço:</p>
        <ul>
          <li>
            <strong>Laboratórios parceiros</strong> credenciados — recebem
            apenas os dados necessários pra coleta e identificação.
          </li>
          <li>
            <strong>Provedores de infraestrutura</strong> (cloud, e-mail,
            atendimento) — sob contratos de tratamento de dados que replicam
            nossas obrigações de LGPD.
          </li>
          <li>
            <strong>Provedor de IA (Anthropic)</strong> — quando você usa o
            Concierge IA, contexto mínimo necessário é enviado via API. A
            Anthropic não treina modelos com seus dados conforme acordo
            comercial.
          </li>
          <li>
            <strong>Autoridades</strong> — apenas mediante ordem judicial ou
            requisição legal válida.
          </li>
        </ul>
        <p>
          <strong>Nunca compartilhamos com:</strong> seguradoras, planos de
          saúde, anunciantes ou empregadores.
        </p>
      </Section>

      <Section title="5. Onde os dados ficam">
        <p>
          Hospedados em datacenters no Brasil (região São Paulo) de provedores
          com certificação ISO 27001 e SOC 2. Backups criptografados rodam
          diariamente, com retenção de 30 dias.
        </p>
      </Section>

      <Section title="6. Por quanto tempo">
        <ul>
          <li>
            <strong>Dados clínicos e laudos:</strong> 20 anos após a última
            consulta, conforme Resolução CFM 1.821/2007.
          </li>
          <li>
            <strong>Dados de cadastro e contrato:</strong> enquanto sua conta
            estiver ativa, mais 5 anos depois do encerramento, pra fins fiscais
            e de auditoria.
          </li>
          <li>
            <strong>Logs de segurança:</strong> 12 meses, conforme art. 15 do
            Marco Civil da Internet.
          </li>
          <li>
            <strong>Após o encerramento</strong> e cumpridos os prazos
            legais, os dados são anonimizados ou destruídos.
          </li>
        </ul>
      </Section>

      <Section title="7. Seus direitos (LGPD)">
        <p>
          Você pode, a qualquer momento, exercer os direitos previstos no
          art. 18 da LGPD:
        </p>
        <ul>
          <li>confirmação da existência de tratamento;</li>
          <li>acesso aos seus dados;</li>
          <li>correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>portabilidade pra outro fornecedor de serviço;</li>
          <li>eliminação dos dados tratados com seu consentimento;</li>
          <li>informação sobre compartilhamento;</li>
          <li>revogação do consentimento.</li>
        </ul>
        <p>
          Pra exercer qualquer um deles, vá em{" "}
          <a className="underline-offset-2 hover:underline" href="/lgpd">
            /lgpd
          </a>{" "}
          ou escreva pra dpo@longevify.com.br. Respondemos em até 15 dias.
        </p>
      </Section>

      <Section title="8. Segurança">
        <ul>
          <li>Criptografia TLS 1.3 em trânsito e AES-256 em repouso.</li>
          <li>
            Acesso por funcionários é limitado a quem precisa pra te atender,
            com auditoria de log.
          </li>
          <li>
            Autenticação em dois fatores disponível em Perfil &gt; Preferências.
          </li>
          <li>
            Em caso de incidente de segurança que possa te afetar, comunicamos
            você e a ANPD em prazo razoável, conforme art. 48 da LGPD.
          </li>
        </ul>
      </Section>

      <Section title="9. Crianças e adolescentes">
        <p>
          A Longevify é destinada a maiores de 18 anos. Não coletamos
          conscientemente dados de menores. Se identificar uso por menor, nos
          escreva e vamos remover.
        </p>
      </Section>

      <Section title="10. Mudanças nesta política">
        <p>
          Atualizações relevantes são comunicadas no app e por e-mail com pelo
          menos 30 dias de antecedência. A versão sempre vigente fica
          disponível nessa página.
        </p>
      </Section>

      <Section title="11. Contato">
        <p>
          Encarregado (DPO): Lucas Valle —{" "}
          <a className="underline-offset-2 hover:underline" href="mailto:dpo@longevify.com.br">
            dpo@longevify.com.br
          </a>
          <br />
          Reclamações também podem ser direcionadas à Autoridade Nacional de
          Proteção de Dados (ANPD): gov.br/anpd.
        </p>
      </Section>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-7 first:border-t-0">
      <h2 className="text-[18px] font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-[14.5px] leading-relaxed text-ink/85 [&_a]:text-brand-700 [&_a:hover]:text-brand-800 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ul>li]:mt-1.5">
        {children}
      </div>
    </section>
  );
}
