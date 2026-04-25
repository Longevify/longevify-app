import { Activity, Droplet, Moon, Pill, Salad, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Item {
  title: string;
  detail: string;
  tag: string;
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
      },
      {
        title: "Ômega 3 (EPA/DHA 2g)",
        detail: "2x ao dia, com refeições",
        tag: "Cardiovascular",
      },
      {
        title: "Creatina monohidratada 5g",
        detail: "Diariamente, hidratada",
        tag: "Performance",
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
      },
      {
        title: "30g de fibra / dia",
        detail: "Aveia, frutas, vegetais, leguminosas",
        tag: "Hábito",
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
      },
      {
        title: "Treino de força 3x/semana",
        detail: "Movimentos compostos, progressão gradual",
        tag: "Massa magra",
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
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
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
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
