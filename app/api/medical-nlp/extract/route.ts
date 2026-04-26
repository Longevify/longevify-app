import type { NextRequest } from "next/server";
import {
  extractAll,
  isOpenMedConfigured,
  type OpenMedTask,
} from "@/lib/openmed/client";

export const runtime = "nodejs";

interface ExtractBody {
  text: string;
  tasks?: OpenMedTask[];
  lang?: "pt" | "en";
}

export async function POST(request: NextRequest) {
  let body: ExtractBody;
  try {
    body = (await request.json()) as ExtractBody;
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.text || typeof body.text !== "string") {
    return new Response(
      JSON.stringify({ error: "text is required (string)" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!isOpenMedConfigured()) {
    return new Response(
      JSON.stringify({
        error: "openmed_not_configured",
        message:
          "HUGGINGFACE_API_KEY não foi configurado. Adicione em /vercel envs ou .env.local.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const result = await extractAll(body.text, {
    tasks: body.tasks,
    lang: body.lang ?? "pt",
  });

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  return new Response(
    JSON.stringify({
      status: "ok",
      configured: isOpenMedConfigured(),
      models: {
        disease: "OpenMed/OpenMed-NER-DiseaseDetect-SuperClinical-434M",
        pharma: "OpenMed/OpenMed-NER-PharmaDetect-SuperClinical-434M",
        pii_pt: "OpenMed/OpenMed-PII-Portuguese-SnowflakeMed-Large-568M-v1",
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
