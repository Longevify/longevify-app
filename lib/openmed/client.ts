/**
 * Medical NLP — OpenMed via self-host + HuggingFace Inference fallback.
 *
 * Pipeline (em ordem de tentativa):
 *
 *   1) PII PT-BR rica (CPF, CEP, RG, FIRSTNAME, LASTNAME, DATEOFBIRTH...)
 *      → OpenMed/OpenMed-PII-Portuguese-SnowflakeMed-Large-568M-v1
 *        — NÃO está em Inference Provider público do HF (mai/2026).
 *        Requer self-host (Mac mini ou Fly.io). Ativa quando
 *        `OPENMED_API_URL` está setado.
 *
 *   2) Disease NER → OpenMed-NER-DiseaseDetect-SuperClinical-434M
 *      (HF Inference ativo, Apache 2.0). Usado se self-host falhar
 *      ou se task é "disease".
 *
 *   3) Drug NER → OpenMed-NER-PharmaDetect-SuperClinical-434M
 *      (HF Inference ativo, Apache 2.0).
 *
 *   4) Fallback PII genérico (multi-idioma) → dslim/bert-base-NER
 *      (PER/ORG/LOC/MISC). Usado quando self-host está down e o
 *      paciente é PT-BR — perde precisão CPF/CEP mas detecta nomes.
 *
 *   5) Fallback medical combinado → blaze999/Medical-NER (HF).
 *      Combina disease+pharma+chemical em 1 chamada.
 *
 * Env vars:
 *   HUGGINGFACE_API_KEY   — token gratuito em huggingface.co/settings/tokens
 *   OPENMED_API_URL       — opcional. Ex.: https://openmed.longevify.com.br
 *   OPENMED_API_TOKEN     — opcional, Bearer auth do self-host
 *
 * Self-host docker em `lib/openmed/docker/` — README com instruções
 * passo a passo pra subir num Mac mini 24/7 via Cloudflare Tunnel.
 */

const HF_BASE = "https://router.huggingface.co/hf-inference/models";

const HF_MODELS = {
  disease: "OpenMed/OpenMed-NER-DiseaseDetect-SuperClinical-434M",
  pharma: "OpenMed/OpenMed-NER-PharmaDetect-SuperClinical-434M",
  /** Fallback combinado (disease+drug+condition) caso OpenMed 434M esteja lento/down. */
  medicalFallback: "blaze999/Medical-NER",
  /** PII multilíngue genérico (PER/ORG/LOC/MISC). */
  piiGeneric: "dslim/bert-base-NER",
} as const;

export type OpenMedTask = "disease" | "pharma" | "pii";

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

function getHfKey(): string | null {
  const k = process.env.HUGGINGFACE_API_KEY?.trim();
  return k || null;
}

function getOpenMedSelfHostUrl(): string | null {
  const u = process.env.OPENMED_API_URL?.trim();
  return u || null;
}

function getOpenMedSelfHostToken(): string | null {
  const t = process.env.OPENMED_API_TOKEN?.trim();
  return t || null;
}

export function isOpenMedConfigured(): boolean {
  // Configurado se tiver HF key (HF Inference) OU self-host URL.
  return Boolean(getHfKey() || getOpenMedSelfHostUrl());
}

export interface OpenMedProvider {
  hfInference: boolean;
  selfHost: boolean;
  selfHostUrl: string | null;
}

export function getProviderStatus(): OpenMedProvider {
  return {
    hfInference: Boolean(getHfKey()),
    selfHost: Boolean(getOpenMedSelfHostUrl()),
    selfHostUrl: getOpenMedSelfHostUrl(),
  };
}

async function hfNer(modelId: string, text: string): Promise<MedicalEntity[]> {
  const apiKey = getHfKey();
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
      console.warn(`[openmed] HF ${modelId} ${res.status}`);
      return [];
    }

    const data = (await res.json()) as HFNerResponse[];
    if (!Array.isArray(data)) return [];

    return data
      .filter(
        (d): d is Required<HFNerResponse> =>
          typeof d.word === "string" &&
          typeof d.entity_group === "string" &&
          typeof d.score === "number" &&
          typeof d.start === "number" &&
          typeof d.end === "number",
      )
      .map((d) => ({
        text: d.word,
        label: d.entity_group.toUpperCase(),
        confidence: d.score,
        start: d.start,
        end: d.end,
      }));
  } catch (err) {
    console.warn(`[openmed] HF error ${modelId}:`, err);
    return [];
  }
}

/**
 * Chama OpenMed FastAPI self-hosted.
 * Endpoints (ver `lib/openmed/docker/app.py`):
 *   POST {OPENMED_API_URL}/pii/extract { text, lang? } -> { entities }
 *   POST {OPENMED_API_URL}/analyze     { text, task }  -> { entities }
 */
async function selfHostNer(
  endpoint: "analyze" | "pii/extract",
  payload: Record<string, unknown>,
): Promise<MedicalEntity[]> {
  const base = getOpenMedSelfHostUrl();
  if (!base) return [];

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getOpenMedSelfHostToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn(`[openmed] self-host ${endpoint} ${res.status}`);
      return [];
    }

    const data = (await res.json()) as { entities?: HFNerResponse[] };
    const list = Array.isArray(data.entities) ? data.entities : [];

    return list
      .filter(
        (d): d is Required<HFNerResponse> =>
          typeof d.word === "string" &&
          typeof d.entity_group === "string" &&
          typeof d.score === "number" &&
          typeof d.start === "number" &&
          typeof d.end === "number",
      )
      .map((d) => ({
        text: d.word,
        label: d.entity_group.toUpperCase(),
        confidence: d.score,
        start: d.start,
        end: d.end,
      }));
  } catch (err) {
    console.warn(`[openmed] self-host error ${endpoint}:`, err);
    return [];
  }
}

export async function extractDiseases(text: string): Promise<MedicalEntity[]> {
  const primary = await hfNer(HF_MODELS.disease, text);
  if (primary.length > 0) return primary;
  const all = await hfNer(HF_MODELS.medicalFallback, text);
  return all.filter((e) =>
    /DISEASE|DISORDER|CONDITION|SYMPTOM/.test(e.label),
  );
}

export async function extractMedications(
  text: string,
): Promise<MedicalEntity[]> {
  const primary = await hfNer(HF_MODELS.pharma, text);
  if (primary.length > 0) return primary;
  const all = await hfNer(HF_MODELS.medicalFallback, text);
  return all.filter((e) =>
    /MEDICATION|DRUG|CHEMICAL|CHEM|PHARMA/.test(e.label),
  );
}

/**
 * PII detection.
 *  - lang="pt" + OPENMED_API_URL setado → OpenMed PT-BR (CPF/CEP/RG/...)
 *  - caso contrário → dslim/bert-base-NER via HF Inference (PER/ORG/LOC/MISC)
 */
export async function extractPII(
  text: string,
  lang: "pt" | "en" = "pt",
): Promise<MedicalEntity[]> {
  if (lang === "pt" && getOpenMedSelfHostUrl()) {
    const richPt = await selfHostNer("pii/extract", { text, lang: "pt" });
    if (richPt.length > 0) return richPt;
  }
  return hfNer(HF_MODELS.piiGeneric, text);
}

export type DeidentifyMethod = "mask" | "remove" | "replace";

export async function deidentify(
  text: string,
  options: { method?: DeidentifyMethod; lang?: "pt" | "en" } = {},
): Promise<{ text: string; entitiesRemoved: MedicalEntity[] }> {
  const method = options.method ?? "mask";
  const entities = await extractPII(text, options.lang ?? "pt");
  if (entities.length === 0) return { text, entitiesRemoved: [] };

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
    FIRSTNAME: "Anônimo",
    LASTNAME: "Anônimo",
    MIDDLENAME: "Anônimo",
    DATEOFBIRTH: "01/01/1900",
    DATE: "01/01/1900",
    TIME: "00:00",
    AGE: "00",
    GENDER: "[GÊNERO]",
    OCCUPATION: "[OCUPAÇÃO]",
    CPF: "000.000.000-00",
    RG: "00.000.000-0",
    SSN: "000-00-0000",
    EMAIL: "anonimo@example.com",
    PHONE: "(00) 00000-0000",
    STREET: "Rua Anônima, 0",
    CITY: "Cidade Anônima",
    STATE: "XX",
    ZIPCODE: "00000-000",
    CEP: "00000-000",
    GPSCOORDINATES: "0.0, 0.0",
    ORGANIZATION: "[ORG]",
    JOBTITLE: "[CARGO]",
    JOBDEPARTMENT: "[DEPARTAMENTO]",
    BANKACCOUNT: "0000-0000-0000",
    CREDITCARD: "0000 0000 0000 0000",
    CVV: "000",
    IBAN: "AA00 0000 0000 0000 0000 00",
    AMOUNT: "R$ 0,00",
    CURRENCY: "BRL",
    PER: "Anônimo Anônimo",
    LOC: "[LOCAL]",
    ORG: "[ORG]",
    MISC: "[***]",
    NAME: "Anônimo Anônimo",
    ADDRESS: "Rua Anônima, 0",
  };
  return map[label] ?? `[${label}]`;
}

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
    tasks.has("pii")
      ? extractPII(text, options.lang ?? "pt")
      : Promise.resolve([]),
  ]);

  return { diseases, medications, pii };
}
