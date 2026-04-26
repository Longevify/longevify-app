import { BIOMARKERS, PATIENT } from "@/lib/mock-data";
import { PRODUCTS } from "@/lib/products";
import { classifyValue, getBiomarkerMeta } from "@/lib/admin/biomarker-catalog";
import type {
  AdminExam,
  AdminPatient,
  AdminProduct,
  ExamDraft,
  PatientInput,
  ProductInput,
} from "@/lib/admin/types";

/**
 * Mock CRUD layer used by `lib/admin/storage.ts`.
 *
 * Esta camada centraliza o read/write em localStorage que antes vivia
 * em `lib/admin/storage.ts`. A ideia é:
 *
 *  - Hoje: o admin chama `lib/admin/storage.ts`, que delega aqui.
 *  - Amanhã (Supabase ligado): podemos criar um par `supabase-mutations.ts`
 *    com a mesma assinatura e o storage decide entre os dois conforme
 *    `isSupabaseConfigured()`.
 *
 * Mantemos a mesma API do storage anterior pra não exigir mudança nas
 * páginas admin existentes (`/admin/exames`, `/admin/pacientes`, etc.).
 */

const NS = {
  patients: "longevify.admin.patients",
  exams: "longevify.admin.exams",
  products: "longevify.admin.products",
  seeded: "longevify.admin.seeded",
} as const;

const isBrowser = () => typeof window !== "undefined";

function uuid(prefix = ""): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const now = Date.now().toString(36);
  return `${prefix}${now}-${rand}`;
}

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // swallow quota / private-mode errors
  }
}

function seedPatients(): AdminPatient[] {
  return [
    {
      id: "pt-joao",
      firstName: PATIENT.firstName,
      lastName: PATIENT.lastName,
      email: "joao.silva@longevify.co",
      phone: "+55 21 99999-0001",
      chronologicalAge: PATIENT.chronologicalAge,
      biologicalAge: PATIENT.biologicalAge,
      longevifyScore: PATIENT.longevifyScore,
      scoreStatus: PATIENT.scoreStatus,
      status: "ativo",
      latestExamDate: PATIENT.latestExamDate,
      scoreHistory: PATIENT.scoreHistory,
      protocol: "Protocolo Metabólico + Cardiovascular",
      createdAt: "2024-02-10T12:00:00.000Z",
    },
    {
      id: "pt-maria",
      firstName: "Maria",
      lastName: "Oliveira",
      email: "maria.oliveira@exemplo.com",
      phone: "+55 21 98877-2233",
      chronologicalAge: 41,
      biologicalAge: 39,
      longevifyScore: 76,
      scoreStatus: "on-track",
      status: "ativo",
      latestExamDate: "2026-02-28",
      scoreHistory: [
        { date: "2025-03-01", score: 68 },
        { date: "2025-09-01", score: 74 },
        { date: "2026-02-01", score: 76 },
      ],
      protocol: "Protocolo Hormonal Feminino",
      createdAt: "2024-06-14T12:00:00.000Z",
    },
    {
      id: "pt-ricardo",
      firstName: "Ricardo",
      lastName: "Menezes",
      email: "ricardo.menezes@exemplo.com",
      phone: "+55 11 97766-4455",
      chronologicalAge: 52,
      biologicalAge: 55,
      longevifyScore: 58,
      scoreStatus: "attention",
      status: "ativo",
      latestExamDate: "2026-03-02",
      scoreHistory: [
        { date: "2025-01-01", score: 52 },
        { date: "2025-07-01", score: 55 },
        { date: "2026-03-01", score: 58 },
      ],
      protocol: "Protocolo Cardiometabólico Intensivo",
      createdAt: "2023-11-02T12:00:00.000Z",
    },
    {
      id: "pt-camila",
      firstName: "Camila",
      lastName: "Rocha",
      email: "camila.rocha@exemplo.com",
      chronologicalAge: 34,
      status: "onboarding",
      scoreHistory: [],
      createdAt: "2026-04-10T12:00:00.000Z",
    },
  ];
}

function seedExams(patients: AdminPatient[]): AdminExam[] {
  const joao = patients.find((p) => p.id === "pt-joao")!;
  const maria = patients.find((p) => p.id === "pt-maria")!;
  const ricardo = patients.find((p) => p.id === "pt-ricardo")!;
  const camila = patients.find((p) => p.id === "pt-camila")!;

  const joaoValues = BIOMARKERS.map((b) => ({
    biomarkerId: b.id,
    value: b.value,
    status: b.status,
  }));

  const ricardoValues = [
    { id: "ldl", value: 168 },
    { id: "apob", value: 118 },
    { id: "hdl", value: 38 },
    { id: "vitd", value: 22 },
    { id: "ferritin", value: 312 },
    { id: "hba1c", value: 6.1 },
    { id: "tsh", value: 3.2 },
    { id: "crp", value: 4.1 },
    { id: "testo", value: 380 },
    { id: "alt", value: 46 },
  ].map((row) => {
    const meta = getBiomarkerMeta(row.id)!;
    return {
      biomarkerId: row.id,
      value: row.value,
      status: classifyValue(meta, row.value),
    };
  });

  return [
    {
      id: "ex-joao-001",
      patientId: joao.id,
      patientName: `${joao.firstName} ${joao.lastName}`,
      lab: "DASA",
      collectionDate: joao.latestExamDate!,
      fileName: "joao_silva_painel_longevity.pdf",
      status: "published",
      values: joaoValues,
      flagged: joaoValues.some((v) => v.status === "out"),
      createdAt: "2026-03-15T10:00:00.000Z",
      publishedAt: "2026-03-17T16:20:00.000Z",
    },
    {
      id: "ex-maria-001",
      patientId: maria.id,
      patientName: `${maria.firstName} ${maria.lastName}`,
      lab: "Fleury",
      collectionDate: maria.latestExamDate!,
      fileName: "maria_oliveira_hormonal.pdf",
      status: "published",
      values: [],
      flagged: false,
      createdAt: "2026-03-01T10:00:00.000Z",
      publishedAt: "2026-03-03T14:00:00.000Z",
    },
    {
      id: "ex-ricardo-001",
      patientId: ricardo.id,
      patientName: `${ricardo.firstName} ${ricardo.lastName}`,
      lab: "Sabin",
      collectionDate: ricardo.latestExamDate!,
      fileName: "ricardo_menezes_cardio.pdf",
      status: "draft",
      values: ricardoValues,
      flagged: ricardoValues.some((v) => v.status === "out"),
      createdAt: "2026-03-03T09:00:00.000Z",
    },
    {
      id: "ex-camila-pending",
      patientId: camila.id,
      patientName: `${camila.firstName} ${camila.lastName}`,
      collectionDate: "2026-04-18",
      status: "draft",
      values: [],
      flagged: false,
      createdAt: "2026-04-18T09:00:00.000Z",
    },
  ];
}

function seedProducts(): AdminProduct[] {
  return PRODUCTS.map((p, idx) => ({
    ...p,
    status: idx === PRODUCTS.length - 1 ? "inativo" : "ativo",
    stock: 50 + (idx * 13) % 200,
    updatedAt: "2026-04-01T10:00:00.000Z",
  }));
}

function ensureSeed(): void {
  if (!isBrowser()) return;
  const already = window.localStorage.getItem(NS.seeded);
  if (already === "1") return;
  const patients = seedPatients();
  const exams = seedExams(patients);
  const products = seedProducts();
  writeJSON(NS.patients, patients);
  writeJSON(NS.exams, exams);
  writeJSON(NS.products, products);
  window.localStorage.setItem(NS.seeded, "1");
}

function getPatientsSync(): AdminPatient[] {
  if (!isBrowser()) return seedPatients();
  ensureSeed();
  return readJSON<AdminPatient[]>(NS.patients, seedPatients());
}

function getExamsSync(): AdminExam[] {
  if (!isBrowser()) return seedExams(seedPatients());
  ensureSeed();
  return readJSON<AdminExam[]>(NS.exams, seedExams(seedPatients()));
}

function getProductsSync(): AdminProduct[] {
  if (!isBrowser()) return seedProducts();
  ensureSeed();
  return readJSON<AdminProduct[]>(NS.products, seedProducts());
}

export interface AdminMutations {
  // Patients
  getPatients(): Promise<AdminPatient[]>;
  getPatient(id: string): Promise<AdminPatient | null>;
  createPatient(input: PatientInput): Promise<AdminPatient>;
  updatePatient(id: string, data: Partial<AdminPatient>): Promise<void>;

  // Exams
  getExams(patientId?: string): Promise<AdminExam[]>;
  createExam(draft: ExamDraft): Promise<AdminExam>;
  publishExam(id: string): Promise<void>;

  // Products
  getProducts(): Promise<AdminProduct[]>;
  createProduct(input: ProductInput): Promise<AdminProduct>;
  updateProduct(id: string, data: Partial<AdminProduct>): Promise<void>;

  // Devtool
  reset(): void;
}

export function createMockAdminMutations(): AdminMutations {
  return {
    async getPatients() {
      return getPatientsSync();
    },
    async getPatient(id) {
      return getPatientsSync().find((p) => p.id === id) ?? null;
    },
    async createPatient(input) {
      const list = getPatientsSync();
      const patient: AdminPatient = {
        id: uuid("pt-"),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email.trim(),
        phone: input.phone?.trim(),
        chronologicalAge: input.chronologicalAge,
        status: input.status ?? "onboarding",
        scoreHistory: [],
        createdAt: new Date().toISOString(),
      };
      writeJSON(NS.patients, [patient, ...list]);
      return patient;
    },
    async updatePatient(id, data) {
      const list = getPatientsSync();
      const next = list.map((p) => (p.id === id ? { ...p, ...data } : p));
      writeJSON(NS.patients, next);
    },

    async getExams(patientId) {
      const list = getExamsSync();
      const sorted = [...list].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
      if (!patientId) return sorted;
      return sorted.filter((e) => e.patientId === patientId);
    },
    async createExam(draft) {
      const patients = getPatientsSync();
      const patient = patients.find((p) => p.id === draft.patientId);
      const patientName = patient
        ? `${patient.firstName} ${patient.lastName}`
        : "Paciente";

      const exam: AdminExam = {
        id: uuid("ex-"),
        patientId: draft.patientId,
        patientName,
        lab: draft.lab,
        collectionDate: draft.collectionDate,
        fileName: draft.fileName,
        status: "draft",
        values: draft.values,
        flagged: draft.values.some((v) => v.status === "out"),
        createdAt: new Date().toISOString(),
      };
      const list = getExamsSync();
      writeJSON(NS.exams, [exam, ...list]);
      return exam;
    },
    async publishExam(id) {
      const list = getExamsSync();
      const publishedAt = new Date().toISOString();
      let published: AdminExam | undefined;
      const next = list.map((e) => {
        if (e.id !== id) return e;
        published = { ...e, status: "published", publishedAt };
        return published;
      });
      writeJSON(NS.exams, next);
      if (!published) return;

      const patients = getPatientsSync();
      const values = published.values;
      const optimalPct =
        values.length === 0
          ? undefined
          : Math.round(
              (values.filter((v) => v.status === "optimal").length /
                values.length) *
                100,
            );
      const nextPatients = patients.map((p) => {
        if (p.id !== published!.patientId) return p;
        return {
          ...p,
          latestExamDate: published!.collectionDate,
          longevifyScore: optimalPct ?? p.longevifyScore,
          scoreHistory:
            optimalPct !== undefined
              ? [
                  ...p.scoreHistory,
                  {
                    date: published!.collectionDate,
                    score: optimalPct,
                  },
                ]
              : p.scoreHistory,
        };
      });
      writeJSON(NS.patients, nextPatients);
    },

    async getProducts() {
      return getProductsSync();
    },
    async createProduct(input) {
      const list = getProductsSync();
      const product: AdminProduct = {
        id: uuid("prod-"),
        name: input.name.trim(),
        brand: input.brand.trim(),
        category: input.category,
        badge: input.badge,
        kicker: (input as { kicker?: string }).kicker ?? "Produto",
        priceBRL: input.priceBRL,
        currency: "BRL",
        shortDescription: input.shortDescription,
        longDescription: input.longDescription,
        benefits: input.benefits,
        usage: input.usage,
        targetsBiomarkers: input.targetsBiomarkers,
        rating: 0,
        reviewsCount: 0,
        status: input.status,
        stock: input.stock,
        updatedAt: new Date().toISOString(),
      };
      writeJSON(NS.products, [product, ...list]);
      return product;
    },
    async updateProduct(id, data) {
      const list = getProductsSync();
      const next = list.map((p) =>
        p.id === id
          ? { ...p, ...data, updatedAt: new Date().toISOString() }
          : p,
      );
      writeJSON(NS.products, next);
    },

    reset() {
      if (!isBrowser()) return;
      window.localStorage.removeItem(NS.seeded);
      window.localStorage.removeItem(NS.patients);
      window.localStorage.removeItem(NS.exams);
      window.localStorage.removeItem(NS.products);
      ensureSeed();
    },
  };
}
