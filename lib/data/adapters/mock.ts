import {
  BIOMARKERS,
  PATIENT,
  biomarkersStats,
} from "@/lib/mock-data";
import { DAILY_METRICS, DEVICES, GOALS } from "@/lib/wearables-mock";
import { PRODUCTS, getProductById } from "@/lib/products";
import type { Repositories } from "../repositories";
import type { ChatMessage } from "../types";

// In-memory chat log — only meaningful during a single Node process.
// Supabase adapter persists to DB; demo mode keeps things ephemeral.
const chatLog: Map<string, ChatMessage[]> = new Map();

export function createMockRepositories(): Repositories {
  return {
    patient: {
      async current() {
        return PATIENT;
      },
    },
    biomarker: {
      async list() {
        return BIOMARKERS;
      },
      async getById(id) {
        return BIOMARKERS.find((b) => b.id === id) ?? null;
      },
      async stats() {
        return biomarkersStats();
      },
    },
    exam: {
      async listForPatient() {
        return [
          {
            id: "mock-exam-latest",
            takenAt: PATIENT.latestExamDate,
            lab: "Fleury",
            status: "published",
          },
        ];
      },
    },
    product: {
      async list() {
        return PRODUCTS;
      },
      async getById(id) {
        return getProductById(id) ?? null;
      },
    },
    wearable: {
      async listDevices() {
        return DEVICES;
      },
    },
    goal: {
      async list() {
        return GOALS;
      },
    },
    metrics: {
      async daily(days) {
        if (!days) return DAILY_METRICS;
        return DAILY_METRICS.slice(-days);
      },
    },
    chat: {
      async history(patientId) {
        return chatLog.get(patientId) ?? [];
      },
      async append(patientId, msg) {
        const item: ChatMessage = {
          id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: msg.role,
          content: msg.content,
          createdAt: new Date().toISOString(),
        };
        const existing = chatLog.get(patientId) ?? [];
        existing.push(item);
        chatLog.set(patientId, existing);
        return item;
      },
    },
    order: {
      async listForPatient() {
        return [];
      },
    },
    recommendation: {
      async listForPatient() {
        return [];
      },
    },
  };
}
