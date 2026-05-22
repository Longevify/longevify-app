import { NextResponse } from "next/server";
import { getExerciseCatalog } from "@/lib/fitness/server";
import type {
  EquipmentKind,
  ExperienceLevel,
  ProgramGoal,
  ProgramStructure,
} from "@/lib/fitness/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/fitness/program/generate
 *
 * Lucas (2026-05-21): "teremos a opção de criação de treinos com base
 * em algumas perguntas iniciais"
 *
 * Recebe questionário (objetivo, freq/semana, equipamento, experiência,
 * restrições) + lista de exercícios disponíveis e devolve um programa
 * estruturado (array de dias × array de exercícios).
 *
 * Stateless. O caller (componente client) chama `saveAiWorkoutProgram`
 * server action separadamente pra persistir.
 *
 * Modelo: Claude Sonnet 4.6 — qualidade alta pra raciocínio sobre split,
 * volume e progressão, custo OK (~$0.01/programa).
 */

interface RequestBody {
  goal?: ProgramGoal;
  frequencyPerWeek?: number;
  equipmentAvailable?: EquipmentKind[];
  experienceLevel?: ExperienceLevel;
  restrictions?: string;
}

const GOAL_DESCRIPTIONS: Record<ProgramGoal, string> = {
  hipertrofia: "ganho de massa muscular (6-12 reps, RPE 7-9, volume alto)",
  forca: "força máxima (3-6 reps, RPE 8-10, descanso longo 2-4min)",
  perda_gordura: "perda de gordura com manutenção de massa (8-15 reps, supersérie, RPE 7-9, descanso curto 30-60s)",
  condicionamento: "condicionamento cardiovascular + força funcional (circuitos, AMRAP, 10-20 reps)",
  saude_geral: "saúde geral (volume moderado, 8-12 reps, RPE 6-8, descanso 60-90s)",
};

const EXPERIENCE_GUIDANCE: Record<ExperienceLevel, string> = {
  iniciante:
    "Foco em compostos básicos. Volume baixo (2-3 sets por exercício, 3-4 exercícios por sessão). Evitar exercícios técnicos complexos (snatch, jerk).",
  intermediario:
    "Mix de compostos + isolados. Volume médio (3-4 sets por exercício, 5-7 exercícios por sessão). Pode introduzir variações.",
  avancado:
    "Volume alto e periodização. 4-6 sets em compostos principais, 3-4 em isolados, 6-9 exercícios por sessão. Pode usar técnicas avançadas (dropset, rest-pause).",
};

function buildPrompt(
  body: RequestBody,
  exercises: Array<{
    id: string;
    name: string;
    muscleGroup: string;
    equipment: string | null;
    category: string;
  }>,
): string {
  const goal = body.goal ?? "saude_geral";
  const freq = body.frequencyPerWeek ?? 3;
  const equipment = body.equipmentAvailable?.length
    ? body.equipmentAvailable.join(", ")
    : "todos disponíveis";
  const exp = body.experienceLevel ?? "iniciante";
  const restrictions = body.restrictions?.trim() || "nenhuma";

  // Filtra exercícios pelo equipamento disponível
  const eligibleExercises = body.equipmentAvailable?.length
    ? exercises.filter(
        (e) =>
          !e.equipment ||
          e.equipment === "bodyweight" ||
          body.equipmentAvailable!.includes(e.equipment as EquipmentKind),
      )
    : exercises;

  const exerciseList = eligibleExercises
    .map(
      (e) =>
        `  - ${e.id} | "${e.name}" | ${e.muscleGroup} | ${e.equipment ?? "—"} | ${e.category}`,
    )
    .join("\n");

  return `Você é Dr. Lon, coach de musculação do app Longevify (healthtech brasileira de longevidade). Monte um programa de treino estruturado em PT-BR com base no questionário do usuário.

QUESTIONÁRIO:
- Objetivo: ${goal} — ${GOAL_DESCRIPTIONS[goal]}
- Frequência semanal: ${freq}x/semana
- Equipamento disponível: ${equipment}
- Experiência: ${exp} — ${EXPERIENCE_GUIDANCE[exp]}
- Restrições/lesões: ${restrictions}

CATÁLOGO DE EXERCÍCIOS DISPONÍVEIS (use APENAS exercise_id desta lista):
${exerciseList}

REGRAS:
1. Use APENAS exercise_id da lista acima. NÃO invente exercícios.
2. Crie ${freq} dia(s) de treino — split inteligente baseado em objetivo + frequência.
3. Nomes de dias em PT-BR: "Peito + Tríceps", "Pernas", "Costas + Bíceps", "Treino A", "Full body", etc.
4. Cada exercício tem: target_sets (int), target_reps (string como "8-10" ou "AMRAP"), target_rpe (int 6-10 ou null), rest_seconds (int), notes (curto, opcional).
5. Use o RPE em sets de trabalho (não aquecimento). RPE 7-9 padrão pra hipertrofia, 8-10 pra força.
6. Considere restrições/lesões — se mencionou joelho, evite agachamento livre; se ombro, evite OHP, etc.
7. Inclua warmupNotes (string curta com aquecimento padrão) e progressionStrategy (string curta).
8. NÃO inclua corrida ou cardio aqui — é programa de musculação.
9. Responda APENAS com JSON válido, sem texto antes/depois.

FORMATO DA RESPOSTA (JSON puro):
{
  "name": "Nome do programa (curto, descritivo)",
  "structure": {
    "warmupNotes": "5-10min esteira/bike + 2 sets leves do 1º exercício de cada dia",
    "progressionStrategy": "Aumentar peso quando bater repetições alvo em todos os sets (top set RPE 7).",
    "days": [
      {
        "day_index": 1,
        "name": "Nome do dia",
        "focus": ["chest", "shoulders"],
        "exercises": [
          {
            "exercise_id": "bench_press",
            "target_sets": 4,
            "target_reps": "6-8",
            "target_rpe": 8,
            "rest_seconds": 120,
            "notes": "Foco em força máxima — peito ativo, ombros pra trás"
          }
        ]
      }
    ]
  }
}`;
}

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

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-json" },
      { status: 400 },
    );
  }

  // Validação básica
  if (!body.goal || !body.frequencyPerWeek || !body.experienceLevel) {
    return NextResponse.json(
      { ok: false, error: "missing-fields" },
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

  // Pega catálogo completo pra passar pra IA
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
      messages: [{ role: "user", content: buildPrompt(body, catalog) }],
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

    // Normaliza pra ProgramStructure (snake_case → camelCase)
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
          // Filtra exercise_id inválidos (alucinação da IA)
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

    return NextResponse.json(
      {
        ok: true,
        name: parsed.name,
        structure,
        aiModel: "claude-sonnet-4-6",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[fitness/program/generate]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "anthropic-error",
      },
      { status: 500 },
    );
  }
}
