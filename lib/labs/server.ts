import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";

export interface LabUpload {
  id: string;
  patientId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  takenAt: string | null;
  labName: string | null;
  examKind: string | null;
  notes: string | null;
  status: "uploaded" | "processing" | "parsed" | "failed" | "archived";
  extractedText: string | null;
  parsedData: Record<string, unknown> | null;
  examId: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToLabUpload(row: Record<string, unknown>): LabUpload {
  return {
    id: row.id as string,
    patientId: row.patient_id as string,
    storagePath: row.storage_path as string,
    fileName: row.file_name as string,
    mimeType: row.mime_type as string,
    sizeBytes: Number(row.size_bytes ?? 0),
    takenAt: (row.taken_at as string | null) ?? null,
    labName: (row.lab_name as string | null) ?? null,
    examKind: (row.exam_kind as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    status: row.status as LabUpload["status"],
    extractedText: (row.extracted_text as string | null) ?? null,
    parsedData: (row.parsed_data as Record<string, unknown> | null) ?? null,
    examId: (row.exam_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Lista os uploads de exames do user logado, ordenados por takenAt
 * (quando informado) ou createdAt (fallback).
 *
 * Usa JWT helper (zero-auth-supabase) — supabase.auth.getSession()
 * dispara refresh proativo que clear cookies em race.
 */
export async function listLabUploadsForCurrentUser(): Promise<LabUpload[]> {
  if (!isSupabaseConfigured()) return [];

  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId) return [];

  const supabase = await createSupabaseWithJwt(accessToken);

  const { data, error } = await supabase
    .from("lab_uploads")
    .select(
      "id, patient_id, storage_path, file_name, mime_type, size_bytes, taken_at, lab_name, exam_kind, notes, status, extracted_text, parsed_data, exam_id, created_at, updated_at",
    )
    .eq("patient_id", userId)
    .order("taken_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row) => rowToLabUpload(row as Record<string, unknown>));
}
