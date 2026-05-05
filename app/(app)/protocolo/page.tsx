import { Activity, Clock, Droplet, Moon, Pill, Salad, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Item {
  title: string;
  detail: string;
  tag: string;
  when?: string; // quando executar (ex: "Manhã", "Pós-treino")
}

interface Section {
  id: string;
  label: string;
  icon: LucideIcon;
  accent: string;
  items: Item[];
}

const SECTIONS: Section[] = [
  {
    id: "suplementos",
    label: "Suplementação",
    icon: Pill,
    accent: "bg-[#DFF5E9] text-[#0E7B45]",
    items: [
      {
        title: "Vitamina D3 5000 UI",
        detail: "1x ao dia, com gordura — manhã",
        tag: "Nível 42,3 ng/dL",
        when: "Manhã",
      },
      {
        title: "Ômega 3 (EPA/DHA 2g)",
        detail: "2x ao dia, com refeições",
        tag: "Cardiovascular",
        when: "Almoço / Jantar",
      },
      {
        title: "Creatina monohidratada 5g",
        detail: "Diariamente, hidratada",
        tag: "Performance",
        when: "Qualquer horário",
      },
    ],
  },
  {
    id: "nutricao",
    label: "Nutrição",
    icon: Salad,
    accent: "bg-[#FBF0D4] text-[#8A6A13]",
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
    accent: "bg-[#E7ECFD] text-[#3B44C2]",
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
    accent: "bg-[#E7F0FD] text-[#2562A8]",
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
    accent: "bg-[#FCEBD8] text-[#A8651B]",
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
    accent: "bg-[#E1F0FB] text-[#206396]",
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

export default function ProtocoloPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10">
      <header className="pb-8">
        <span className="text-[13px] text-muted">Personalizado para você</span>
        <h1 className="text-[40px] leading-[1.05] font-semibold tracking-tight">
          Protocolo
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          Seu plano integrado de suplementação, nutrição, treino, sono e
          hábitos — construído a partir dos seus biomarcadores mais recentes.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.id} className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <span
                  className={`grid h-10 w-10 place-items-center rounded-xl ${s.accent}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="text-[17px] font-semibold">{s.label}</h2>
              </div>
              <ul className="flex flex-col divide-y divide-border/70">
                {s.items.map((it) => (
                  <li
                    key={it.title}
                    className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[14px] font-medium leading-snug">
                          {it.title}
                        </div>
                        <div className="mt-0.5 text-[12px] text-muted">
                          {it.detail}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-brand-700">
                        {it.tag}
                      </span>
                    </div>
                    {/*
                      Badge de quando executar + botão stub de marcação.
                      Botão disabled pois check-in não tem dados reais ainda —
                      evita UX enganosa antes da feature estar pronta.
                    */}
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
            </Card>
          );
        })}
      </div>

      {/*
        C3 — seção de aderência preenche os ~300px de espaço vazio que ficavam
        antes do footer. Sem dados reais de check-in ainda, exibe empty state
        honesto em vez de inventar métricas — feature de marcação vem em breve.
      */}
      <section className="mt-10">
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
