import type {
  Biomarker,
  BiomarkerStats,
  ChatMessage,
  DailyHealthMetrics,
  Goal,
  Patient,
  Product,
  ProductRecommendation,
  WearableDevice,
} from "./types";

export interface PatientRepo {
  current(): Promise<Patient>;
}

export interface BiomarkerRepo {
  list(): Promise<Biomarker[]>;
  getById(id: string): Promise<Biomarker | null>;
  stats(): Promise<BiomarkerStats>;
}

export interface ExamRepo {
  listForPatient(patientId: string): Promise<
    Array<{ id: string; takenAt: string; lab: string | null; status: string }>
  >;
}

export interface ProductRepo {
  list(): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
}

export interface WearableRepo {
  listDevices(): Promise<WearableDevice[]>;
}

export interface GoalRepo {
  list(): Promise<Goal[]>;
}

export interface MetricsRepo {
  daily(days?: number): Promise<DailyHealthMetrics[]>;
}

export interface ChatRepo {
  history(patientId: string): Promise<ChatMessage[]>;
  append(
    patientId: string,
    msg: Pick<ChatMessage, "role" | "content">,
  ): Promise<ChatMessage>;
}

export interface OrderRepo {
  listForPatient(patientId: string): Promise<
    Array<{ id: string; status: string; totalBrl: number; createdAt: string }>
  >;
}

export interface RecommendationRepo {
  listForPatient(patientId: string): Promise<ProductRecommendation[]>;
}

export interface Repositories {
  patient: PatientRepo;
  biomarker: BiomarkerRepo;
  exam: ExamRepo;
  product: ProductRepo;
  wearable: WearableRepo;
  goal: GoalRepo;
  metrics: MetricsRepo;
  chat: ChatRepo;
  order: OrderRepo;
  recommendation: RecommendationRepo;
}
