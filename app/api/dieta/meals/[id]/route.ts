import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * DELETE /api/dieta/meals/[id]
 *
 * Apaga uma refeição salva. RLS no Supabase garante que só o dono
 * (auth.uid() = patient_id) pode deletar.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "supabase-not-configured" },
      { status: 503 },
    );
  }

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { ok: false, error: "invalid-id" },
      { status: 400 },
    );
  }

  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "no-session-cookie" },
      { status: 401 },
    );
  }

  const supabase = await createSupabaseWithJwt(accessToken);
  const { error } = await supabase
    .from("meal_entries")
    .delete()
    .eq("id", id);
    // RLS já restringe a own rows — não precisa filtrar por patient_id

  if (error) {
    console.error("[meals/DELETE] supabase error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
