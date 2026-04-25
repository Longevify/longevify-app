// Persistência local dos questionários — substituído por Supabase em Wave 3.

export interface QuestionnaireResult {
  answers: Record<string, number>;
  score: number;
  completedAt: string; // ISO
}

export interface QuestionnaireRecord {
  // estado em andamento (parcial). Pode existir em paralelo ao histórico.
  draft?: { answers: Record<string, number>; updatedAt: string };
  history: QuestionnaireResult[];
}

const KEY = (id: string) => `longevify.questionnaire.${id}`;

function read(id: string): QuestionnaireRecord {
  if (typeof window === "undefined") return { history: [] };
  try {
    const raw = window.localStorage.getItem(KEY(id));
    if (!raw) return { history: [] };
    const parsed = JSON.parse(raw) as QuestionnaireRecord;
    return {
      draft: parsed.draft,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return { history: [] };
  }
}

function write(id: string, data: QuestionnaireRecord) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY(id), JSON.stringify(data));
}

export function loadRecord(id: string): QuestionnaireRecord {
  return read(id);
}

export function saveDraft(id: string, answers: Record<string, number>) {
  const cur = read(id);
  cur.draft = { answers, updatedAt: new Date().toISOString() };
  write(id, cur);
}

export function clearDraft(id: string) {
  const cur = read(id);
  delete cur.draft;
  write(id, cur);
}

export function commitResult(id: string, result: QuestionnaireResult) {
  const cur = read(id);
  cur.history = [result, ...cur.history].slice(0, 12);
  delete cur.draft;
  write(id, cur);
}

export function latestResult(id: string): QuestionnaireResult | undefined {
  return read(id).history[0];
}
