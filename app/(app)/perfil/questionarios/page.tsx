"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, ClipboardList, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatDatePtBR } from "@/lib/utils";
import { QUESTIONNAIRES } from "@/lib/questionnaires/definitions";
import { latestResult } from "@/lib/questionnaires/storage";

interface CardState {
  id: string;
  completedAt?: string;
  score?: number;
}

export default function QuestionariosListPage() {
  const [states, setStates] = useState<CardState[]>(() =>
    QUESTIONNAIRES.map((q) => ({ id: q.id })),
  );

  useEffect(() => {
    const next = QUESTIONNAIRES.map((q) => {
      const r = latestResult(q.id);
      return r
        ? { id: q.id, completedAt: r.completedAt, score: r.score }
        : { id: q.id };
    });
    setStates(next);
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1000px] px-6 py-10">
      <header className="pb-8">
        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
          <ClipboardList className="h-3.5 w-3.5" />
          Conta · Avaliações
        </span>
        <h1 className="mt-1 text-[40px] leading-[1.05] font-semibold tracking-tight">
          Questionários de saúde
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Escalas validadas internacionalmente que ajudam o time Longevify a
          enxergar saúde mental, sono e estresse — dados que biomarcadores não
          mostram. Recomendamos refazer trimestralmente.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {QUESTIONNAIRES.map((q) => {
          const state = states.find((s) => s.id === q.id);
          const completed = !!state?.completedAt;
          return (
            <li key={q.id}>
              <Link
                href={`/perfil/questionarios/${q.id}`}
                className="block focus-visible:outline-none"
              >
                <Card className="group flex items-center gap-4 p-5 transition-shadow hover:shadow-[0_8px_24px_rgba(13,40,24,.08)] focus-within:ring-2 focus-within:ring-brand-400">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
                    <ClipboardList className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className="text-[15px] font-semibold leading-tight">
                        {q.name}
                      </span>
                      <span className="text-[13px] text-muted">
                        {q.scale}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[13px] text-muted">
                      {q.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {q.estimatedMinutes} min
                      </span>
                      <span>{q.questions.length} perguntas</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 h-6 text-[11px] font-medium",
                        completed
                          ? "bg-[#DFF5E9] text-[#0E7B45]"
                          : "bg-brand-50 text-brand-700",
                      )}
                    >
                      {completed ? "Preenchido" : "Não preenchido"}
                    </span>
                    {completed ? (
                      <span className="text-[11.5px] text-muted">
                        em {formatDatePtBR(state!.completedAt!)}
                      </span>
                    ) : null}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-[11.5px] leading-relaxed text-muted">
        Os questionários são triagens validadas — não substituem avaliação
        clínica. Em emergência, ligue 188 (CVV) ou 192 (SAMU).
      </p>
    </div>
  );
}
