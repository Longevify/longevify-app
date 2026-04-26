/**
 * OpenMed NLP médico via HuggingFace Inference API.
 *
 * OpenMed (https://github.com/maziyarpanahi/openmed) — Apache 2.0 — fornece
 * modelos NER especializados em texto clínico. Aqui chamamos via HF Inference
 * em vez de hospedar Python — mantém a infra Next.js limpa.
 *
 * Modelos usados (todos públicos no HF Hub):
 *  - OpenMed/OpenMed-NER-DiseaseDetect-SuperClinical-434M
 *  - OpenMed/OpenMed-NER-PharmaDetect-SuperClinical-434M
 *  - OpenMed/OpenMed-PII-SuperClinical-Small-44M-v1
 *  - OpenMed/OpenMed-PII-Portuguese-SnowflakeMed-Large-568M-v1
 *
 * Env var necessária:
 *   HUGGINGFACE_API_KEY — token gratuito em huggingface.co/settings/tokens
 */

const HF_BASE = "https://api-inference.huggingface.co/models";

const MODELS = {
  disease: "OpenMed/OpenMed-NER-DiseaseDetect-SuperClinical-434M",
  pharma: "OpenMed/OpenMed-NER-PharmaDetect-SuperClinical-434M",
  piiEn: "OpenMed/OpenMed-PII-SuperClinical-Small-44M-v1",
  piiPt: "OpenMed/OpenMed-PII-Portuguese-SnowflakeMed-Large-568M-v1",
} as const;

export type OpenMedTask = "disease" | "pharma" | "pii";

/**
 * Entidade extraída pelo NER. Cada modelo retorna seus próprios `entity_group`
 * (DISEASE, CONDITION, DRUG, NAME, DATE, etc.) — preservamos como label.
 */
export interface MedicalEntity {
  text: string;
  label: string;
  confidence: number;
  start: number;
  end: number;
}

interface HFNerResponse {
  entity_group?: string;
  word?: string;
  score?: number;
  start?: number;
  end?: number;
}

function getApiKey(): string | null {
  const k = process.env.HUGGINGFACE_API_KEY?.trim();
  return k || null;
}

export function isOpenMedConfigured(): boolean {
  return Boolean(getApiKey());
}

/**
 * Chama HF Inference pra um modelo específico.
 * Retorna [] em caso de qualquer erro (degradação graciosa).
 */
async function hfNer(modelId: string, text: string): Promise<MedicalEntity[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const res = await fetch(`${HF_BASE}/${modelId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text,
        parameters: { aggregation_strategy: "simple" },
        options: { wait_for_model: true },
      }),
    });

    if (!res.ok) {
      console.warn(`[openmed] ${modelId} ${res.status}`);
      return [];
    }

    const data = (await res.json()) as HFNerResponse[];
    if (!Array.isArray(data)) return [];

    return data
      .filter((d): d is Required<HFNerResponse> =>
        typeof d.word === "string" &&
        typeof d.entity_group === "string" &&
        typeof d.score === "number" &&
        typeof d.start === "number" &&
        typeof d.end === "number",
      )
      .map((d) => ({
        text: d.word,
        label: d.entity_group,
        confidence: d.score,
        start: d.start,
        end: d.end,
      }));
  } catch (err) {
    console.warn(`[openmed] error calling ${modelId}:`, err);
    return [];
  }
}

export async function extractDiseases(text: string): Promise<MedicalEntity[]> {
  return hfNer(MODELS.disease, text);
}

export async function extractMedications(
  text: string,
): Promise<MedicalEntity[]> {
  return hfNer(MODELS.pharma, text);
}

/**
 * PII detection — usa modelo PT-BR específico se `lang="pt"`, senão small EN.
 */
export async function extractPII(
  text: string,
  lang: "pt" | "en" = "pt",
): Promise<MedicalEntity[]> {
  return hfNer(lang === "pt" ? MODELS.piiPt : MODELS.piiEn, text);
}

export type DeidentifyMethod = "mask" | "remove" | "replace";

/**
 * De-identifica texto usando PII detection + substituição.
 *  - mask:    "[NAME]", "[DATE]", etc.
 *  - remove:  apaga a entidade
 *  - replace: substitui por sintético ("Patient Anonymous" / "01/01/1900")
 */
export async function deidentify(
  text: string,
  options: { method?: DeidentifyMethod; lang?: "pt" | "en" } = {},
): Promise<{ text: string; entitiesRemoved: MedicalEntity[] }> {
  const method = options.method ?? "mask";
  const entities = await extractPII(text, options.lang ?? "pt");
  if (entities.length === 0) return { text, entitiesRemoved: [] };

  // Ordena reverso pra não invalidar offsets ao substituir
  const sorted = [...entities].sort((a, b) => b.start - a.start);
  let result = text;

  for (const e of sorted) {
    let replacement: string;
    switch (method) {
      case "mask":
        replacement = `[${e.label}]`;
        break;
      case "remove":
        replacement = "";
        break;
      case "replace":
        replacement = syntheticReplacement(e.label);
        break;
    }
    result = result.slice(0, e.start) + replacement + result.slice(e.end);
  }

  return { text: result, entitiesRemoved: entities };
}

function syntheticReplacement(label: string): string {
  const map: Record<string, string> = {
    NAME: "Anônimo Anônimo",
    DATE: "01/01/1900",
    SSN: "000-00-0000",
    CPF: "000.000.000-00",
    PHONE: "(00) 00000-0000",
    EMAIL: "anonimo@example.com",
    ADDRESS: "Rua Anônima, 0",
    CEP: "00000-000",
  };
  return map[label] ?? `[${label}]`;
}

/**
 * Extrai todas as categorias clínicas em paralelo.
 * Útil pro endpoint /api/medical-nlp/extract e pro fluxo do admin.
 */
export interface MedicalExtraction {
  diseases: MedicalEntity[];
  medications: MedicalEntity[];
  pii: MedicalEntity[];
}

export async function extractAll(
  text: string,
  options: { lang?: "pt" | "en"; tasks?: OpenMedTask[] } = {},
): Promise<MedicalExtraction> {
  const tasks = new Set<OpenMedTask>(
    options.tasks ?? ["disease", "pharma", "pii"],
  );

  const [diseases, medications, pii] = await Promise.all([
    tasks.has("disease") ? extractDiseases(text) : Promise.resolve([]),
    tasks.has("pharma") ? extractMedications(text) : Promise.resolve([]),
    tasks.has("pii") ? extractPII(text, options.lang ?? "pt") : Promise.resolve([]),
  ]);

  return { diseases, medications, pii };
}
