/**
 * Normaliza phone pra formato uniforme: só dígitos, com country code BR
 * default (55) se 10-11 dígitos sem prefixo.
 *
 * Lucas (2026-05-24): usado em sync de contatos do telefone pra match
 * em profiles.phone.
 *
 * Exemplos:
 *   "(11) 98765-4321"  → "5511987654321"
 *   "+55 21 98765 4321" → "5521987654321"
 *   "11987654321"      → "5511987654321"
 *   "5511987654321"    → "5511987654321"
 *   "+1 415 555 2671"  → "14155552671"
 *
 * Note: separado de social/actions.ts porque arquivo com "use server"
 * não pode exportar funções não-async (regra Next.js).
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null; // muito curto
  // Se já começa com 55 (BR) e tem 12-13 dígitos, ok
  if (digits.length >= 12) return digits;
  // 10-11 dígitos: assume BR sem country code
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  // 8-9 dígitos: pode ser fixo sem DDD — não dá pra inferir, rejeita
  if (digits.length < 10) return null;
  return digits;
}
