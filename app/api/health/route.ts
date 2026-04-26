import { NextResponse } from "next/server";
import pkg from "@/package.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSet(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET() {
  const providers = {
    kimi: isSet(process.env.KIMI_API_KEY) || isSet(process.env.MOONSHOT_API_KEY),
    anthropic: isSet(process.env.ANTHROPIC_API_KEY),
    openai: isSet(process.env.OPENAI_API_KEY),
    supabase:
      isSet(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      isSet(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    stripe: isSet(process.env.STRIPE_SECRET_KEY),
    oura: isSet(process.env.OURA_CLIENT_ID) && isSet(process.env.OURA_CLIENT_SECRET),
    whoop: isSet(process.env.WHOOP_CLIENT_ID) && isSet(process.env.WHOOP_CLIENT_SECRET),
  };

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: pkg.version,
    providers,
  });
}
