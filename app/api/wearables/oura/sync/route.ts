import { NextResponse, type NextRequest } from "next/server";
import { fetchOuraLast7Days, ouraConfig } from "@/lib/wearables/oura";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "missing_token" },
      { status: 401 },
    );
  }

  const { configured } = ouraConfig();
  if (!configured) {
    return NextResponse.json(
      { ok: false, error: "oura_not_configured" },
      { status: 503 },
    );
  }

  try {
    const metrics = await fetchOuraLast7Days(token);
    return NextResponse.json({ ok: true, metrics });
  } catch (err) {
    const message = err instanceof Error ? err.message : "sync_failed";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 502 },
    );
  }
}
