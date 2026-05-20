"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/heic",
  "image/heif",
  "image/webp",
]);

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB — bate com o file_size_limit do bucket

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function extFromMime(mime: string, fileName: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/heic") return "heic";
  if (mime === "image/heif") return "heif";
  if (mime === "image/webp") return "webp";
  // fallback do nome original
  const m = fileName.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "bin";
}

/**
 * Server action que recebe o File via FormData, sobe pro Supabase Storage
 * e cria a row em `lab_uploads`.
 */
export async function uploadLabFile(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase indisponível (modo demo)." };
  }

  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId) return { ok: false, error: "Não autenticado." };

  const supabase = await createSupabaseWithJwt(accessToken);

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Arquivo inválido." };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return {
      ok: false,
      error: `Tipo não suportado (${file.type}). Use PDF, PNG, JPG, HEIC ou WEBP.`,
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `Arquivo muito grande (${Math.round(file.size / 1024 / 1024)} MB). Máximo 20 MB.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, error: "Arquivo vazio." };
  }

  const takenAtRaw = String(formData.get("takenAt") ?? "").trim();
  const labName = String(formData.get("labName") ?? "").trim() || null;
  const examKind = String(formData.get("examKind") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const takenAt =
    takenAtRaw && /^\d{4}-\d{2}-\d{2}$/.test(takenAtRaw) ? takenAtRaw : null;

  // Path: {uid}/{uuid}.{ext} — bate com a Storage policy do bucket.
  const ext = extFromMime(file.type, file.name);
  const objectId = crypto.randomUUID();
  const storagePath = `${userId}/${objectId}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: storageError } = await supabase.storage
    .from("lab-uploads")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (storageError) {
    return { ok: false, error: `Storage: ${storageError.message}` };
  }

  const { data: row, error: dbError } = await supabase
    .from("lab_uploads")
    .insert({
      patient_id: userId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      taken_at: takenAt,
      lab_name: labName,
      exam_kind: examKind,
      notes,
      status: "uploaded",
    })
    .select("id")
    .single();

  if (dbError) {
    // Se o INSERT falhar, tenta limpar o arquivo do storage pra não vazar
    await supabase.storage.from("lab-uploads").remove([storagePath]);
    return { ok: false, error: `DB: ${dbError.message}` };
  }

  const uploadId = row.id as string;

  // Dispara extração AI em background (Lucas 2026-05-19: "use AI para
  // fazer a análise dos exames"). Não bloqueia o upload — se o parse
  // demorar/falhar, o user já tem o arquivo salvo e pode re-tentar.
  triggerLabParse(uploadId).catch((err) => {
    console.warn("[uploadLabFile] parse trigger falhou:", err);
  });

  revalidatePath("/dados");
  return { ok: true, data: { id: uploadId } };
}

/**
 * Dispara a rota /api/lab-uploads/[id]/parse fire-and-forget. Roda no
 * mesmo runtime do server action — não usa fetch externo pra evitar
 * problemas de auth (sem cookie no fetch interno).
 *
 * Importa lazy pra evitar circular se rota mudar.
 */
async function triggerLabParse(
  uploadId: string,
  opts?: { force?: boolean },
): Promise<void> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";
  const root = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;
  const url = `${root}/api/lab-uploads/${uploadId}/parse${opts?.force ? "?force=1" : ""}`;

  // Forward dos cookies do user pra a rota autenticar — server actions
  // têm acesso a cookies via `next/headers`.
  const { cookies: nextCookies } = await import("next/headers");
  const store = await nextCookies();
  const cookieHeader = store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  // Fire-and-forget — não aguarda response pra retornar logo. Mas
  // garante que o request foi enviado (await fetch resolve no header).
  const res = await fetch(url, {
    method: "POST",
    headers: { cookie: cookieHeader },
    // 50s — fica abaixo do maxDuration 60 da rota
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`parse-trigger HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
}

/**
 * Apaga o upload (storage + row). RLS garante que só o dono pode.
 */
export async function deleteLabUpload(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase indisponível." };
  }

  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId) return { ok: false, error: "Não autenticado." };

  const supabase = await createSupabaseWithJwt(accessToken);

  const { data: row } = await supabase
    .from("lab_uploads")
    .select("storage_path, patient_id")
    .eq("id", id)
    .maybeSingle();

  if (!row) return { ok: false, error: "Upload não encontrado." };
  if (row.patient_id !== userId) {
    return { ok: false, error: "Sem permissão." };
  }

  await supabase.storage
    .from("lab-uploads")
    .remove([row.storage_path as string]);

  const { error } = await supabase.from("lab_uploads").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dados");
  return { ok: true };
}

/**
 * Edita os metadados (date, lab name, exam kind, notes).
 */
export async function updateLabUpload(
  id: string,
  patch: {
    takenAt?: string | null;
    labName?: string | null;
    examKind?: string | null;
    notes?: string | null;
  },
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase indisponível." };
  }

  const { accessToken } = await getUserIdFromCookie();
  const supabase = await createSupabaseWithJwt(accessToken);

  const update: Record<string, unknown> = {};
  if ("takenAt" in patch) {
    update.taken_at =
      patch.takenAt && /^\d{4}-\d{2}-\d{2}$/.test(patch.takenAt)
        ? patch.takenAt
        : null;
  }
  if ("labName" in patch) update.lab_name = patch.labName?.trim() || null;
  if ("examKind" in patch) update.exam_kind = patch.examKind?.trim() || null;
  if ("notes" in patch) update.notes = patch.notes?.trim() || null;

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase
    .from("lab_uploads")
    .update(update)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dados");
  return { ok: true };
}

/**
 * Gera URL assinada (1h) pra o user visualizar/baixar o arquivo.
 */
export async function getLabUploadSignedUrl(
  id: string,
): Promise<ActionResult<{ url: string }>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase indisponível." };
  }

  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId) return { ok: false, error: "Não autenticado." };

  const supabase = await createSupabaseWithJwt(accessToken);

  const { data: row } = await supabase
    .from("lab_uploads")
    .select("storage_path, patient_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Upload não encontrado." };
  if (row.patient_id !== userId) {
    return { ok: false, error: "Sem permissão." };
  }

  const { data, error } = await supabase.storage
    .from("lab-uploads")
    .createSignedUrl(row.storage_path as string, 60 * 60);

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Erro ao gerar URL." };
  }
  return { ok: true, data: { url: data.signedUrl } };
}

/**
 * Re-processa o upload com AI (force=1 ignora idempotência). Útil quando:
 *   - Status "failed": user quer re-tentar após erro de parse
 *   - Status "uploaded" travado: trigger automático nunca rodou
 *
 * Retorna o exam_id criado pra UI mostrar confirmação.
 */
export async function reparseLabUpload(
  id: string,
): Promise<
  ActionResult<{
    exam_id: string;
    biomarkers_extracted: number;
  }>
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase indisponível." };
  }
  const { userId } = await getUserIdFromCookie();
  if (!userId) return { ok: false, error: "Não autenticado." };

  try {
    await triggerLabParse(id, { force: true });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao reprocessar",
    };
  }

  // Re-lê pra pegar o exam_id atualizado
  const { accessToken } = await getUserIdFromCookie();
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data: row } = await supabase
    .from("lab_uploads")
    .select("exam_id, status, parsed_data")
    .eq("id", id)
    .maybeSingle();

  if (!row?.exam_id) {
    return { ok: false, error: "Parse não gerou exam_id." };
  }

  // Conta biomarcadores se parsed_data tiver
  const parsed = row.parsed_data as { biomarkers?: unknown[] } | null;
  const count = Array.isArray(parsed?.biomarkers) ? parsed.biomarkers.length : 0;

  revalidatePath("/dados");
  return {
    ok: true,
    data: { exam_id: row.exam_id as string, biomarkers_extracted: count },
  };
}
