import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import type { RankingScope } from "@/lib/social/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/social/privacy
 *
 * Atualiza flags de consent pra rankings públicos.
 * Body: { scope: 'friends'|'city'|'state'|'country', opt_in: boolean, consent_version?: string }
 *
 * Lucas (2026-05-23): "a pessoa tem que ser notificada que ao entrar em
 * certos rankings ela deve estar ciente que pode compartilhar com o
 * público dados de saúde."
 */
interface Body {
  scope?: RankingScope;
  opt_in?: boolean;
  consent_version?: string;
}

const SCOPE_FIELD: Record<RankingScope, string> = {
  friends: "show_in_friend_ranking",
  city: "show_in_city_ranking",
  state: "show_in_state_ranking",
  country: "show_in_country_ranking",
};

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "supabase-not-configured" },
      { status: 503 },
    );
  }
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) {
    return NextResponse.json({ ok: false, error: "no-session" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  if (!body.scope || !SCOPE_FIELD[body.scope]) {
    return NextResponse.json({ ok: false, error: "invalid-scope" }, { status: 400 });
  }
  if (typeof body.opt_in !== "boolean") {
    return NextResponse.json({ ok: false, error: "opt_in-required" }, { status: 400 });
  }

  const supabase = await createSupabaseWithJwt(accessToken);

  const payload: Record<string, unknown> = {
    patient_id: userId,
    [SCOPE_FIELD[body.scope]]: body.opt_in,
    updated_at: new Date().toISOString(),
  };
  // Marca consent timestamp se opt_in TRUE em escopo público
  if (
    body.opt_in &&
    (body.scope === "city" ||
      body.scope === "state" ||
      body.scope === "country")
  ) {
    payload.consented_at = new Date().toISOString();
    payload.consent_version = body.consent_version ?? "unspecified";
  }

  const { error } = await supabase
    .from("user_social_privacy")
    .upsert(payload, { onConflict: "patient_id" });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
