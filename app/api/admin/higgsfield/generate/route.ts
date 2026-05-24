import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  generateImageWaiting,
  imageUrlFromJobSet,
  type GenerateImageInput,
} from "@/lib/higgsfield/client";

/**
 * Admin-only — gera uma imagem via Higgsfield (modelo Soul) e retorna a
 * URL pública (CDN do Higgsfield). Lucas baixa manualmente e commita em
 * public/marketplace/.
 *
 * Não escreve no FS (Vercel é read-only fora de /tmp).
 *
 * POST body: { prompt: string, aspectRatio?, seed?, quality?, batchSize? }
 * Resp: { url, jobSetId } | { error }
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Apenas admins podem usar essa API." },
      { status: 403 },
    );
  }

  let body: Partial<GenerateImageInput>;
  try {
    body = (await req.json()) as Partial<GenerateImageInput>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body.prompt || body.prompt.trim().length < 4) {
    return NextResponse.json(
      { error: "Prompt obrigatório (mínimo 4 caracteres)." },
      { status: 400 },
    );
  }

  try {
    const jobSet = await generateImageWaiting(
      {
        prompt: body.prompt,
        aspectRatio: body.aspectRatio ?? "1:1",
        seed: body.seed,
        quality: body.quality,
        batchSize: body.batchSize,
      },
      { timeoutMs: 120_000 },
    );

    const failed = jobSet.jobs.find(
      (j) =>
        j.status === "failed" ||
        j.status === "nsfw" ||
        j.status === "canceled",
    );
    if (failed) {
      return NextResponse.json(
        { error: `Geração não completou: status=${failed.status}` },
        { status: 502 },
      );
    }

    const url = imageUrlFromJobSet(jobSet);
    if (!url) {
      return NextResponse.json(
        { error: "Higgsfield retornou sem URL de imagem." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      url,
      jobSetId: jobSet.id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
