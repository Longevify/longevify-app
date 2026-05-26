import { NextResponse } from "next/server";
import {
  getExerciseCatalog,
  getActiveWorkoutProgram,
} from "@/lib/fitness/server";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ProgramStructure } from "@/lib/fitness/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/fitness/program/rotate
 *
 * Lucas (2026-05-26): "por padrão preciso que você varie o treino de 3
 * em 3 meses. Ou seja, olha para o treino criado e faça variações,
 * haja vista que ficar treinando os mesmos exercícios sempre não é o
 * caminho ótimo caso o cara queira hipertrofia".
 *
 * Pega o programa ativo do user, manda pro Claude pedindo variações
 * (mesmos focos musculares, mesmo split frequency, mesmo objetivo —
 * mas EXERCÍCIOS e REP SCHEMES diferentes pra evitar estagnação).
 * Salva o novo como ativo + linka via parent_program_id.
 *
 * Stateless do ponto de vista do client — basta POST sem body. Server
 * busca o programa ativo, gera variação e ativa.
 */

interface ParsedProgramResponse {
  name: string;
  structure: {
    warmupNotes?: string;
    progressionStrategy?: string;
    days: Array<{
      day_index: number;
      name: string;
      focus: string[];
      exercises: Array<{
        exercise_id: string;
        target_sets: number;
        target_reps: string;
        target_rpe: number | null;
        rest_seconds: number;
        notes?: string;
      }>;
    }>;
  };
}

function buildRotationPrompt(
  current: NonNullable<Awaited<ReturnType<typeof getActiveWorkoutProgram>>>,
  exercises: Array<{
    id: string;
    name: string;
    muscleGroup: string;
    equipment: string | null;
    category: string;
  }>,
): string {
  // Filtra exercícios pelo equipamento disponível
  const eligibleExercises = current.equipmentAvailable.length
    ? exercises.filter(
        (e) =>
          !e.equipment ||
          e.equipment === "bodyweight" ||
          current.equipmentAvailable.includes(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            e.equipment as any,
          ),
      )
    : exercises;

  const exerciseList = eligibleExercises
    .map(
      (e) =>
        `  - ${e.id} | "${e.name}" | ${e.muscleGroup} | ${e.equipment ?? "—"} | ${e.category}`,
    )
    .join("\n");

  // Coleta exercícios usados no programa atual pra pedir VARIAÇÃO
  const currentExerciseIds = new Set<string>();
  for (const day of current.structure.days) {
    for (const ex of day.exercises) currentExerciseIds.add(ex.exerciseId);
  }
  const currentExerciseList = Array.from(currentExerciseIds).join(", ");

  // Estrutura atual resumida pra contexto
  const currentSummary = current.structure.days
    .map(
      (d) =>
        `Dia ${d.dayIndex} (${d.name}, focos ${d.focus.join("+")}): ${d.exercises.map((e) => `${e.exerciseId} ${e.targetSets}×${e.targetReps}`).join(", ")}`,
    )
    .join("\n");

  return `Você é Dr. Lon, coach de musculação do Longevify. O usuário completou 3 meses no programa atual e precisa de VARIAÇÃO pra continuar progredindo (princípio de periodização — corpo se adapta a exercícios repetidos).

PROGRAMA ATUAL (rotação #${current.rotationCount}):
- Nome: ${current.name}
- Objetivo: ${current.goal}
- Frequência: ${current.frequencyPerWeek}x/semana
- Experiência: ${current.experienceLevel}
- Equipamento: ${current.equipmentAvailable.join(", ")}
- Restrições: ${current.restrictions ?? "nenhuma"}

ESTRUTURA ATUAL:
${currentSummary}

EXERCÍCIOS USADOS NO ATUAL (TENTE EVITAR REPETIR):
${currentExerciseList}

CATÁLOGO DISPONÍVEL (use APENAS exercise_id desta lista):
${exerciseList}

REGRAS DA ROTAÇÃO:
1. MANTENHA: objetivo (${current.goal}), frequência (${current.frequencyPerWeek}x/sem), nº de dias, focos musculares de cada dia.
2. VARIE PELO MENOS 60% dos exercícios — escolha exercícios DIFERENTES que mirem os mesmos músculos. Exemplos:
   - Era "supino reto barra"? Vire "supino inclinado halteres" ou "supino declinado".
   - Era "agachamento livre"? Vire "front squat" ou "leg press".
   - Era "remada curvada"? Vire "remada sentada" ou "puxada alta".
3. VARIE rep schemes — se o atual usa muito 8-12, mude pra 6-10 ou 10-15. Periodização (semana 1-3 mais reps, 4 deload, etc).
4. MANTENHA exercise_id válidos do catálogo. NÃO invente.
5. Nome do programa novo deve sugerir "fase 2" ou "rotação" (ex: "Hipertrofia — Bloco 2", "Push/Pull/Legs Variação", "Hipertrofia Avançada — Fase ${current.rotationCount + 2}").
6. Se houver restrições/lesões, respeite TODAS.
7. Responda APENAS com JSON válido, sem texto antes/depois.

FORMATO DA RESPOSTA (JSON puro):
{
  "name": "Nome do programa novo",
  "structure": {
    "warmupNotes": "...",
    "progressionStrategy": "...",
    "days": [
      {
        "day_index": 1,
        "name": "Nome do dia",
        "focus": ["chest", "shoulders"],
        "exercises": [
          {
            "exercise_id": "incline_db_press",
            "target_sets": 4,
            "target_reps": "8-10",
            "target_rpe": 8,
            "rest_seconds": 120,
            "notes": "Foco em alongamento na descida"
          }
        ]
      }
    ]
  }
}`;
}

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "supabase-unavailable" },
      { status: 503 },
    );
  }
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) {
    return NextResponse.json(
      { ok: false, error: "Sessão expirou. Recarregue a página." },
      { status: 401 },
    );
  }

  const current = await getActiveWorkoutProgram();
  if (!current) {
    return NextResponse.json(
      { ok: false, error: "Sem programa ativo pra rotacionar" },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "anthropic-not-configured" },
      { status: 503 },
    );
  }

  const catalog = await getExerciseCatalog();
  if (catalog.length === 0) {
    return NextResponse.json(
      { ok: false, error: "no-exercise-catalog" },
      { status: 503 },
    );
  }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [
        { role: "user", content: buildRotationPrompt(current, catalog) },
      ],
    });

    const text = (response.content as Array<{ type: string; text?: string }>)
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");

    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = fenced ? fenced[1] : text;
    const parsed = JSON.parse(jsonStr) as ParsedProgramResponse;

    if (!parsed.name || !parsed.structure?.days?.length) {
      throw new Error("invalid-shape");
    }

    const validExerciseIds = new Set(catalog.map((e) => e.id));
    const structure: ProgramStructure = {
      warmupNotes: parsed.structure.warmupNotes,
      progressionStrategy: parsed.structure.progressionStrategy,
      days: parsed.structure.days.map((d) => ({
        dayIndex: d.day_index,
        name: d.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        focus: (d.focus ?? []) as any[],
        exercises: d.exercises
          .filter((ex) => validExerciseIds.has(ex.exercise_id))
          .map((ex) => ({
            exerciseId: ex.exercise_id,
            targetSets: ex.target_sets,
            targetReps: ex.target_reps,
            targetRpe: ex.target_rpe,
            restSeconds: ex.rest_seconds,
            notes: ex.notes ?? null,
          })),
      })),
    };

    const supabase = await createSupabaseWithJwt(accessToken);

    // Desativa programa anterior
    const { error: deactErr } = await supabase
      .from("workout_programs")
      .update({ active: false })
      .eq("patient_id", userId)
      .eq("active", true);
    if (deactErr) {
      return NextResponse.json(
        {
          ok: false,
          error: `Erro ao desativar programa anterior: ${deactErr.message}`,
        },
        { status: 500 },
      );
    }

    // Insere nova rotação com link pro pai
    const { data: inserted, error: insErr } = await supabase
      .from("workout_programs")
      .insert({
        patient_id: userId,
        name: parsed.name,
        goal: current.goal,
        frequency_per_week: current.frequencyPerWeek,
        equipment_available: current.equipmentAvailable,
        experience_level: current.experienceLevel,
        restrictions: current.restrictions,
        structure,
        ai_model: "claude-sonnet-4-6",
        active: true,
        parent_program_id: current.id,
        rotation_count: current.rotationCount + 1,
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      return NextResponse.json(
        {
          ok: false,
          error: `Erro ao salvar rotação: ${insErr?.message ?? "—"}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        programId: inserted.id as string,
        name: parsed.name,
        structure,
        rotationCount: current.rotationCount + 1,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[fitness/program/rotate]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "anthropic-error",
      },
      { status: 500 },
    );
  }
}
