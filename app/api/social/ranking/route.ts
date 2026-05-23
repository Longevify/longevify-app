import { NextResponse } from "next/server";
import { getRanking } from "@/lib/social/server";
import type { RankingScope } from "@/lib/social/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_SCOPES: RankingScope[] = ["friends", "city", "state", "country"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = (url.searchParams.get("scope") ?? "friends") as RankingScope;
  if (!VALID_SCOPES.includes(scope)) {
    return NextResponse.json(
      { ok: false, error: "invalid-scope" },
      { status: 400 },
    );
  }
  const ranking = await getRanking(scope, 50);
  return NextResponse.json(
    { ok: true, ranking },
    { headers: { "Cache-Control": "no-store" } },
  );
}
