"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Loader2,
  ArrowLeft,
  ChevronRight,
  Dumbbell,
  Target,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Exercise,
  type WorkoutProgram,
  type ProgramGoal,
  type ExperienceLevel,
  type EquipmentKind,
  type ProgramStructure,
  PROGRAM_GOAL_LABEL,
  EXPERIENCE_LABEL,
  EQUIPMENT_LABEL,
  MUSCLE_GROUP_LABEL,
  MUSCLE_GROUP_EMOJI,
  type MuscleGroup,
} from "@/lib/fitness/types";
import {
  saveAiWorkoutProgram,
  archiveActiveProgram,
} from "../../actions";
import { toast } from "@/lib/toast";

/**
 * Lucas (2026-05-21): "AI workout generator com base em algumas
 * perguntas iniciais."
 *
 * 2 modes:
 *  - Sem programa ativo → questionário (5 perguntas) + botão "Gerar com IA"
 *  - Com programa ativo → exibe o programa estruturado com dias + exercícios,
 *    botão pra "Gerar novo" (arquiva atual) ou "Arquivar"
 */

interface ProgramaClientProps {
  exercises: Exercise[];
  program: WorkoutProgram | null;
}

export function ProgramaClient({ program }: ProgramaClientProps) {
  const router = useRouter();
  const [view, setView] = useState<"questionnaire" | "display" | "preview">(
    program ? "display" : "questionnaire",
  );

  // Estados do questionário
  const [goal, setGoal] = useState<ProgramGoal>("hipertrofia");
  const [frequency, setFrequency] = useState<number>(4);
  const [equipment, setEquipment] = useState<EquipmentKind[]>([
    "barbell",
    "dumbbell",
    "machine",
    "cable",
    "bodyweight",
  ]);
  const [experience, setExperience] = useState<ExperienceLevel>("intermediario");
  const [restrictions, setRestrictions] = useState("");

  // Estados de preview (programa gerado mas não salvo ainda)
  const [previewName, setPreviewName] = useState("");
  const [previewStructure, setPreviewStructure] =
    useState<ProgramStructure | null>(null);

  const [generating, setGenerating] = useState(false);
  const [saving, startSaving] = useTransition();

  const toggleEquipment = (eq: EquipmentKind) => {
    setEquipment((cur) =>
      cur.includes(eq) ? cur.filter((e) => e !== eq) : [...cur, eq],
    );
  };

  const generate = async () => {
    if (equipment.length === 0) {
      toast.error({
        title: "Selecione equipamento",
        description: "Pelo menos 1 tipo de equipamento.",
      });
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/fitness/program/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          frequencyPerWeek: frequency,
          equipmentAvailable: equipment,
          experienceLevel: experience,
          restrictions,
        }),
      });
      const data = (await res.json()) as
        | {
            ok: true;
            name: string;
            structure: ProgramStructure;
            aiModel: string;
          }
        | { ok: false; error: string };
      if (!data.ok) {
        toast.error({
          title: "Falha ao gerar treino",
          description: data.error,
        });
        return;
      }
      setPreviewName(data.name);
      setPreviewStructure(data.structure);
      setView("preview");
    } catch (e) {
      toast.error({
        title: "Erro de rede",
        description: e instanceof Error ? e.message : "—",
      });
    } finally {
      setGenerating(false);
    }
  };

  const saveProgram = () => {
    if (!previewStructure) return;
    startSaving(async () => {
      const result = await saveAiWorkoutProgram({
        name: previewName,
        goal,
        frequencyPerWeek: frequency,
        equipmentAvailable: equipment,
        experienceLevel: experience,
        restrictions,
        structure: previewStructure,
      });
      if (result.ok) {
        toast.success({
          title: "Programa salvo",
          description: `${previewName} já está ativo. Vai treinar!`,
        });
        router.refresh();
        setView("display");
      } else {
        toast.error({
          title: "Erro ao salvar",
          description: result.error,
        });
      }
    });
  };

  const archive = () => {
    if (!confirm("Arquivar programa atual? Você pode gerar um novo depois.")) return;
    startSaving(async () => {
      const result = await archiveActiveProgram();
      if (result.ok) {
        toast.success({ title: "Programa arquivado" });
        router.refresh();
        setView("questionnaire");
      } else {
        toast.error({ title: "Erro", description: result.error });
      }
    });
  };

  // ─── View: programa ativo (display) ──────────────────────────────────
  if (view === "display" && program) {
    return (
      <ProgramDisplay
        program={program}
        onGenerateNew={() => {
          // Pré-popula os states com o programa atual pro fluxo de "gerar novo"
          setGoal(program.goal);
          setFrequency(program.frequencyPerWeek);
          setEquipment(program.equipmentAvailable);
          setExperience(program.experienceLevel);
          setRestrictions(program.restrictions ?? "");
          setView("questionnaire");
        }}
        onArchive={archive}
      />
    );
  }

  // ─── View: preview (programa gerado, ainda não salvo) ────────────────
  if (view === "preview" && previewStructure) {
    return (
      <div className="pb-12">
        <BackBar onBack={() => setView("questionnaire")} />

        {/* Lucas (2026-05-25): "acho que o treino não ta ficando salvo
            quando eu peço para criar" → banner explícito de que o
            programa ainda não foi persistido. Botão "Salvar e ativar"
            fica fixed no bottom pro user não passar batido. */}
        <div className="mb-3 flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div className="flex-1 text-[11.5px] leading-snug text-amber-900">
            <strong className="font-semibold">Programa ainda NÃO salvo.</strong>{" "}
            Revise abaixo e clique em <strong>“Salvar e ativar”</strong> pra
            começar a usar — caso contrário, vai sumir ao recarregar.
          </div>
        </div>

        <header className="mb-5 rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white px-5 py-5">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-800">
            <Sparkles className="h-3 w-3" />
            Programa gerado pelo Dr. Lon (preview)
          </div>
          <h2 className="mt-1 text-[20px] font-semibold leading-tight text-zinc-900">
            {previewName}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-zinc-600">
            <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-zinc-200">
              {PROGRAM_GOAL_LABEL[goal]}
            </span>
            <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-zinc-200">
              {frequency}x/semana
            </span>
            <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-zinc-200">
              {EXPERIENCE_LABEL[experience]}
            </span>
          </div>
        </header>

        <ProgramStructureView structure={previewStructure} />

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setPreviewStructure(null);
              setView("questionnaire");
            }}
            className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-[13px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Refazer questionário
          </button>
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="rounded-xl border border-brand-300 bg-brand-50 px-5 py-3 text-[13px] font-semibold text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
          >
            {generating ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando…
              </span>
            ) : (
              "↻ Gerar outra versão"
            )}
          </button>
          <button
            type="button"
            onClick={saveProgram}
            disabled={saving}
            className="flex-1 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 px-5 py-3 text-[14px] font-semibold text-white shadow-sm transition disabled:opacity-50"
          >
            {saving ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando…
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-2">
                <Check className="h-4 w-4" /> Salvar e ativar
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ─── View: questionário ─────────────────────────────────────────────
  return (
    <div className="pb-12">
      <BackBar
        onBack={() => {
          if (program) setView("display");
          else router.push("/fitness/musculacao");
        }}
      />

      <header className="mb-5">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-800">
          <Sparkles className="h-3 w-3" />
          Gerador de treino com Dr. Lon
        </div>
        <h2 className="mt-1 text-[24px] font-semibold leading-tight text-zinc-900">
          Conta um pouco do seu objetivo
        </h2>
        <p className="mt-1 text-[13px] text-zinc-500">
          Em ~30s o Dr. Lon monta um programa personalizado pra você.
        </p>
      </header>

      <div className="space-y-5">
        {/* Pergunta 1: Objetivo */}
        <QuestionCard
          icon={<Target className="h-4 w-4 text-brand-700" />}
          label="Qual seu objetivo?"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(Object.keys(PROGRAM_GOAL_LABEL) as ProgramGoal[]).map((g) => (
              <ChipOption
                key={g}
                label={PROGRAM_GOAL_LABEL[g]}
                active={goal === g}
                onClick={() => setGoal(g)}
              />
            ))}
          </div>
        </QuestionCard>

        {/* Pergunta 2: Frequência */}
        <QuestionCard
          icon={<Calendar className="h-4 w-4 text-brand-700" />}
          label="Quantos dias por semana?"
        >
          <div className="flex flex-wrap gap-1.5">
            {[2, 3, 4, 5, 6].map((n) => (
              <ChipOption
                key={n}
                label={`${n}x`}
                active={frequency === n}
                onClick={() => setFrequency(n)}
                size="sm"
              />
            ))}
          </div>
        </QuestionCard>

        {/* Pergunta 3: Experiência */}
        <QuestionCard
          icon={<Dumbbell className="h-4 w-4 text-brand-700" />}
          label="Qual seu nível?"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(Object.keys(EXPERIENCE_LABEL) as ExperienceLevel[]).map((e) => (
              <ChipOption
                key={e}
                label={EXPERIENCE_LABEL[e]}
                active={experience === e}
                onClick={() => setExperience(e)}
              />
            ))}
          </div>
        </QuestionCard>

        {/* Pergunta 4: Equipamento */}
        <QuestionCard
          icon={<Dumbbell className="h-4 w-4 text-brand-700" />}
          label="Qual equipamento você tem?"
          hint="Marque tudo que você usa (academia? marca todos)"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(EQUIPMENT_LABEL) as EquipmentKind[]).map((eq) => (
              <ChipOption
                key={eq}
                label={EQUIPMENT_LABEL[eq]}
                active={equipment.includes(eq)}
                onClick={() => toggleEquipment(eq)}
              />
            ))}
          </div>
        </QuestionCard>

        {/* Pergunta 5: Restrições */}
        <QuestionCard
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          label="Tem alguma restrição ou lesão?"
          hint="Opcional — mas ajuda muito o Dr. Lon"
        >
          <textarea
            value={restrictions}
            onChange={(e) => setRestrictions(e.target.value)}
            placeholder="Ex: 'Tenho dor no joelho direito, evitar agachamento livre' ou 'Bursite no ombro'"
            rows={3}
            maxLength={300}
            className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
          />
          <p className="mt-1 text-right text-[10.5px] text-zinc-400">
            {restrictions.length}/300
          </p>
        </QuestionCard>
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={generating}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 px-5 py-3.5 text-[15px] font-semibold text-white shadow-md transition disabled:opacity-50"
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Dr. Lon montando seu treino…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Gerar treino personalizado
          </>
        )}
      </button>

      <p className="mt-3 text-center text-[10.5px] text-zinc-400">
        Powered by Claude Sonnet 4.6 · 100% no Brasil 🇧🇷
      </p>

      {/* Phase 3K: Templates alternative */}
      <Link
        href="/fitness/musculacao/programa/templates"
        className="mt-5 block rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 px-4 py-3.5 text-center text-[12px] text-zinc-600 transition hover:border-brand-300 hover:bg-brand-50/30"
      >
        📚 Prefere começar com um <strong>template pronto</strong>? Veja splits
        clássicos →
      </Link>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-500 transition hover:text-brand-700"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Voltar
    </button>
  );
}

function QuestionCard({
  icon,
  label,
  hint,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-3.5">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-[13px] font-semibold text-zinc-800">{label}</span>
      </div>
      {hint && <p className="mb-2 text-[11px] text-zinc-500">{hint}</p>}
      {children}
    </section>
  );
}

function ChipOption({
  label,
  active,
  onClick,
  size = "md",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  size?: "md" | "sm";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border text-left transition",
        size === "sm" ? "px-3 py-1.5 text-[12px]" : "px-3.5 py-2.5 text-[12.5px]",
        active
          ? "border-brand-700 bg-brand-50 font-semibold text-brand-900 shadow-sm"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300",
      )}
    >
      {label}
    </button>
  );
}

function ProgramStructureView({ structure }: { structure: ProgramStructure }) {
  return (
    <div className="space-y-3">
      {structure.warmupNotes && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-amber-800">
            🔥 Aquecimento
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-amber-900">
            {structure.warmupNotes}
          </p>
        </div>
      )}

      {structure.days.map((day) => (
        <details
          key={day.dayIndex}
          open
          className="group rounded-2xl border border-zinc-200 bg-white"
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
                  <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10.5px] text-zinc-500">
                    <span className="tabular-nums">
                      <strong className="text-zinc-700">{ex.targetSets}</strong> ×{" "}
                      <strong className="text-zinc-700">{ex.targetReps}</strong> reps
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

      {structure.progressionStrategy && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 px-4 py-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
            📈 Progressão
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-emerald-900">
            {structure.progressionStrategy}
          </p>
        </div>
      )}
    </div>
  );
}

function ProgramDisplay({
  program,
  onGenerateNew,
  onArchive,
}: {
  program: WorkoutProgram;
  onGenerateNew: () => void;
  onArchive: () => void;
}) {
  return (
    <div className="pb-12">
      <Link
        href="/fitness/musculacao"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-500 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar pra musculação
      </Link>

      <header className="mb-5 overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white">
        <div className="px-5 py-5">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-800">
            <Sparkles className="h-3 w-3" />
            Programa ativo
          </div>
          <h2 className="mt-1 text-[22px] font-semibold leading-tight text-zinc-900">
            {program.name}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-zinc-600">
            <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-zinc-200">
              {PROGRAM_GOAL_LABEL[program.goal]}
            </span>
            <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-zinc-200">
              {program.frequencyPerWeek}x/semana
            </span>
            <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-zinc-200">
              {EXPERIENCE_LABEL[program.experienceLevel]}
            </span>
          </div>
          {program.restrictions && (
            <p className="mt-3 inline-flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                <strong>Restrições consideradas:</strong> {program.restrictions}
              </span>
            </p>
          )}
        </div>
      </header>

      <ProgramStructureView structure={program.structure} />

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onArchive}
          className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-[13px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          Arquivar programa
        </button>
        <button
          type="button"
          onClick={onGenerateNew}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 px-5 py-3 text-[14px] font-semibold text-white shadow-sm"
        >
          <RotateCcw className="h-4 w-4" />
          Gerar novo programa
        </button>
      </div>
    </div>
  );
}
