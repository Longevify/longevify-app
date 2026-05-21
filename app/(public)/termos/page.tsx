import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de uso · Longevify",
  description:
    "Termos de uso da Longevify — plataforma de saúde preventiva e longevidade.",
};

export default function TermosPage() {
  return (
    <article className="mx-auto w-full max-w-[760px] px-6 py-12">
      <header className="pb-8">
        <span className="text-[13px] text-muted">Atualizado em 01 de fevereiro de 2026</span>
        <h1 className="mt-1 text-[40px] leading-[1.05] font-semibold tracking-tight">
          Termos de uso
        </h1>
        <p className="mt-3 text-[14px] text-muted">
          Estes termos regulam a relação entre você e a Longevify. Tentamos
          escrever em português direto. Quando algum termo legal ficar denso, o
          parágrafo seguinte traduz pra linguagem do dia a dia.
        </p>
      </header>

      <Section title="1. Quem é a Longevify">
        <p>
          A <strong>Longevify Saúde e Longevidade Ltda.</strong> ("Longevify",
          "nós") é uma sociedade limitada inscrita no CNPJ
          XX.XXX.XXX/0001-XX, com sede no Rio de Janeiro/RJ. Operamos a
          plataforma digital disponível em longevify.co e nos aplicativos
          móveis correspondentes ("Plataforma").
        </p>
        <p>
          Em linguagem simples: somos uma empresa brasileira que entrega um
          serviço digital de saúde preventiva.
        </p>
      </Section>

      <Section title="2. O que a Longevify faz (e o que não faz)">
        <p>
          A Longevify é uma plataforma de <strong>saúde preventiva e
          longevidade</strong>. Combinamos exames laboratoriais, dados de
          dispositivos vestíveis (wearables), questionários e protocolos
          clínicos pra te ajudar a entender e melhorar marcadores de saúde.
        </p>
        <p>
          A Longevify <strong>não substitui consulta médica nem atendimento
          de emergência</strong>. Recomendações geradas pela equipe ou pela IA
          do Concierge têm caráter informativo e educacional. Em qualquer
          situação aguda, procure o pronto-socorro mais próximo ou ligue 192
          (SAMU). Em crise de saúde mental, ligue 188 (CVV).
        </p>
      </Section>

      <Section title="3. Cadastro e elegibilidade">
        <p>
          Pra usar a Plataforma você precisa ter no mínimo 18 anos, fornecer
          informações verdadeiras no cadastro e manter seus dados atualizados.
          Você é responsável pela confidencialidade do seu acesso — se
          desconfiar de uso indevido, avise a gente em
          <a className="underline-offset-2 hover:underline" href="mailto:suporte@longevify.com.br">
            {" "}suporte@longevify.com.br
          </a>.
        </p>
      </Section>

      <Section title="4. Assinatura, pagamentos e cancelamento">
        <p>
          O acesso completo à Plataforma se dá por meio de assinatura
          recorrente. Os preços e o que cada plano inclui ficam descritos na
          página /planos no momento da contratação.
        </p>
        <ul>
          <li>
            <strong>Cobrança:</strong> a assinatura é cobrada antecipadamente
            no início de cada ciclo (mensal ou anual), via cartão de crédito ou
            outros meios disponíveis. A renovação é automática até que você
            cancele.
          </li>
          <li>
            <strong>Direito de arrependimento:</strong> nos primeiros 7 dias
            corridos depois da contratação você pode pedir reembolso integral,
            sem precisar justificar — basta escrever pra
            financeiro@longevify.com.br.
          </li>
          <li>
            <strong>Cancelamento:</strong> você pode cancelar a qualquer
            momento direto no app, em Perfil &gt; Plano e cobrança. O acesso
            permanece ativo até o fim do ciclo já pago e não há cobrança no
            ciclo seguinte.
          </li>
          <li>
            <strong>Reajustes:</strong> avisamos com pelo menos 30 dias de
            antecedência por e-mail antes de aplicar reajustes. Você pode
            cancelar antes do reajuste se não concordar.
          </li>
        </ul>
      </Section>

      <Section title="5. Coleta de exames e logística">
        <p>
          Quando seu plano inclui coleta domiciliar, ela é executada por
          laboratórios parceiros credenciados, em datas combinadas via app.
          Reagendar com até 24h de antecedência é gratuito. Não comparecimentos
          repetidos podem gerar custo adicional ou pausa do plano.
        </p>
      </Section>

      <Section title="6. Conteúdo, dados e propriedade intelectual">
        <p>
          Você mantém a propriedade dos seus dados de saúde — inclusive
          resultados de exames, registros de sintomas, hábitos e respostas a
          questionários. A Longevify recebe uma licença limitada pra
          processá-los exclusivamente com a finalidade de te entregar o
          serviço, conforme detalhado na nossa{" "}
          <a className="underline-offset-2 hover:underline" href="/privacidade">
            Política de privacidade
          </a>.
        </p>
        <p>
          Conteúdo educacional, protocolos, código, design e marca Longevify
          são de propriedade da Longevify ou de seus licenciantes. Você não pode
          reproduzir, distribuir ou criar produtos derivados sem autorização
          por escrito.
        </p>
      </Section>

      <Section title='7. Concierge IA "Dr. Lon" e seus limites'>
        <p>
          O Concierge &quot;Dr. Lon&quot; é um <strong>sistema de
          inteligência artificial</strong>. Apesar do apelido de tratamento
          &quot;Dr.&quot; — mantido por escolha de branding da Longevify — Lon{" "}
          <strong>NÃO é médico humano</strong>, não tem CRM, e{" "}
          <strong>não substitui consulta com profissional habilitado</strong>.
          Em cada sessão, Lon se identifica explicitamente como IA.
        </p>
        <p>
          Lon NÃO prescreve medicamentos, NÃO ajusta dose de tratamento em
          uso, NÃO emite diagnóstico definitivo. Suas respostas são
          educacionais e baseadas em diretrizes oficiais (SBC, SBD, SBEM,
          USPSTF, ESC, ADA, etc.) quando aplicável. Decisões clínicas
          relevantes — mudança de protocolo, ajuste de medicação,
          encaminhamento a especialista — devem ser tomadas com seu médico
          assistente, e quando indicado pela Longevify, com médico parceiro
          credenciado em teleorientação (CFM 2.314/2022).
        </p>
        <p>
          A IA pode errar. Em qualquer dúvida clínica relevante ou em
          sintomas agudos (dor torácica, sinais de AVC, falta de ar grave,
          sangramento, ideação suicida) procure atendimento médico imediato:{" "}
          <strong>SAMU 192</strong> / <strong>CVV 188</strong> /
          pronto-socorro mais próximo. Não espere uma resposta do Concierge
          para agir em urgências.
        </p>
      </Section>

      <Section title="8. Uso aceitável">
        <p>Você concorda em <strong>não</strong>:</p>
        <ul>
          <li>tentar acessar dados de outros usuários ou áreas restritas;</li>
          <li>usar a Plataforma pra fins ilegais ou pra prejudicar terceiros;</li>
          <li>fazer engenharia reversa, raspagem em massa ou copiar conteúdo;</li>
          <li>compartilhar seu acesso com terceiros sem autorização escrita.</li>
        </ul>
      </Section>

      <Section title="9. Limitação de responsabilidade">
        <p>
          A Longevify se responsabiliza pelos serviços contratados e pelo
          cuidado com seus dados, dentro dos limites do Código de Defesa do
          Consumidor e da legislação aplicável. Não nos responsabilizamos por
          decisões de saúde tomadas sem consulta com profissional habilitado,
          nem por interrupções pontuais decorrentes de eventos fora do nosso
          controle (ex.: falhas em provedores terceirizados ou caso fortuito).
        </p>
      </Section>

      <Section title="10. Suspensão e encerramento">
        <p>
          Podemos suspender ou encerrar contas em casos de inadimplência,
          violação destes termos ou suspeita fundada de fraude. Avisamos com
          antecedência sempre que possível e você pode exportar seus dados
          antes do encerramento (veja a página{" "}
          <a className="underline-offset-2 hover:underline" href="/lgpd">
            LGPD
          </a>).
        </p>
      </Section>

      <Section title="11. Alterações destes termos">
        <p>
          Podemos atualizar estes termos pra refletir mudanças de produto,
          legais ou regulatórias. Mudanças relevantes são comunicadas com pelo
          menos 30 dias de antecedência por e-mail e dentro do app. Continuar
          usando a Plataforma depois da entrada em vigor implica aceite.
        </p>
      </Section>

      <Section title="12. Foro e legislação aplicável">
        <p>
          Estes termos são regidos pelas leis brasileiras. Eventuais
          controvérsias serão resolvidas no foro da Comarca da Capital do
          Estado do Rio de Janeiro, ressalvada a faculdade do consumidor de
          ajuizar ação no foro do seu domicílio.
        </p>
      </Section>

      <Section title="13. Contato">
        <p>
          Suporte:{" "}
          <a className="underline-offset-2 hover:underline" href="mailto:suporte@longevify.com.br">
            suporte@longevify.com.br
          </a>
          <br />
          Encarregado pelo tratamento de dados (DPO):{" "}
          <a className="underline-offset-2 hover:underline" href="mailto:dpo@longevify.com.br">
            dpo@longevify.com.br
          </a>
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
      <div className="prose-longevify mt-3 flex flex-col gap-3 text-[14.5px] leading-relaxed text-ink/85 [&_a]:text-brand-700 [&_a:hover]:text-brand-800 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ul>li]:mt-1.5">
        {children}
      </div>
    </section>
  );
}
