import {
  createMockAdminMutations,
  type AdminMutations,
} from "@/lib/data/adapters/mock-mutations";
import type {
  AdminExam,
  AdminPatient,
  AdminProduct,
  ExamDraft,
  PatientInput,
  ProductInput,
} from "./types";

/**
 * Admin storage layer.
 *
 * Refatorado pra delegar pra `lib/data/adapters/mock-mutations.ts`. A API
 * pública (as funções exportadas abaixo) foi preservada bit a bit pra
 * que `app/(admin)/**` continue funcionando sem mudar uma linha.
 *
 * TODO (Wave 3 — Supabase real):
 * Hoje a interface `Repositories` em `lib/data/repositories.ts` é só de
 * leitura (list/getById/stats/...). Pra ter "admin escreve no banco real",
 * o caminho é:
 *   1. Estender `Repositories` com sub-repos `adminPatient`, `adminExam`,
 *      `adminProduct` que carreguem CRUD.
 *   2. Implementar `createSupabaseAdminMutations(supabase)` no padrão deste
 *      arquivo, contra as tabelas reais (`profiles`, `exams`, `products`).
 *   3. Trocar `getMutations()` abaixo pra escolher mock vs supabase com base
 *      em `isSupabaseConfigured()` — análogo a `getServerRepositories`.
 *
 * Não foi feito agora pra evitar regressão: os tipos `AdminPatient/Exam/Product`
 * têm campos extras (`status`, `scoreHistory`, `flagged`, `stock`, ...) que
 * não existem no schema atual de `lib/data/types.ts`, e o admin é client-side
 * (localStorage), enquanto `getServerRepositories` é server-only. Estender
 * isso direito requer um sub-repo de admin novo no `Repositories`.
 */

let cached: AdminMutations | null = null;

function getMutations(): AdminMutations {
  // Mantemos um singleton só pra evitar reinstanciar em cada chamada.
  // Quando Supabase admin estiver pronto, este é o único ponto que muda.
  if (!cached) cached = createMockAdminMutations();
  return cached;
}

export async function getPatients(): Promise<AdminPatient[]> {
  return getMutations().getPatients();
}

export async function getPatient(id: string): Promise<AdminPatient | null> {
  return getMutations().getPatient(id);
}

export async function createPatient(data: PatientInput): Promise<AdminPatient> {
  return getMutations().createPatient(data);
}

export async function updatePatient(
  id: string,
  data: Partial<AdminPatient>,
): Promise<void> {
  return getMutations().updatePatient(id, data);
}

export async function getExams(patientId?: string): Promise<AdminExam[]> {
  return getMutations().getExams(patientId);
}

export async function createExam(draft: ExamDraft): Promise<AdminExam> {
  return getMutations().createExam(draft);
}

export async function publishExam(id: string): Promise<void> {
  return getMutations().publishExam(id);
}

export async function getProducts(): Promise<AdminProduct[]> {
  return getMutations().getProducts();
}

export async function updateProduct(
  id: string,
  data: Partial<AdminProduct>,
): Promise<void> {
  return getMutations().updateProduct(id, data);
}

export async function createProduct(
  input: ProductInput,
): Promise<AdminProduct> {
  return getMutations().createProduct(input);
}

/**
 * Helper público — reseta storage para os seeds, útil em dev/QA.
 * Não chamado automaticamente.
 */
export function resetAdminStorage(): void {
  getMutations().reset();
}
