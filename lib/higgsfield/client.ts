import "server-only";

/**
 * Lucas (2026-05-23): integração com Higgsfield pra gerar fotos de
 * produtos da loja Longevify (admin-only).
 *
 * Auth via headers `hf-api-key` + `hf-secret` (formato do SDK oficial).
 * Base URL: https://platform.higgsfield.ai
 *
 * Modelo usado: Soul (text-to-image v1). Schema:
 *   POST /v1/text2image/soul
 *     body: { params: { prompt, width_and_height, quality, batch_size, ... } }
 *     → { id (job_set_id), jobs: [{ id, status, results }] }
 *   GET  /v1/job-sets/{job_set_id}
 *     → mesmo shape com status atualizado
 *
 * Status válidos: queued, in_progress, completed, nsfw, failed, canceled
 *
 * Image URL: jobs[0].results.raw.url
 *
 * Vide: https://github.com/higgsfield-ai/higgsfield-js
 */

const HIGGSFIELD_BASE_URL = "https://platform.higgsfield.ai";

function authHeaders(): Record<string, string> {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  const apiSecret = process.env.HIGGSFIELD_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error(
      "HIGGSFIELD_API_KEY ou HIGGSFIELD_API_SECRET não configurados em .env.local",
    );
  }
  return {
    "hf-api-key": apiKey,
    "hf-secret": apiSecret,
    "Content-Type": "application/json",
  };
}

export type JobStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "nsfw"
  | "failed"
  | "canceled";

export interface Job {
  id: string;
  status: JobStatus;
  results?: {
    raw?: { url: string; type: string };
    min?: { url: string; type: string };
  } | null;
}

export interface JobSet {
  id: string;
  jobs: Job[];
}

/** Resoluções permitidas pelo modelo Soul (vide schema 422 error) */
export type SoulSize =
  | "1152x2048" // 9:16
  | "2048x1152" // 16:9
  | "2048x1536" // 4:3
  | "1536x2048" // 3:4
  | "1344x2016"
  | "2016x1344"
  | "960x1696"
  | "1536x1536" // 1:1
  | "1536x1152"
  | "1696x960"
  | "1152x1536"
  | "1088x1632"
  | "1632x1088"
  | "1120x1680"
  | "1680x1120";

export type SoulQuality = "720p" | "1080p";

/**
 * Mapeia aspect ratio → resolução Soul. Defaults pra 1:1 (square) que é
 * o ideal pra fotos de produto da loja.
 */
export function aspectRatioToSize(aspectRatio: string): SoulSize {
  switch (aspectRatio) {
    case "1:1":
      return "1536x1536";
    case "9:16":
      return "1152x2048";
    case "16:9":
      return "2048x1152";
    case "3:4":
    case "4:5":
      return "1536x2048";
    case "4:3":
      return "2048x1536";
    default:
      return "1536x1536";
  }
}

export interface GenerateImageInput {
  prompt: string;
  /** "1:1" | "16:9" | "9:16" | "3:4" | "4:3" | "4:5" — default 1:1 */
  aspectRatio?: string;
  /** Seed pra reproducibilidade */
  seed?: number;
  /** Quality. Default 1080p (mais caro porém melhor) */
  quality?: SoulQuality;
  /** Batch 1 ou 4. Default 1 */
  batchSize?: 1 | 4;
}

interface SubmitBody {
  params: {
    prompt: string;
    width_and_height: SoulSize;
    quality: SoulQuality;
    batch_size: 1 | 4;
    seed?: number;
  };
}

/**
 * Submete um job de geração de imagem. Não bloqueia — retorna o JobSet
 * (com id) pra polling.
 */
export async function submitImageGeneration(
  input: GenerateImageInput,
): Promise<JobSet> {
  const body: SubmitBody = {
    params: {
      prompt: input.prompt,
      width_and_height: aspectRatioToSize(input.aspectRatio ?? "1:1"),
      quality: input.quality ?? "1080p",
      batch_size: input.batchSize ?? 1,
      ...(input.seed !== undefined ? { seed: input.seed } : {}),
    },
  };

  const url = `${HIGGSFIELD_BASE_URL}/v1/text2image/soul`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 403) {
      throw new Error(
        "Higgsfield: sem créditos na conta. Adicione saldo em platform.higgsfield.ai.",
      );
    }
    throw new Error(
      `Higgsfield POST ${url} falhou: ${res.status} ${res.statusText} — ${text.slice(0, 200)}`,
    );
  }

  return (await res.json()) as JobSet;
}

/**
 * Consulta status do job set. Retorna o JobSet com state atualizado.
 */
export async function pollJobSet(jobSetId: string): Promise<JobSet> {
  const url = `${HIGGSFIELD_BASE_URL}/v1/job-sets/${jobSetId}`;
  const res = await fetch(url, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Higgsfield GET ${url} falhou: ${res.status} ${res.statusText} — ${text.slice(0, 200)}`,
    );
  }
  return (await res.json()) as JobSet;
}

function jobSetTerminal(set: JobSet): boolean {
  return set.jobs.every(
    (j) =>
      j.status === "completed" ||
      j.status === "nsfw" ||
      j.status === "failed" ||
      j.status === "canceled",
  );
}

/**
 * Gera + aguarda — submete o job e faz polling até completar (ou timeout).
 *
 * Timeout default 120s.
 */
export async function generateImageWaiting(
  input: GenerateImageInput,
  opts: { timeoutMs?: number; pollIntervalMs?: number } = {},
): Promise<JobSet> {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const pollIntervalMs = opts.pollIntervalMs ?? 2000;

  const initial = await submitImageGeneration(input);
  if (jobSetTerminal(initial)) return initial;

  const startedAt = Date.now();
  let last = initial;
  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    last = await pollJobSet(initial.id);
    if (jobSetTerminal(last)) return last;
  }
  throw new Error(
    `Higgsfield timeout depois de ${timeoutMs}ms — jobSetId=${initial.id}`,
  );
}

/**
 * Extrai a URL da imagem do job completado (ou null se falhou).
 */
export function imageUrlFromJobSet(set: JobSet): string | null {
  const completed = set.jobs.find((j) => j.status === "completed");
  return completed?.results?.raw?.url ?? null;
}
