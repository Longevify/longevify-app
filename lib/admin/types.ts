import type { BiomarkerStatus, ScorePoint } from "@/lib/mock-data";
import type { Product, ProductCategory, ProductBadge } from "@/lib/products";

export type PatientStatus = "ativo" | "onboarding" | "inativo";

export interface AdminPatient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  chronologicalAge: number;
  biologicalAge?: number;
  longevifyScore?: number;
  scoreStatus?: "on-track" | "attention" | "at-risk";
  status: PatientStatus;
  latestExamDate?: string; // ISO
  scoreHistory: ScorePoint[];
  protocol?: string;
  createdAt: string; // ISO
}

export interface PatientInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  chronologicalAge: number;
  status?: PatientStatus;
}

export type ExamStatus = "draft" | "published";

export interface ExamBiomarkerValue {
  biomarkerId: string;
  value: number;
  status: BiomarkerStatus;
}

export interface AdminExam {
  id: string;
  patientId: string;
  patientName: string;
  lab?: string;
  collectionDate: string; // ISO
  fileName?: string;
  status: ExamStatus;
  values: ExamBiomarkerValue[];
  flagged: boolean; // true if any value is "out"
  createdAt: string;
  publishedAt?: string;
}

export interface ExamDraft {
  patientId: string;
  lab?: string;
  collectionDate: string;
  fileName?: string;
  values: ExamBiomarkerValue[];
}

export type AdminProductStatus = "ativo" | "inativo";

export interface AdminProduct extends Product {
  status: AdminProductStatus;
  stock?: number;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  brand: string;
  category: ProductCategory;
  badge?: ProductBadge;
  priceBRL: number;
  shortDescription: string;
  longDescription: string;
  benefits: string[];
  usage: string;
  targetsBiomarkers: string[];
  status: AdminProductStatus;
  stock?: number;
}
