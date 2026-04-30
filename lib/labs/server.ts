import "server-only";
import { getServerClient } from "@/lib/supabase/server";

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
 */
export async function listLabUploadsForCurrentUser(): Promise<LabUpload[]> {
  const supabase = await getServerClient();
  if (!supabase) return [];

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return [];

  const { data, error } = await supabase
    .from("lab_uploads")
    .select(
      "id, patient_id, storage_path, file_name, mime_type, size_bytes, taken_at, lab_name, exam_kind, notes, status, extracted_text, parsed_data, exam_id, created_at, updated_at",
    )
    .eq("patient_id", auth.user.id)
    .order("taken_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row) => rowToLabUpload(row as Record<string, unknown>));
}
