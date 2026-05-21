import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";

/**
 * POST /api/protocolo/task-completion
 * Body: { task_id: string, done: boolean }
 *
 * Toggle de task no protocolo — grava em `task_completions` pra
 * streak tracking real (Lucas 2026-05-20: gameficação real).
 *
 * - done=true: INSERT (idempotente via UNIQUE constraint)
 * - done=false: DELETE da row do dia
 *
 * Fire-and-forget no client: protocolo-client sempre escreve em
 * localStorage (UX otimista), e em paralelo POSTa aqui. Se a request
 * falhar, o user não percebe — só perde o credit do streak.
 *
 * RLS garante isolamento por user — endpoint extrai user_id do JWT.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  task_id?: string;
  done?: boolean;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "supabase-not-configured" },
      { status: 503 },
    );
  }

  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "not-authenticated" },
      { status: 401 },
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-json" },
      { status: 400 },
    );
  }

  const taskId = (body.task_id ?? "").trim();
  if (!taskId || taskId.length > 200) {
    return NextResponse.json(
      { ok: false, error: "invalid-task-id" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseWithJwt(accessToken);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD em UTC

  if (body.done === true) {
    // Insert idempotente: se já existe row pra (patient, task, today),
    // o UNIQUE bate e o on_conflict resolve sem erro.
    const { error } = await supabase
      .from("task_completions")
      .upsert(
        {
          patient_id: userId,
          task_id: taskId,
          completed_date: today,
        },
        { onConflict: "patient_id,task_id,completed_date" },
      );
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, action: "completed" });
  }

  // done=false → deleta a row do dia (se existir)
  const { error } = await supabase
    .from("task_completions")
    .delete()
    .eq("patient_id", userId)
    .eq("task_id", taskId)
    .eq("completed_date", today);
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, action: "uncompleted" });
}
