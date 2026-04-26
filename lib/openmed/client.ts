/**
 * Medical NLP via HuggingFace Inference Providers.
 *
 * Originalmente esse módulo usava OpenMed (github.com/maziyarpanahi/openmed) mas
 * a HF marcou os modelos OpenMed como "deprecated" no provider hf-inference em
 * abr/2026, então caímos pra modelos equivalentes que ainda têm inferência
 * gratuita ativa:
 *
 *  - blaze999/Medical-NER     — disease + medication num único modelo
 *  - dslim/bert-base-NER      — PII genérico (pessoa, organização, local)
 *
 * Pra escalar (tier paga, Português específico), considerar:
 *   - Self-host OpenMed via Docker (Render/Fly.io)
 *   - HF Inference Endpoints dedicados ($)
 *   - AWS Comprehend Medical (PT-BR limitado)
 *
 * Env var necessária:
 *   HUGGINGFACE_API_KEY — token gratuito em huggingface.co/settings/tokens
 */

const HF_BASE = "https://router.huggingface.co/hf-inference/models";

const MODELS = {
  /** blaze999/Medical-NER — retorna entity_group: DISEASE_DISORDER | MEDICATION | etc. */
  medical: "blaze999/Medical-NER",
  /** dslim/bert-base-NER — entity_group: PER | ORG | LOC | MISC */
  pii: "dslim/bert-base-NER",
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

/**
 * Doenças e medicamentos vêm do mesmo modelo (blaze999/Medical-NER).
 * Pra evitar 2 chamadas, fazemos 1 e separamos as entidades por entity_group.
 */
async function extractMedicalCombined(text: string): Promise<{
  diseases: MedicalEntity[];
  medications: MedicalEntity[];
}> {
  const all = await hfNer(MODELS.medical, text);
  const diseases: MedicalEntity[] = [];
  const medications: MedicalEntity[] = [];
  for (const e of all) {
    const lbl = e.label.toUpperCase();
    if (lbl.includes("DISEASE") || lbl.includes("DISORDER") || lbl.includes("CONDITION")) {
      diseases.push(e);
    } else if (lbl.includes("MEDICATION") || lbl.includes("DRUG") || lbl.includes("CHEMICAL")) {
      medications.push(e);
    }
  }
  return { diseases, medications };
}

export async function extractDiseases(text: string): Promise<MedicalEntity[]> {
  const { diseases } = await extractMedicalCombined(text);
  return diseases;
}

export async function extractMedications(
  text: string,
): Promise<MedicalEntity[]> {
  const { medications } = await extractMedicalCombined(text);
  return medications;
}

/**
 * PII detection (genérico). O modelo dslim/bert-base-NER retorna PER/ORG/LOC/MISC.
 * Pra LGPD, foco em PER (nomes) e LOC (endereços/cidades) — ORG geralmente é
 * empresa/instituição, não PII pessoal.
 *
 * Lang param mantido na assinatura por compat — bert-base-NER é multilíngue.
 */
export async function extractPII(
  text: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _lang: "pt" | "en" = "pt",
): Promise<MedicalEntity[]> {
  return hfNer(MODELS.pii, text);
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

  // Disease + medication vêm do mesmo modelo — fazemos 1 chamada se ambos pedidos
  const wantMedical = tasks.has("disease") || tasks.has("pharma");
  const wantPii = tasks.has("pii");

  const [medical, pii] = await Promise.all([
    wantMedical
      ? extractMedicalCombined(text)
      : Promise.resolve({ diseases: [], medications: [] }),
    wantPii ? extractPII(text, options.lang ?? "pt") : Promise.resolve([]),
  ]);

  return {
    diseases: tasks.has("disease") ? medical.diseases : [],
    medications: tasks.has("pharma") ? medical.medications : [],
    pii,
  };
}
