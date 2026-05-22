import Link from "next/link";
import {
  ArrowLeft,
  Dumbbell,
  Footprints,
  Activity,
  Sparkles,
  Trophy,
  Heart,
  BatteryCharging,
  Calendar,
  Scale,
  Download,
  Library,
  Timer,
  Calculator,
} from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Phase 3M — Guia do user explicando todas as features da aba Fitness.
 *
 * Página estática que documenta:
 *  - Dashboard /fitness (streak, heatmap, stats, recovery, vo2max)
 *  - Musculação (catalog, log, programa IA, templates, hoje)
 *  - Corrida (GPS, pace, mapa, share)
 *  - Outros (10 atividades)
 *  - Medidas (composição)
 *  - Conquistas (XP, levels)
 *  - Records
 *  - Insights IA
 *  - Export CSV
 *
 * Útil pra primeiro user entender o que cada parte faz.
 */
export default function GuiaPage() {
  return (
    <div className="pb-12">
      <Link
        href="/fitness"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-500 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </Link>

      <header className="mb-6">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-800">
          📘 Guia
        </div>
        <h1 className="mt-1 text-[26px] font-semibold leading-tight text-zinc-900">
          Como usar a aba Fitness
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">
          Tudo que dá pra fazer aqui — desde logar set até deixar Dr. Lon
          analisar sua semana com IA.
        </p>
      </header>

      <section className="mb-6 space-y-4">
        <Section icon={<Sparkles className="h-5 w-5" />} title="Visão geral (esta aba)">
          <p>
            Página inicial do Fitness — agrega TUDO num só lugar:
          </p>
          <ul>
            <li>
              <strong>Streak counter</strong> — quantos dias seguidos você tá
              treinando (qualquer modalidade conta)
            </li>
            <li>
              <strong>Recovery + VO₂max cards</strong> — recovery score baseado
              em ACWR (acute:chronic workload ratio) + VO₂max estimado de
              corridas
            </li>
            <li>
              <strong>Dr. Lon insights</strong> — análise semanal IA tom direto,
              insights actionable (positivos, neutros e warnings)
            </li>
            <li>
              <strong>Heatmap 90 dias</strong> — estilo GitHub. Click num dia
              treinado abre detail da sessão
            </li>
            <li>
              <strong>Stats semana/mês/ano</strong> — workouts + volume + km +
              min
            </li>
            <li>
              <strong>Distribuição</strong> — barra mostrando proporção
              musculação/corrida/outros
            </li>
            <li>
              <strong>Programa ativo</strong> — link pro detalhe se você gerou
              um
            </li>
            <li>
              <strong>Top 5 PRs</strong> recentes
            </li>
            <li>
              <strong>Level + XP</strong> com conquistas desbloqueadas
            </li>
          </ul>
        </Section>

        <Section icon={<Dumbbell className="h-5 w-5" />} title="Musculação" href="/fitness/musculacao">
          <p>
            Tudo de musculação numa aba só.
          </p>
          <ul>
            <li>
              <strong>Catálogo</strong> com 28 exercícios + 20 com vídeos de
              execução (YouTube embed)
            </li>
            <li>
              <strong>Log de set</strong> — peso, reps, RPE (6-10)
            </li>
            <li>
              <strong>Rest timer automático</strong> após cada set, com beep e
              vibração ao terminar. Configurable 30-180s.
            </li>
            <li>
              <strong>Plate calculator</strong> — pra exercícios com barra,
              mostra anilhas IWF coloridas pra atingir o peso
            </li>
            <li>
              <strong>Dashboard por exercício</strong> — click num exercício
              abre popup com PR (top set), histórico, chart de carga máxima
            </li>
            <li>
              <strong>🥇 Músculo que mais evoluiu</strong> — card top mostrando
              qual grupo cresceu mais na semana vs anterior
            </li>
            <li>
              <strong>Resumo semanal</strong> — volume + sets + dias ativos dos
              últimos 7 dias
            </li>
          </ul>
        </Section>

        <Section
          icon={<Sparkles className="h-5 w-5" />}
          title="Gerador de treino com IA"
          href="/fitness/musculacao/programa"
        >
          <p>
            5 perguntas (objetivo, frequência, equipamento, nível, restrições)
            e Claude Sonnet 4.6 monta um split personalizado.
          </p>
          <ul>
            <li>Filtra alucinações (só usa exercícios do catálogo)</li>
            <li>Considera lesões/restrições que você informar</li>
            <li>Preview antes de salvar — pode regenerar quantas vezes quiser</li>
            <li>1 programa ativo por vez, antigos viram histórico</li>
          </ul>
        </Section>

        <Section
          icon={<Library className="h-5 w-5" />}
          title="Templates prontos"
          href="/fitness/musculacao/programa/templates"
        >
          <p>
            Se não quer responder questionário, escolhe um split clássico
            direto:
          </p>
          <ul>
            <li>🌱 Full Body 3x — iniciante</li>
            <li>💪 Push/Pull/Legs 6x — hipertrofia</li>
            <li>⚖️ Upper/Lower 4x — balanceado</li>
            <li>⚡ Full Body Minimalista 3x — pouco tempo</li>
          </ul>
        </Section>

        <Section
          icon={<Calendar className="h-5 w-5" />}
          title="Treino do dia"
          href="/fitness/musculacao/hoje"
        >
          <p>
            Tem programa ativo? Aqui mostra qual dia da rotação toca agora
            (round-robin baseado em sessions desde criação).
          </p>
          <ul>
            <li>Lista de exercícios com sets/reps/RPE/descanso target</li>
            <li>Logger inline — clica e loga direto, com peso/reps pré-populado</li>
            <li>Badge verde quando completa target sets</li>
            <li>Rest timer automático entre sets</li>
          </ul>
        </Section>

        <Section
          icon={<Footprints className="h-5 w-5" />}
          title="Corrida"
          href="/fitness/corrida"
        >
          <p>Estilo Strava com GPS + cronômetro + share:</p>
          <ul>
            <li>
              <strong>GPS tracker</strong> via Geolocation API, filtro de ruído,
              cronômetro
            </li>
            <li>
              <strong>Pace ao vivo</strong> (últimos 500m/30s) + pace médio +
              splits por km
            </li>
            <li>
              <strong>Mapa SVG</strong> do trajeto com pulse animado no ponto
              atual
            </li>
            <li>
              <strong>Share canvas</strong> 1080×1080 com gradiente brand +
              trace + métricas. Web Share API nativa no mobile.
            </li>
            <li>
              <strong>Histórico clicável</strong> — abre detail de cada
              corrida com splits visuais (bar chart por km)
            </li>
          </ul>
        </Section>

        <Section
          icon={<Activity className="h-5 w-5" />}
          title="Outras atividades"
          href="/fitness/outros"
        >
          <p>10 modalidades além de musculação/corrida:</p>
          <ul>
            <li>🚴 Bike · 🏊 Natação · 🧗 Escalada · 🧘 Yoga · 🤸 Pilates</li>
            <li>🔥 HIIT · 🤲 Mobilidade · 🚶 Caminhada · 🚣 Remo · 🏃 Outra</li>
          </ul>
          <p className="mt-2">
            Form curto (duração, intensidade, distância opcional). Calorias
            estimadas automaticamente via MET (Compendium 2024).
          </p>
        </Section>

        <Section
          icon={<Scale className="h-5 w-5" />}
          title="Medidas corporais"
          href="/fitness/medidas"
        >
          <p>
            Tracking de peso, % gordura, massa, e medidas (cintura, peito,
            braço, etc.).
          </p>
          <ul>
            <li>
              <strong>Sparklines</strong> mostrando evolução de cada métrica
            </li>
            <li>
              <strong>Delta %</strong> total + cor que respeita direção (cintura
              menor = bom, peso menor = depende, etc.)
            </li>
            <li>1 medição por dia (upsert)</li>
          </ul>
        </Section>

        <Section
          icon={<Trophy className="h-5 w-5" />}
          title="Conquistas + XP"
          href="/fitness/conquistas"
        >
          <p>
            Sistema gamificado com <strong>31 conquistas</strong> em 4 tiers
            (common/rare/epic/legendary):
          </p>
          <ul>
            <li>Strength: primeiro set, 100 sets, supino 100kg, etc.</li>
            <li>Running: primeira corrida, 5K, 10K, sub-5 pace</li>
            <li>Consistency: streaks 3/7/30/100 dias</li>
            <li>Volume: 1k/10k/100k kg acumulados</li>
            <li>Other: cross-train multimodal</li>
          </ul>
          <p className="mt-2">
            Cada conquista vale XP, que sobe seu Level. Toast 🏆 dispara
            quando desbloqueia.
          </p>
        </Section>

        <Section icon={<BatteryCharging className="h-5 w-5" />} title="Recovery + VO₂max">
          <p>
            <strong>Recovery score</strong> 0-100 baseado em ACWR (Acute:Chronic
            Workload Ratio — padrão de sports medicine). Penaliza sobrecarga,
            bonifica descanso, recomenda treino apropriado.
          </p>
          <p className="mt-2">
            <strong>VO₂max estimado</strong> via fórmula Daniels com bonus
            por distância. Não é medida médica — pra precisão real, faça teste
            em laboratório.
          </p>
        </Section>

        <Section icon={<Heart className="h-5 w-5" />} title="Dr. Lon insights">
          <p>
            Análise semanal IA por Claude Sonnet 4.6:
          </p>
          <ul>
            <li>Cruza volume, corridas, recovery, VO₂max, PRs, muscle analysis</li>
            <li>Gera 2-4 insights tipados (positive/neutral/warning)</li>
            <li>Cache 24h em sessionStorage (não chama IA toda vez)</li>
            <li>Tom direto, casual, cita números reais</li>
          </ul>
        </Section>

        <Section icon={<Calculator className="h-5 w-5" />} title="Plate calculator + Rest timer">
          <p>
            Utilitários dentro do log de set (musculação):
          </p>
          <ul>
            <li>
              <strong>Rest timer</strong> com anel circular, beep ao terminar
              (Web Audio API), vibração mobile. Presets 30-180s, ajustes ±15s.
            </li>
            <li>
              <strong>Plate calculator</strong> com cores IWF oficiais,
              algoritmo greedy, suporta barras 10/15/20kg.
            </li>
          </ul>
        </Section>

        <Section icon={<Trophy className="h-5 w-5" />} title="Records" href="/fitness/records">
          <p>
            Página dedicada aos seus PRs:
          </p>
          <ul>
            <li>
              <strong>Corrida</strong> — mais longa + melhor pace
            </li>
            <li>
              <strong>Musculação</strong> — top 50 PRs ranked por weight × reps
            </li>
            <li>
              <strong>Outras</strong> — mais longa de cada modalidade
            </li>
          </ul>
        </Section>

        <Section icon={<Download className="h-5 w-5" />} title="Exportar CSV">
          <p>
            Botão "Exportar CSV" no top-right do header. Baixa todo histórico
            em CSV pra abrir no Excel/Google Sheets/Notion. Filtra por tipo
            (tudo, musculação, corrida, outras, medidas).
          </p>
        </Section>

        <Section icon={<Timer className="h-5 w-5" />} title="Heatmap clicável">
          <p>
            Cada quadradinho do heatmap representa um dia. Verde mais escuro =
            mais intenso. Days com sets de musculação são clicáveis e abrem
            detail da sessão daquele dia.
          </p>
        </Section>
      </section>

      <footer className="rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-4 text-center">
        <p className="text-[12px] text-zinc-600">
          Todas essas features rodam direto no Longevify. Sem precisar de mais
          5 apps.
        </p>
        <p className="mt-2 text-[10.5px] text-zinc-400">
          Dúvidas? Bata no Dr. Lon no Concierge.
        </p>
      </footer>
    </div>
  );
}

function Section({
  icon,
  title,
  href,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  const content = (
    <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4">
      <h3 className="inline-flex items-center gap-2 text-[15px] font-semibold text-zinc-900">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
          {icon}
        </span>
        {title}
        {href && (
          <span className="ml-1 text-[11px] font-normal text-brand-700">
            →
          </span>
        )}
      </h3>
      <div className="mt-2 space-y-1 text-[12.5px] leading-relaxed text-zinc-700 [&_li]:ml-4 [&_li]:list-disc [&_li]:marker:text-zinc-300 [&_strong]:text-zinc-900">
        {children}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block transition hover:shadow-sm">
      {content}
    </Link>
  ) : (
    content
  );
}
