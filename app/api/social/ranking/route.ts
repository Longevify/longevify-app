import { NextResponse } from "next/server";
import { getRanking } from "@/lib/social/server";
import type { RankingScope, RankingKind } from "@/lib/social/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_SCOPES: RankingScope[] = ["friends", "city", "state", "country"];
const VALID_KINDS: RankingKind[] = [
  "overall",
  "fitness",
  "nutrition",
  "consistency",
  "biomarker",
  "social",
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = (url.searchParams.get("scope") ?? "friends") as RankingScope;
  const kind = (url.searchParams.get("kind") ?? "overall") as RankingKind;
  if (!VALID_SCOPES.includes(scope)) {
    return NextResponse.json(
      { ok: false, error: "invalid-scope" },
      { status: 400 },
    );
  }
  if (!VALID_KINDS.includes(kind)) {
    return NextResponse.json(
      { ok: false, error: "invalid-kind" },
      { status: 400 },
    );
  }
  const ranking = await getRanking(scope, 50, kind);
  return NextResponse.json(
    { ok: true, ranking, kind },
    { headers: { "Cache-Control": "no-store" } },
  );
}
