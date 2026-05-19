import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/cron/keep-alive
 *
 * Job de keep-alive pro Supabase free tier — faz um SELECT no banco
 * uma vez por semana pra resetar o contador de inatividade (Supabase
 * pausa projetos free após 7 dias sem queries).
 *
 * Schedulado via vercel.json `crons` toda terça 9h UTC (6h BRT).
 *
 * Lucas (2026-05-18): "coloca o cron job para eu não passar mais por
 * isso". Antes, o projeto pausava de 7 em 7 dias quando ele tava
 * mexendo só em UI sem fazer queries reais — agora não pausa mais.
 *
 * Segurança:
 *   - Vercel cron envia header `Authorization: Bearer $CRON_SECRET`
 *     quando `CRON_SECRET` está setado nas env vars
 *   - Se CRON_SECRET não estiver configurado, aceita qualquer GET
 *     (free tier do Vercel cron já restringe a chamadas internas)
 *
 * Resposta:
 *   { ok: true, profilesCount: N, durationMs: 123, timestamp: ISO }
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }
  }

  const start = Date.now();
  const supabase = getAdminClient();

  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        error: "supabase-not-configured",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  // SELECT COUNT(*) em profiles — query leve, conta como atividade.
  // Bypassa RLS (admin client) então funciona sem auth de user.
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const durationMs = Date.now() - start;

  if (error) {
    console.error("[cron/keep-alive] supabase error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        durationMs,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    pinged: "supabase",
    profilesCount: count,
    durationMs,
    timestamp: new Date().toISOString(),
  });
}
