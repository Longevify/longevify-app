/**
 * Mapping biomarker → nome do suplemento a recomendar na loja.
 * Usado pelo popup de detalhe pra gerar o botão "Comprar X" — leva pro
 * /loja?q=<nome>#produtos.
 *
 * Mesma lógica clínica do `lib/protocolo/tasks.ts` (deduplicação por
 * relação fisiológica primária do biomarcador).
 */
export const BIOMARKER_TO_SUPPLEMENT: Record<string, string> = {
  vitd: "Vitamina D",
  ldl: "Ômega 3",
  apob: "Ômega 3",
  crp: "Ômega 3",
  hba1c: "Magnésio",
  testo: "Zinco",
};

export function findSupplementForBiomarker(
  biomarkerId: string,
): string | undefined {
  return BIOMARKER_TO_SUPPLEMENT[biomarkerId];
}
