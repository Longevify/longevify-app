import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/lab-uploads/[id]/parse
 *
 * Extrai biomarcadores de um lab_upload usando Claude vision (suporta
 * PDF nativo + imagens). Cria row em `exams` + inserções em
 * `biomarker_values` matching o catálogo de `biomarker_definitions`.
 *
 * Lucas (2026-05-19): "quando eu anexei meu exame de sangue antigo, os
 * dados não entraram no sistema automaticamente. Use AI para fazer a
 * análise."
 *
 * Pipeline:
 *   1. Carrega lab_upload row + valida ownership
 *   2. Marca status=processing
 *   3. Download do storage → base64
 *   4. Carrega catálogo biomarker_definitions
 *   5. Claude Sonnet 4.6 extrai JSON estruturado
 *   6. Insere exam + biomarker_values
 *   7. Marca status=parsed + linka exam_id + grava parsed_data
 *
 * Idempotente: se já tem exam_id linkado, retorna sem reprocessar
 * (a menos que ?force=1).
 */

interface ParsedBiomarker {
  id: string;
  value: number;
  unit: string;
  /** Nome original como aparece no exame (pra audit). */
  original_label?: string;
}

interface ParsedExam {
  taken_at: string | null; // YYYY-MM-DD
  lab: string | null;
  biomarkers: ParsedBiomarker[];
}

interface BiomarkerDef {
  id: string;
  name: string;
  unit: string;
  optimal_min: number | null;
  optimal_max: number | null;
  normal_min: number | null;
  normal_max: number | null;
}

function computeStatus(
  value: number,
  def: BiomarkerDef,
): "optimal" | "normal" | "out" {
  const { optimal_min, optimal_max, normal_min, normal_max } = def;
  // Dentro do ótimo
  if (
    optimal_min != null &&
    optimal_max != null &&
    value >= optimal_min &&
    value <= optimal_max
  ) {
    return "optimal";
  }
  // Dentro do normal (mas fora do ótimo)
  if (
    normal_min != null &&
    normal_max != null &&
    value >= normal_min &&
    value <= normal_max
  ) {
    return "normal";
  }
  return "out";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "supabase-not-configured" },
      { status: 503 },
    );
  }

  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "no-session-cookie" },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  const supabase = await createSupabaseWithJwt(accessToken);

  // ─── 1. Load upload ─────────────────────────────────────────────────────
  const { data: upload, error: loadErr } = await supabase
    .from("lab_uploads")
    .select(
      "id, patient_id, storage_path, mime_type, file_name, status, exam_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (loadErr || !upload) {
    return NextResponse.json(
      { ok: false, error: "upload-not-found" },
      { status: 404 },
    );
  }

  // Idempotência: já parsed → retorna o exam_id existente
  if (upload.exam_id && !force) {
    return NextResponse.json(
      {
        ok: true,
        already_parsed: true,
        exam_id: upload.exam_id,
        status: upload.status,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // Anthropic suporta application/pdf + image/* nativos
  const mime = upload.mime_type as string;
  const acceptedMimes = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
  ]);
  if (!acceptedMimes.has(mime)) {
    await supabase
      .from("lab_uploads")
      .update({ status: "failed" })
      .eq("id", id);
    return NextResponse.json(
      {
        ok: false,
        error: `mime-not-supported: ${mime}. HEIC/HEIF precisam ser convertidos antes.`,
      },
      { status: 415 },
    );
  }

  // ─── 2. Marca processing ────────────────────────────────────────────────
  await supabase
    .from("lab_uploads")
    .update({ status: "processing" })
    .eq("id", id);

  // ─── 3. Download do storage ─────────────────────────────────────────────
  const { data: blob, error: dlErr } = await supabase.storage
    .from("lab-uploads")
    .download(upload.storage_path as string);

  if (dlErr || !blob) {
    await supabase
      .from("lab_uploads")
      .update({ status: "failed" })
      .eq("id", id);
    return NextResponse.json(
      { ok: false, error: `download: ${dlErr?.message ?? "no blob"}` },
      { status: 500 },
    );
  }

  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  // ─── 4. Catálogo de biomarcadores conhecidos ───────────────────────────
  const { data: definitions, error: defErr } = await supabase
    .from("biomarker_definitions")
    .select("id, name, unit, optimal_min, optimal_max, normal_min, normal_max");

  if (defErr || !definitions) {
    await supabase
      .from("lab_uploads")
      .update({ status: "failed" })
      .eq("id", id);
    return NextResponse.json(
      { ok: false, error: `catalog: ${defErr?.message ?? "no defs"}` },
      { status: 500 },
    );
  }

  const defs = definitions as BiomarkerDef[];
  const catalogLines = defs.map((d) => `${d.id} | ${d.name} | ${d.unit}`).join("\n");

  // ─── 5. Claude extrai estruturado ──────────────────────────────────────
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    await supabase
      .from("lab_uploads")
      .update({ status: "failed" })
      .eq("id", id);
    return NextResponse.json(
      { ok: false, error: "anthropic-not-configured" },
      { status: 503 },
    );
  }

  const prompt = `Você é um sistema de extração de biomarcadores de exames laboratoriais brasileiros.

Sua tarefa: extrair TODOS os biomarcadores quantitativos do documento anexado e retornar em JSON.

CATÁLOGO DE BIOMARCADORES CONHECIDOS (id | nome canônico | unidade esperada):
${catalogLines}

REGRAS:
- Identifique cada biomarcador do exame e mapeie pro \`id\` do catálogo acima.
- Se um biomarcador do exame não estiver no catálogo, OMITA — não invente IDs.
- Use o nome PT-BR ou EN — o catálogo cobre os comuns (LDL, HDL, ApoB, Vitamina D, Hemoglobina, etc.)
- Converta unidades quando necessário (se o exame usar mg/dL e catálogo usar mmol/L, faça a conversão).
- Se o valor estiver fora do esperado (ex: "0,5" pra Vit D), assuma vírgula = decimal brasileiro.
- Identifique a data de coleta (taken_at em YYYY-MM-DD) e nome do laboratório (lab).
- Se a data não estiver clara, retorne null.

Retorne SOMENTE JSON neste schema:
{
  "taken_at": "YYYY-MM-DD" | null,
  "lab": "string" | null,
  "biomarkers": [
    { "id": "ldl", "value": 103.5, "unit": "mg/dL", "original_label": "LDL Colesterol" }
  ]
}

NÃO inclua comentários no JSON. NÃO inclua biomarcadores fora do catálogo. Retorne apenas o objeto.`;

  let parsed: ParsedExam;
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: anthropicKey });

    const isImage = mime.startsWith("image/");
    const content = isImage
      ? [
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: mime as
                | "image/jpeg"
                | "image/png"
                | "image/webp"
                | "image/gif",
              data: base64,
            },
          },
          { type: "text" as const, text: prompt },
        ]
      : [
          {
            type: "document" as const,
            source: {
              type: "base64" as const,
              media_type: "application/pdf" as const,
              data: base64,
            },
          },
          { type: "text" as const, text: prompt },
        ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content }],
    });

    const text = (response.content as Array<{ type: string; text?: string }>)
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");

    // Strip markdown fences se vierem
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = fenced ? fenced[1] : text;
    parsed = JSON.parse(jsonStr) as ParsedExam;
  } catch (err) {
    console.error("[lab-uploads/parse] anthropic falhou:", err);
    await supabase
      .from("lab_uploads")
      .update({ status: "failed" })
      .eq("id", id);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "anthropic-error",
      },
      { status: 500 },
    );
  }

  // Validação básica
  if (!parsed || !Array.isArray(parsed.biomarkers)) {
    await supabase
      .from("lab_uploads")
      .update({ status: "failed" })
      .eq("id", id);
    return NextResponse.json(
      { ok: false, error: "invalid-parse-result" },
      { status: 500 },
    );
  }

  // Filtra biomarcadores válidos (id existe no catálogo + value numérico)
  const defsById = new Map(defs.map((d) => [d.id, d]));
  const validBiomarkers = parsed.biomarkers.filter((b) => {
    if (!b.id || typeof b.value !== "number" || !Number.isFinite(b.value))
      return false;
    return defsById.has(b.id);
  });

  if (validBiomarkers.length === 0) {
    await supabase
      .from("lab_uploads")
      .update({
        status: "failed",
        parsed_data: parsed as unknown as Record<string, unknown>,
      })
      .eq("id", id);
    return NextResponse.json(
      {
        ok: false,
        error: "no-biomarkers-extracted",
        debug: { rawBiomarkers: parsed.biomarkers.length },
      },
      { status: 422 },
    );
  }

  // ─── 6. Insere exam + biomarker_values ─────────────────────────────────
  const takenAt =
    parsed.taken_at && /^\d{4}-\d{2}-\d{2}$/.test(parsed.taken_at)
      ? parsed.taken_at
      : new Date().toISOString().slice(0, 10);

  const { data: examRow, error: examErr } = await supabase
    .from("exams")
    .insert({
      patient_id: userId,
      taken_at: takenAt,
      lab: parsed.lab ?? null,
      pdf_url: upload.storage_path,
      status: "published",
      created_by: userId,
    })
    .select("id")
    .single();

  if (examErr || !examRow) {
    await supabase
      .from("lab_uploads")
      .update({ status: "failed" })
      .eq("id", id);
    return NextResponse.json(
      { ok: false, error: `exam-insert: ${examErr?.message ?? "no row"}` },
      { status: 500 },
    );
  }

  const examId = examRow.id as string;

  // Insere valores (status calculado pelo helper local)
  const values = validBiomarkers.map((b) => {
    const def = defsById.get(b.id)!;
    return {
      exam_id: examId,
      biomarker_id: b.id,
      value: b.value,
      status: computeStatus(b.value, def),
    };
  });

  const { error: valuesErr } = await supabase
    .from("biomarker_values")
    .insert(values);

  if (valuesErr) {
    console.error("[lab-uploads/parse] biomarker_values insert:", valuesErr);
    // Não da rollback — exam ja criado, melhor manter parcial
  }

  // ─── 7. Marca parsed + linka exam ──────────────────────────────────────
  await supabase
    .from("lab_uploads")
    .update({
      status: "parsed",
      exam_id: examId,
      parsed_data: parsed as unknown as Record<string, unknown>,
    })
    .eq("id", id);

  return NextResponse.json(
    {
      ok: true,
      exam_id: examId,
      biomarkers_extracted: validBiomarkers.length,
      raw_biomarkers_found: parsed.biomarkers.length,
      taken_at: takenAt,
      lab: parsed.lab,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
