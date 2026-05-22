export interface SymptomDef {
  id: string;
  label: string;
  emoji?: string;
  /**
   * Quando true + severidade ≥ thresholdSeverity, a UI deve disparar
   * alerta de avaliação médica urgente — NÃO tentar manejar com
   * conteúdo educacional de longevidade. Use `getSymptomRedFlag()`.
   *
   * Threshold default 8 quando flag presente mas thresholdSeverity ausente.
   */
  redFlagAtHighSeverity?: boolean;
  /** Severidade (1-10) a partir da qual aciona alerta. */
  thresholdSeverity?: number;
  /** Mensagem de orientação quando aciona alerta. */
  escalation?: string;
}

export const SYMPTOMS: SymptomDef[] = [
  { id: "fadiga", label: "Fadiga" },
  {
    id: "dor-cabeca",
    label: "Dor de cabeça",
    redFlagAtHighSeverity: true,
    thresholdSeverity: 9,
    escalation:
      "Cefaleia muito intensa, súbita ou diferente do habitual pode ser sinal de emergência (hemorragia subaracnoide, meningite, AVC). Procure pronto-socorro AGORA, especialmente se houver rigidez de nuca, febre, déficit neurológico, vômito persistente ou alteração visual.",
  },
  {
    id: "tontura",
    label: "Tontura",
    redFlagAtHighSeverity: true,
    thresholdSeverity: 8,
    escalation:
      "Tontura intensa com sensação de desmaio, perda de força em um lado, fala arrastada, queda de canto da boca ou perda visual súbita pode ser AVC. Use o protocolo FAST e ligue 192 (SAMU).",
  },
  { id: "insonia", label: "Insônia" },
  {
    id: "ansiedade",
    label: "Ansiedade",
    redFlagAtHighSeverity: true,
    thresholdSeverity: 9,
    escalation:
      "Ansiedade extrema incapacitante ou pensamentos de auto-extermínio merecem atendimento de saúde mental imediato. CVV: 188 (24h gratuito). Em risco iminente, ligue 192 (SAMU) ou vá ao pronto-socorro psiquiátrico.",
  },
  { id: "dor-muscular", label: "Dor muscular" },
  { id: "dor-articular", label: "Dor articular" },
  {
    id: "digestivo",
    label: "Problemas digestivos",
    redFlagAtHighSeverity: true,
    thresholdSeverity: 9,
    escalation:
      "Dor abdominal intensa contínua, vômito persistente, sangue nas fezes ou no vômito, ou febre alta com dor abdominal merecem avaliação médica urgente. Ligue 192 (SAMU) ou procure pronto-socorro.",
  },
  { id: "humor", label: "Alteração de humor" },
  { id: "alergia", label: "Alergia" },
  { id: "libido", label: "Libido baixa" },
  { id: "foco", label: "Falta de foco" },
  {
    id: "taquicardia",
    label: "Taquicardia",
    redFlagAtHighSeverity: true,
    thresholdSeverity: 7,
    escalation:
      "Taquicardia persistente, especialmente com dor torácica, falta de ar, sudorese fria, tontura intensa ou síncope, é red flag cardiovascular. Ligue 192 (SAMU) ou procure pronto-socorro AGORA — pode ser arritmia ou síndrome coronariana aguda.",
  },
];

export interface SymptomReport {
  symptomId: string;
  severity: number; // 1-10
  note?: string;
}

export interface SymptomEntry {
  // dia ISO YYYY-MM-DD (local)
  date: string;
  reports: SymptomReport[];
  createdAt: string; // ISO completo
}

/**
 * Resultado de uma avaliação de red flag de sintoma.
 */
export interface SymptomRedFlagHit {
  symptomId: string;
  symptomLabel: string;
  severity: number;
  escalation: string;
}

/**
 * Avalia uma lista de reports de sintomas e retorna os red flags ativos.
 *
 * Use no UI ANTES de mostrar resultado/análise normal — se houver hit,
 * mostrar bloco vermelho de escalação prioritária com CVV 188 e SAMU 192
 * clicáveis (mesma estratégia do PHQ-9 critical items em
 * `lib/questionnaires/definitions.ts`).
 *
 * Limite default 8/10 quando o sintoma tem flag mas não especifica
 * threshold. Sintomas sem `redFlagAtHighSeverity` nunca disparam.
 */
export function getSymptomRedFlags(
  reports: { symptomId: string; severity: number }[],
): SymptomRedFlagHit[] {
  const hits: SymptomRedFlagHit[] = [];
  for (const r of reports) {
    const def = SYMPTOMS.find((s) => s.id === r.symptomId);
    if (!def?.redFlagAtHighSeverity) continue;
    const threshold = def.thresholdSeverity ?? 8;
    if (r.severity >= threshold && def.escalation) {
      hits.push({
        symptomId: r.symptomId,
        symptomLabel: def.label,
        severity: r.severity,
        escalation: def.escalation,
      });
    }
  }
  return hits;
}

/**
 * Versão para 1 sintoma. Retorna null se não há red flag.
 */
export function getSymptomRedFlag(
  symptomId: string,
  severity: number,
): string | null {
  const def = SYMPTOMS.find((s) => s.id === symptomId);
  if (!def?.redFlagAtHighSeverity) return null;
  const threshold = def.thresholdSeverity ?? 8;
  if (severity >= threshold) return def.escalation ?? null;
  return null;
}
