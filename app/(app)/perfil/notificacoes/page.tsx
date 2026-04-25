"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  HeartPulse,
  Megaphone,
  MessageSquare,
  Watch,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

interface NotifItem {
  key: string;
  label: string;
  description: string;
}

interface NotifGroup {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NotifItem[];
}

const GROUPS: NotifGroup[] = [
  {
    id: "saude",
    title: "Saúde",
    description: "Alertas clínicos e atualizações de exame.",
    icon: HeartPulse,
    items: [
      {
        key: "saude.exam.new",
        label: "Novos resultados de exame",
        description: "Quando um exame seu é publicado no app.",
      },
      {
        key: "saude.collection.reminder",
        label: "Lembrete de coleta",
        description: "1 dia antes da coleta agendada.",
      },
      {
        key: "saude.biomarker.outOfRange",
        label: "Biomarcador fora da faixa",
        description: "Avisa quando um marcador sai do intervalo ótimo.",
      },
      {
        key: "saude.score.bigChange",
        label: "Score variou >5 pontos",
        description: "Alerta de mudança relevante no Longevify Score.",
      },
    ],
  },
  {
    id: "protocolo",
    title: "Protocolo",
    description: "Mudanças no plano e lembretes de execução.",
    icon: Activity,
    items: [
      {
        key: "protocolo.changes",
        label: "Mudanças no protocolo",
        description: "Quando a equipe ajusta o seu plano.",
      },
      {
        key: "protocolo.daily",
        label: "Lembrete diário de hábitos",
        description: "Push diário com seu checklist do dia.",
      },
    ],
  },
  {
    id: "wearables",
    title: "Wearables",
    description: "Metas e conquistas vindas do anel/relógio.",
    icon: Watch,
    items: [
      {
        key: "wearables.sleep.miss",
        label: "Meta de sono não atingida",
        description: "Se dormir menos do que a meta semanal.",
      },
      {
        key: "wearables.exercise.hit",
        label: "Meta de exercício atingida",
        description: "Pequeno parabéns quando bate o objetivo.",
      },
    ],
  },
  {
    id: "concierge",
    title: "Concierge",
    description: "Mensagens da equipe Longevify.",
    icon: MessageSquare,
    items: [
      {
        key: "concierge.reply",
        label: "Resposta da equipe",
        description: "Quando alguém responde sua dúvida.",
      },
      {
        key: "concierge.news",
        label: "Novidades da equipe Longevify",
        description: "Avisos relevantes sobre o serviço.",
      },
    ],
  },
  {
    id: "marketing",
    title: "Loja & Marketing",
    description: "Conteúdo opcional — você pode desligar tudo.",
    icon: Megaphone,
    items: [
      {
        key: "marketing.products",
        label: "Novos produtos",
        description: "Lançamentos da Loja Longevify.",
      },
      {
        key: "marketing.promos",
        label: "Promoções",
        description: "Descontos pontuais e cupons.",
      },
      {
        key: "marketing.newsletter",
        label: "Newsletter quinzenal",
        description: "Conteúdo curado de longevidade.",
      },
    ],
  },
];

const STORAGE_KEY = "longevify.notifications";

function defaultState(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const g of GROUPS) {
    const onByDefault = g.id === "saude" || g.id === "protocolo";
    for (const item of g.items) {
      out[item.key] = onByDefault;
    }
  }
  // Concierge replies on por padrão; news off.
  out["concierge.reply"] = true;
  return out;
}

export default function NotificacoesPage() {
  const [state, setState] = useState<Record<string, boolean>>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        setState((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  function toggle(key: string, value: boolean) {
    setState((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota
      }
      return next;
    });
  }

  function setGroup(group: NotifGroup, value: boolean) {
    setState((prev) => {
      const next = { ...prev };
      for (const item of group.items) next[item.key] = value;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    toast.success({
      title: value ? "Categoria ativada" : "Categoria silenciada",
      description: group.title,
    });
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-6 py-10">
      <header className="pb-8">
        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
          <Bell className="h-3.5 w-3.5" />
          Conta
        </span>
        <h1 className="mt-1 text-[40px] leading-[1.05] font-semibold tracking-tight">
          Notificações
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Escolha o que quer receber. Por padrão deixamos tudo de saúde e
          protocolo ligado — você pode silenciar marketing a qualquer momento.
        </p>
      </header>

      <div className="flex flex-col gap-5">
        {GROUPS.map((group) => {
          const Icon = group.icon;
          const groupKeys = group.items.map((i) => i.key);
          const allOn = groupKeys.every((k) => state[k]);
          return (
            <Card key={group.id} className="flex flex-col gap-4 p-6">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[16px] font-semibold leading-tight">
                    {group.title}
                  </h2>
                  <p className="text-[12px] text-muted">{group.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGroup(group, !allOn)}
                  className="text-[12px] font-medium text-brand-700 hover:text-brand-800"
                >
                  {allOn ? "Desligar todas" : "Ligar todas"}
                </button>
              </div>

              <ul className="flex flex-col divide-y divide-border/70">
                {group.items.map((item) => {
                  const checked = !!state[item.key];
                  return (
                    <li
                      key={item.key}
                      className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "text-[14px] font-medium leading-tight",
                            !checked && "text-muted",
                          )}
                        >
                          {item.label}
                        </div>
                        <p className="mt-0.5 text-[12.5px] text-muted">
                          {item.description}
                        </p>
                      </div>
                      <Switch
                        checked={checked}
                        onChange={(v) => toggle(item.key, v)}
                        ariaLabel={item.label}
                      />
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}

        <p className="px-1 text-[12px] text-muted">
          Suas preferências ficam salvas neste navegador. Em breve sincronizamos
          com sua conta.
          {hydrated ? null : <span className="opacity-0"> · </span>}
        </p>
      </div>
    </div>
  );
}
