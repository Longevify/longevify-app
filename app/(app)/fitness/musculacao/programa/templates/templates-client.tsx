"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
  Library,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkoutTemplate } from "@/lib/fitness/workout-templates";
import {
  PROGRAM_GOAL_LABEL,
  EXPERIENCE_LABEL,
  MUSCLE_GROUP_LABEL,
  MUSCLE_GROUP_EMOJI,
  type MuscleGroup,
} from "@/lib/fitness/types";
import { saveAiWorkoutProgram } from "../../../actions";
import { toast } from "@/lib/toast";

interface TemplatesClientProps {
  templates: WorkoutTemplate[];
}

export function TemplatesClient({ templates }: TemplatesClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<WorkoutTemplate | null>(null);
  const [saving, startSaving] = useTransition();

  const useTemplate = (template: WorkoutTemplate) => {
    if (
      !confirm(
        `Ativar "${template.name}"? Se você já tem programa ativo, ele será arquivado.`,
      )
    )
      return;
    startSaving(async () => {
      const result = await saveAiWorkoutProgram({
        name: template.name,
        goal: template.goal,
        frequencyPerWeek: template.frequency,
        equipmentAvailable: ["barbell", "dumbbell", "cable", "machine", "bodyweight"],
        experienceLevel: template.level,
        restrictions: "",
        structure: template.structure,
        aiModel: `template:${template.id}`,
      });
      if (result.ok) {
        toast.success({
          title: `${template.emoji} ${template.name} ativado!`,
          description: "Agora bora treinar. Vai pra /fitness/musculacao/hoje.",
        });
        router.push("/fitness/musculacao/hoje");
      } else {
        toast.error({ title: "Erro", description: result.error });
      }
    });
  };

  if (selected) {
    return (
      <TemplateDetail
        template={selected}
        saving={saving}
        onBack={() => setSelected(null)}
        onUse={() => useTemplate(selected)}
      />
    );
  }

  return (
    <div className="pb-12">
      <Link
        href="/fitness/musculacao/programa"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-500 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </Link>

      <header className="mb-5">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-800">
          <Library className="h-3 w-3" />
          Templates prontos
        </div>
        <h2 className="mt-1 text-[24px] font-semibold leading-tight text-zinc-900">
          Splits populares
        </h2>
        <p className="mt-1 text-[13px] text-zinc-500">
          Programas montados por padrões testados. Escolha um e começa direto —
          sem questionário, sem IA.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {templates.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setSelected(t)}
              className="flex w-full items-start gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-left transition hover:border-brand-300 hover:shadow-sm"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-[24px]">
                {t.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[14.5px] font-semibold text-zinc-900">
                  {t.name}
                </h3>
                <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-zinc-600">
                  {t.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <Tag>{PROGRAM_GOAL_LABEL[t.goal]}</Tag>
                  <Tag>{EXPERIENCE_LABEL[t.level]}</Tag>
                  <Tag>{t.frequency}x/sem</Tag>
                </div>
              </div>
              <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-zinc-400" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600">
      {children}
    </span>
  );
}

function TemplateDetail({
  template,
  saving,
  onBack,
  onUse,
}: {
  template: WorkoutTemplate;
  saving: boolean;
  onBack: () => void;
  onUse: () => void;
}) {
  return (
    <div className="pb-12">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-500 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar pros templates
      </button>

      <header className="mb-5 overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white">
        <div className="px-5 py-5">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 text-[28px] text-white shadow-sm">
              {template.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-800">
                Template
              </div>
              <h2 className="mt-0.5 text-[20px] font-semibold leading-tight text-zinc-900">
                {template.name}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10.5px]">
                <Tag>{PROGRAM_GOAL_LABEL[template.goal]}</Tag>
                <Tag>{EXPERIENCE_LABEL[template.level]}</Tag>
                <Tag>{template.frequency}x/semana</Tag>
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-600">
                {template.description}
              </p>
            </div>
          </div>
        </div>
      </header>

      {template.structure.warmupNotes && (
        <section className="mb-3 rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-amber-800">
            🔥 Aquecimento
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-amber-900">
            {template.structure.warmupNotes}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        {template.structure.days.map((day) => (
          <details
            key={day.dayIndex}
            className="group rounded-2xl border border-zinc-200 bg-white"
            open
          >
            <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-700 text-[12px] font-bold text-white">
                {day.dayIndex}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-zinc-900">
                  {day.name}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-zinc-500">
                  {day.focus.map((f) => (
                    <span key={f} className="inline-flex items-center gap-0.5">
                      {MUSCLE_GROUP_EMOJI[f as MuscleGroup] ?? "💪"}
                      {MUSCLE_GROUP_LABEL[f as MuscleGroup] ?? f}
                    </span>
                  ))}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-400 transition group-open:rotate-90" />
            </summary>

            <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
              {day.exercises.map((ex, idx) => (
                <li key={idx} className="flex items-start gap-3 px-4 py-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-zinc-100 text-[10px] font-semibold text-zinc-600">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium text-zinc-900">
                      {ex.exerciseName ?? ex.exerciseId}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10.5px] text-zinc-500 tabular-nums">
                      <span>
                        <strong className="text-zinc-700">{ex.targetSets}</strong>{" "}
                        ×{" "}
                        <strong className="text-zinc-700">{ex.targetReps}</strong>{" "}
                        reps
                      </span>
                      {ex.targetRpe && <span>· RPE {ex.targetRpe}</span>}
                      <span>· descanso {ex.restSeconds}s</span>
                    </div>
                    {ex.notes && (
                      <p className="mt-1 text-[11px] italic text-zinc-500">
                        {ex.notes}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>

      {template.structure.progressionStrategy && (
        <section className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 px-4 py-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
            📈 Progressão
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-emerald-900">
            {template.structure.progressionStrategy}
          </p>
        </section>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={onUse}
        disabled={saving}
        className={cn(
          "mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 px-5 py-3.5 text-[14px] font-semibold text-white shadow-md transition disabled:opacity-50",
        )}
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Ativando…
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            Usar este template
          </>
        )}
      </button>

      <p className="mt-3 text-center text-[10.5px] text-zinc-400">
        Ao ativar, vira seu programa atual (arquiva o anterior). Você pode trocar
        ou gerar novo a qualquer momento.
      </p>
    </div>
  );
}
