"use client";

import Image from "next/image";
import { Sun, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "@/lib/toast";

interface TodayAction {
  id: string;
  label: string;
  image?: string;
  icon?: LucideIcon;
  iconAccent?: string;
}

interface WorkingOnItem {
  id: string;
  title: string;
  description: string;
}

const TODAY_ACTIONS: TodayAction[] = [
  {
    id: "vitd",
    label: "Tomar 1 cápsula de Vitamina D3 5.000 UI no café da manhã",
    image: "/marketplace/vitamina-d.png",
  },
  {
    id: "omega",
    label: "Tomar 2 cápsulas de Ômega 3 (EPA/DHA) com o almoço",
    image: "/marketplace/omega-3.png",
  },
  {
    id: "creatina",
    label: "Tomar 5g de Creatina monohidratada com água",
    image: "/marketplace/creatina.png",
  },
  {
    id: "magnesio",
    label: "Tomar 1 cápsula de Magnésio Quelato 200mg antes de dormir",
    image: "/marketplace/magnesio-quelato.png",
  },
  {
    id: "sun-move",
    label: "10 min de sol matinal + 30 min de caminhada em Zona 2",
    icon: Sun,
    iconAccent: "bg-[#FCEBD8] text-[#A8651B]",
  },
];

const WORKING_ON: WorkingOnItem[] = [
  {
    id: "ldl",
    title: "Reduzir LDL abaixo de 100 mg/dL",
    description:
      "Seu LDL está em 103 mg/dL. Vamos chegar à faixa ótima reduzindo gordura saturada e priorizando 30g de fibra por dia.",
  },
  {
    id: "vitd-level",
    title: "Atingir 50+ ng/dL de Vitamina D",
    description:
      "Você está em 42,3 ng/dL. Suplementação diária + 10 min de sol matinal devem te levar à faixa ótima em 8 a 12 semanas.",
  },
  {
    id: "zone2",
    title: "Construir base aeróbica em Zona 2",
    description:
      "150 min/semana de zona 2 (caminhada rápida, bike leve) é o investimento mais robusto pra longevidade cardiovascular.",
  },
];

export function ProtocoloClient() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6 sm:py-10">
      <header className="pb-8">
        <span className="text-[13px] text-muted">Personalizado para você</span>
        <h1 className="text-[32px] leading-[1.05] font-semibold tracking-tight sm:text-[40px]">
          Protocolo
        </h1>
      </header>

      {/* Ações de hoje */}
      <section>
        <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
          Ações de hoje
        </h2>
        <ul className="flex flex-col gap-2">
          {TODAY_ACTIONS.map((a) => (
            <li key={a.id}>
              <TodayActionRow action={a} />
            </li>
          ))}
        </ul>
      </section>

      {/* No que estamos trabalhando */}
      <section className="mt-12">
        <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
          No que estamos trabalhando
        </h2>
        <ul className="flex flex-col gap-3">
          {WORKING_ON.map((item, idx) => (
            <li key={item.id}>
              <WorkingOnRow item={item} index={idx + 1} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function TodayActionRow({ action }: { action: TodayAction }) {
  const Icon = action.icon;

  function handleClick() {
    toast.info({
      title: "Em breve",
      description: "Marcação de aderência estará disponível em breve.",
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left transition hover:border-brand-200 hover:bg-brand-50/40 active:scale-[0.995]"
    >
      {/* Checkbox visual */}
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-border bg-surface transition group-hover:border-brand-400" />

      {/* Ícone/imagem do item */}
      {action.image ? (
        <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-50">
          <Image
            src={action.image}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 object-cover"
          />
        </span>
      ) : Icon ? (
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${action.iconAccent ?? "bg-brand-50 text-brand-700"}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      ) : null}

      <span className="flex-1 text-[14px] font-medium leading-snug text-ink">
        {action.label}
      </span>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted/50" />
    </button>
  );
}

function WorkingOnRow({
  item,
  index,
}: {
  item: WorkingOnItem;
  index: number;
}) {
  function handleClick() {
    toast.info({
      title: "Em breve",
      description: "Detalhes e progresso do objetivo estarão disponíveis em breve.",
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full cursor-pointer gap-4 rounded-2xl border border-border bg-surface px-5 py-4 text-left transition hover:border-brand-200 hover:bg-brand-50/40 active:scale-[0.995]"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-[14px] font-semibold text-brand-700">
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[16px] font-semibold leading-snug text-ink">
          {item.title}
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          {item.description}
        </p>
      </div>
    </button>
  );
}
