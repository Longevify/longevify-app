import { NextResponse } from "next/server";
import { ouraConfig } from "@/lib/wearables/oura";
import { whoopConfig } from "@/lib/wearables/whoop";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    oura: { configured: ouraConfig().configured },
    whoop: { configured: whoopConfig().configured },
  });
}
