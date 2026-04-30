"use client";

import { loadIntake } from "@/lib/intake/storage";
import type { DiagnosedCondition } from "@/lib/intake/schema";

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  chronologicalAge: number;
  cpf: string;
  height: number; // cm
  weight: number; // kg
  bloodType: string;
  city: string;
  uf: string;
  occupation: string;
  goals: string;
  conditions: string;
  medications: string;
  allergies: string;
  language: string;
}

const STORAGE_KEY = "longevify.profile.v1";

export function loadProfile(): Partial<ProfileFormData> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<ProfileFormData>;
  } catch {
    return null;
  }
}

export function saveProfile(data: ProfileFormData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota cheia — não trava */
  }
}

const CONDITION_LABEL: Record<DiagnosedCondition, string> = {
  hipertensao: "Hipertensão arterial",
  "diabetes-tipo-2": "Diabetes tipo 2",
  dislipidemia: "Dislipidemia",
  "doenca-cardiaca": "Doença cardíaca",
  avc: "AVC",
  cancer: "Câncer",
  autoimune: "Doença autoimune",
  depressao: "Depressão",
  ansiedade: "Ansiedade",
  "asma-dpoc": "Asma / DPOC",
  "doenca-renal": "Doença renal",
  "doenca-hepatica": "Doença hepática",
  tireoide: "Tireoide",
  nenhuma: "",
  outra: "Outra",
};

/**
 * Pega o que já tem no intake e mapeia pros campos do form de perfil.
 * Usado quando o user logado nunca abriu /perfil ainda — em vez de
 * mostrar tudo vazio, hidratamos com o que ele preencheu no onboarding.
 */
export function profileDefaultsFromIntake(): Partial<ProfileFormData> {
  const intake = loadIntake();
  if (!intake) return {};
  const { identity, medical, goals: g } = intake.data;

  const conditionLabels = (medical.diagnosedConditions || [])
    .map((c) => CONDITION_LABEL[c])
    .filter((s) => s && s.length > 0);
  const conditionsText = medical.hasChronicCondition
    ? medical.chronicConditionDetail?.trim() || conditionLabels.join(", ")
    : conditionLabels.join(", ");

  const allergyParts = [medical.drugAllergies, medical.foodAllergies]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s && s.length > 0));

  const goalParts = [g.primaryGoal, g.freeNote?.trim()]
    .filter((s): s is string => Boolean(s && s.length > 0));

  const fullName = identity.fullName?.trim() || "";
  const [firstName = "", ...rest] = fullName.split(/\s+/);
  const lastName = rest.join(" ");

  return {
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    height: identity.heightCm,
    weight: identity.weightKg,
    city: identity.city,
    uf: identity.state,
    medications: medical.medications,
    conditions: conditionsText || undefined,
    allergies: allergyParts.join("; ") || undefined,
    goals: goalParts.join(" — ") || undefined,
  };
}
