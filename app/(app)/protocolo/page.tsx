import {
  Activity,
  Brain,
  CheckCircle2,
  Clock,
  Droplet,
  Moon,
  Pill,
  Salad,
  Sparkles,
  Sun,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProtocolHero } from "@/components/protocolo/protocol-hero";
import { ProtocolTimeline } from "@/components/protocolo/protocol-timeline";
import { CategoryArt } from "@/components/protocolo/category-art";

interface Item {
  title: string;
  detail: string;
  tag: string;
  when?: string;
  /** opcional — imagem real do marketplace (PNG existente) pra reforçar visual */
  image?: string;
}

interface Section {
  id: string;
  label: string;
  icon: LucideIcon;
  /** chave usada pelo CategoryArt pra escolher a arte certa */
  artKey:
    | "suplementos"
    | "nutricao"
    | "exercicio"
    | "sono"
    | "luz"
    | "hidratacao"
    | "mental";
  accent: string;
  /** descrição curta da categoria pra dar contexto antes dos items */
  intro: string;
  items: Item[];
}

const SECTIONS: Section[] = [
  {
    id: "suplementos",
    label: "Suplementação",
    icon: Pill,
    artKey: "suplementos",
    accent: "bg-[#DFF5E9] text-[#0E7B45]",
    intro:
      "3 ativos com evidência forte pra seus biomarcadores atuais — doses calibradas pelo Concierge.",
    items: [
      {
        title: "Vitamina D3 5000 UI",
        detail: "1x ao dia, com gordura — manhã",
        tag: "Nível 42,3 ng/dL",
        when: "Manhã",
        image: "/marketplace/vitamina-d.png",
      },
      {
        title: "Ômega 3 (EPA/DHA 2g)",
        detail: "2x ao dia, com refeições",
        tag: "Cardiovascular",
        when: "Almoço / Jantar",
        image: "/marketplace/omega-3.png",
      },
      {
        title: "Creatina monohidratada 5g",
        detail: "Diariamente, hidratada",
        tag: "Performance",
        when: "Qualquer horário",
        image: "/marketplace/creatina.png",
      },
    ],
  },
  {
    id: "nutricao",
    label: "Nutrição",
    icon: Salad,
    artKey: "nutricao",
    accent: "bg-[#FBF0D4] text-[#8A6A13]",
    intro:
      "Reduzir LDL e estabilizar glicemia — duas alavancas que compõem 60% do seu risco cardiometabólico hoje.",
    items: [
      {
        title: "Reduzir gordura saturada",
        detail: "LDL em 103 mg/dL — meta < 100",
        tag: "Prioridade",
        when: "Toda refeição",
      },
      {
        title: "30g de fibra / dia",
        detail: "Aveia, frutas, vegetais, leguminosas",
        tag: "Hábito",
        when: "Ao longo do dia",
      },
    ],
  },
  {
    id: "exercicio",
    label: "Atividade Física",
    icon: Activity,
    artKey: "exercicio",
    accent: "bg-[#E7ECFD] text-[#3B44C2]",
    intro:
      "Zona 2 + força é a combinação com maior efeito sobre VO2 máx — proxy direto de longevidade.",
    items: [
      {
        title: "Zona 2 — 150 min/semana",
        detail: "Caminhada rápida, bike leve, remo",
        tag: "Longevidade",
        when: "5x / semana · 30 min",
      },
      {
        title: "Treino de força 3x/semana",
        detail: "Movimentos compostos, progressão gradual",
        tag: "Massa magra",
        when: "3x / semana",
      },
    ],
  },
  {
    id: "sono",
    label: "Sono & Recuperação",
    icon: Moon,
    artKey: "sono",
    accent: "bg-[#E7F0FD] text-[#2562A8]",
    intro:
      "Janela consistente de 8h é a intervenção #1 — afeta cortisol, glicemia, memória e humor de uma vez.",
    items: [
      {
        title: "Janela de sono 22:30 – 06:30",
        detail: "Consistência diária, incluindo fins de semana",
        tag: "8h",
        when: "Noite",
      },
    ],
  },
  {
    id: "luz",
    label: "Luz & Circadiano",
    icon: Sun,
    artKey: "luz",
    accent: "bg-[#FCEBD8] text-[#A8651B]",
    intro:
      "Luz solar matinal sincroniza relógio biológico — cascata cortisol, melatonina e dopamina.",
    items: [
      {
        title: "10 min de sol matinal",
        detail: "Dentro da 1ª hora após acordar",
        tag: "Cortisol",
        when: "Manhã",
      },
    ],
  },
  {
    id: "hidratacao",
    label: "Hidratação",
    icon: Droplet,
    artKey: "hidratacao",
    accent: "bg-[#E1F0FB] text-[#206396]",
    intro:
      "Volume plasmático adequado mantém pressão estável e função renal — fundamento do resto.",
    items: [
      {
        title: "35 mL por kg de peso corporal",
        detail: "Água + eletrólitos leves no pós-treino",
        tag: "Base",
        when: "Ao longo do dia",
      },
    ],
  },
];

const TIMELINE = [
  {
    weeks: "Semana 1-2",
    label: "Adaptação",
    detail: "Corpo se ajusta a suplementação e padrão de sono",
    icon: Sparkles,
  },
  {
    weeks: "Semana 3-6",
    label: "Energia & humor",
    detail: "Vitamina D normaliza, sono aprofunda — disposição melhora",
    icon: Brain,
  },
  {
    weeks: "Semana 6-12",
    label: "Biomarcadores",
    detail: "LDL desce, HRV sobe, glicemia em jejum estabiliza",
    icon: TrendingUp,
  },
  {
    weeks: "Mês 3+",
    label: "Reavaliação",
    detail: "Próximo painel mede progresso e recalibra protocolo",
    icon: CheckCircle2,
  },
];

export default function ProtocoloPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10">
      {/*
        Hero — substitui o header plano por um visual rich com art SVG do
        Concierge analisando biomarcadores. Dá contexto "tech" e mostra que
        o protocolo é gerado a partir de dados, não um template genérico.
      */}
      <ProtocolHero />

      {/* Linha do tempo de o que esperar — addresses a expectativa do paciente
          ("quando vou ver resultado?") com horizonte visual concreto */}
      <section className="mt-10">
        <header className="mb-5">
          <h2 className="text-[22px] font-semibold tracking-tight">
            O que esperar
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Trajetória prevista pelo Concierge com base no seu painel mais
            recente.
          </p>
        </header>
        <ProtocolTimeline steps={TIMELINE} />
      </section>

      {/* Cards de categoria — agora cada um tem hero art em SVG + intro textual
          + items detalhados. Hands-on: visual ocupa ~120px do topo do card */}
      <section className="mt-12">
        <header className="mb-5">
          <h2 className="text-[22px] font-semibold tracking-tight">
            Plano integrado
          </h2>
          <p className="mt-1 max-w-2xl text-[13px] text-muted">
            Seis pilares trabalhando em conjunto — suplementação, nutrição,
            treino, sono, luz e hidratação. Cada um calibrado pra resolver um
            biomarcador específico do seu painel.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Card
                key={s.id}
                className="flex flex-col overflow-hidden p-0"
              >
                {/* Visual top — SVG art que reforça a categoria, ~140px alto */}
                <CategoryArt artKey={s.artKey} />

                <div className="flex flex-col gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-10 w-10 place-items-center rounded-xl ${s.accent}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[17px] font-semibold leading-tight">
                        {s.label}
                      </h3>
                      <p className="mt-0.5 text-[12px] leading-snug text-muted">
                        {s.intro}
                      </p>
                    </div>
                  </div>

                  <ul className="flex flex-col divide-y divide-border/70">
                    {s.items.map((it) => (
                      <li
                        key={it.title}
                        className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            {/* Thumb visual quando item tem imagem real do
                                marketplace (vitamina-d.png etc) — reforça
                                hands-on sem precisar gerar imagem nova */}
                            {it.image ? (
                              <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#F5F5F4]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={it.image}
                                  alt=""
                                  className="h-full w-full object-contain p-1"
                                  loading="lazy"
                                />
                              </span>
                            ) : null}
                            <div className="min-w-0">
                              <div className="text-[14px] font-medium leading-snug">
                                {it.title}
                              </div>
                              <div className="mt-0.5 text-[12px] text-muted">
                                {it.detail}
                              </div>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-brand-700">
                            {it.tag}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          {it.when ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                              <Clock className="h-3 w-3 shrink-0" />
                              {it.when}
                            </span>
                          ) : (
                            <span />
                          )}
                          <button
                            type="button"
                            disabled
                            title="Marcação de aderência em breve"
                            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] text-muted cursor-not-allowed opacity-60 select-none"
                          >
                            Marcar como feito
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Aderência — mantém empty state honesto até feature ter dados reais */}
      <section className="mt-12">
        <div className="mb-4">
          <h2 className="text-[22px] font-semibold tracking-tight">
            Aderência ao protocolo
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Acompanhe quantos itens do seu protocolo você cumpriu esta semana.
          </p>
        </div>

        <Card className="flex flex-col items-center gap-4 px-8 py-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50">
            <Activity className="h-7 w-7 text-brand-700" />
          </div>
          <div>
            <p className="text-[16px] font-semibold text-ink">
              Marcação de aderência em breve
            </p>
            <p className="mt-1 max-w-sm text-[13px] text-muted">
              Em breve você poderá marcar cada item como feito e acompanhar
              sua aderência semanal com gráficos e streaks de consistência.
            </p>
          </div>
          <span className="rounded-full bg-brand-100 px-3 py-1 text-[12px] font-medium text-brand-700">
            Disponível em breve
          </span>
        </Card>
      </section>
    </div>
  );
}
