import type { SupabaseClient } from "@supabase/supabase-js";
import type { Repositories } from "../repositories";
import type {
  Biomarker,
  BiomarkerStats,
  ChatMessage,
  DailyHealthMetrics,
  Goal,
  Patient,
  Product,
  ProductCategory,
  ProductRecommendation,
  WearableDevice,
  WearableBrand,
} from "../types";
import { createMockRepositories } from "./mock";

/**
 * Supabase-backed repositories. For now we still fall back to mock for any
 * query whose data hasn't been seeded yet — this lets the foundation ship
 * without breaking existing pages. As each page migrates, the corresponding
 * method should be swapped to a real query.
 */
export function createSupabaseRepositories(
  supabase: SupabaseClient,
  userId: string | null,
): Repositories {
  const fallback = createMockRepositories();

  return {
    patient: {
      async current(): Promise<Patient> {
        if (!userId) return fallback.patient.current();
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, chronological_age")
          .eq("id", userId)
          .maybeSingle();
        if (error || !data) return fallback.patient.current();
        const base = await fallback.patient.current();
        return {
          ...base,
          firstName: data.first_name ?? base.firstName,
          lastName: data.last_name ?? base.lastName,
          chronologicalAge: data.chronological_age ?? base.chronologicalAge,
        };
      },
    },
    biomarker: {
      async list(): Promise<Biomarker[]> {
        // Catalog comes from biomarker_definitions; actual values per patient
        // live in biomarker_values and should be layered on in a future pass.
        const { data, error } = await supabase
          .from("biomarker_definitions")
          .select("*");
        if (error || !data || data.length === 0) {
          return fallback.biomarker.list();
        }
        const mockById = new Map(
          (await fallback.biomarker.list()).map((b) => [b.id, b]),
        );
        return data.map((row) => {
          const base = mockById.get(row.id);
          return {
            id: row.id,
            name: row.name,
            category: row.category_label,
            categoryId: row.category_id,
            unit: row.unit,
            value: base?.value ?? 0,
            status: base?.status ?? "normal",
            optimalRange:
              row.optimal_min != null && row.optimal_max != null
                ? [Number(row.optimal_min), Number(row.optimal_max)]
                : base?.optimalRange,
            normalRange:
              row.normal_min != null && row.normal_max != null
                ? [Number(row.normal_min), Number(row.normal_max)]
                : base?.normalRange,
            referenceLabel: row.reference_label ?? base?.referenceLabel ?? "",
            history: base?.history ?? [],
            description: row.description ?? base?.description,
          } satisfies Biomarker;
        });
      },
      async getById(id) {
        const list = await this.list();
        return list.find((b) => b.id === id) ?? null;
      },
      async stats(): Promise<BiomarkerStats> {
        return fallback.biomarker.stats();
      },
    },
    exam: {
      async listForPatient(patientId) {
        const { data, error } = await supabase
          .from("exams")
          .select("id, taken_at, lab, status")
          .eq("patient_id", patientId)
          .order("taken_at", { ascending: false });
        if (error || !data) return [];
        return data.map((row) => ({
          id: row.id,
          takenAt: row.taken_at,
          lab: row.lab,
          status: row.status,
        }));
      },
    },
    product: {
      async list(): Promise<Product[]> {
        const { data, error } = await supabase.from("products").select("*");
        if (error || !data || data.length === 0) {
          return fallback.product.list();
        }
        return data.map(mapProduct);
      },
      async getById(id) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error || !data) return fallback.product.getById(id);
        return mapProduct(data);
      },
    },
    wearable: {
      async listDevices(): Promise<WearableDevice[]> {
        if (!userId) return fallback.wearable.listDevices();
        const { data, error } = await supabase
          .from("wearable_connections")
          .select("brand, connected, last_sync_at")
          .eq("patient_id", userId);
        if (error || !data || data.length === 0) {
          return fallback.wearable.listDevices();
        }
        const base = await fallback.wearable.listDevices();
        const byBrand = new Map(data.map((r) => [r.brand as WearableBrand, r]));
        return base.map((device) => {
          const row = byBrand.get(device.brand);
          if (!row) return device;
          return {
            ...device,
            connected: row.connected,
            lastSyncAt: row.last_sync_at ?? device.lastSyncAt,
          };
        });
      },
    },
    goal: {
      async list(): Promise<Goal[]> {
        if (!userId) return fallback.goal.list();
        const { data, error } = await supabase
          .from("goals")
          .select("id, metric_key, target, unit, cadence, label, description")
          .eq("patient_id", userId);
        if (error || !data || data.length === 0) return fallback.goal.list();
        return data.map((row) => ({
          id: row.id,
          metricKey: row.metric_key as Goal["metricKey"],
          target: Number(row.target),
          unit: row.unit,
          cadence: row.cadence as Goal["cadence"],
          label: row.label,
          description: row.description ?? "",
        }));
      },
    },
    metrics: {
      async daily(days): Promise<DailyHealthMetrics[]> {
        if (!userId) return fallback.metrics.daily(days);
        let query = supabase
          .from("daily_health_metrics")
          .select("*")
          .eq("patient_id", userId)
          .order("date", { ascending: true });
        if (days) query = query.limit(days);
        const { data, error } = await query;
        if (error || !data || data.length === 0) {
          return fallback.metrics.daily(days);
        }
        return data.map((row) => ({
          date: row.date,
          sleepMinutes: row.sleep_minutes ?? 0,
          sleepEfficiency: Number(row.sleep_efficiency ?? 0),
          steps: row.steps ?? 0,
          activeMinutes: row.active_minutes ?? 0,
          zone2Minutes: row.zone2_minutes ?? 0,
          restingHR: row.resting_hr ?? 0,
          hrv: Number(row.hrv ?? 0),
          vo2max: row.vo2max != null ? Number(row.vo2max) : undefined,
          caloriesBurned: row.calories_burned ?? 0,
          strain: row.strain != null ? Number(row.strain) : undefined,
        }));
      },
    },
    chat: {
      async history(patientId): Promise<ChatMessage[]> {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("id, role, content, created_at")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: true });
        if (error || !data) return [];
        return data.map((row) => ({
          id: row.id,
          role: row.role as ChatMessage["role"],
          content: row.content,
          createdAt: row.created_at,
        }));
      },
      async append(patientId, msg) {
        const { data, error } = await supabase
          .from("chat_messages")
          .insert({ patient_id: patientId, role: msg.role, content: msg.content })
          .select("id, role, content, created_at")
          .single();
        if (error || !data) throw error ?? new Error("chat.append failed");
        return {
          id: data.id,
          role: data.role as ChatMessage["role"],
          content: data.content,
          createdAt: data.created_at,
        };
      },
    },
    order: {
      async listForPatient(patientId) {
        const { data, error } = await supabase
          .from("orders")
          .select("id, status, total_brl, created_at")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false });
        if (error || !data) return [];
        return data.map((row) => ({
          id: row.id,
          status: row.status,
          totalBrl: Number(row.total_brl),
          createdAt: row.created_at,
        }));
      },
    },
    recommendation: {
      async listForPatient(patientId): Promise<ProductRecommendation[]> {
        const { data, error } = await supabase
          .from("product_recommendations")
          .select("product_id, reason, score")
          .eq("patient_id", patientId)
          .order("score", { ascending: false });
        if (error || !data) return [];
        return data.map((row) => ({
          productId: row.product_id,
          reason: row.reason ?? "",
          score: Number(row.score ?? 0),
        }));
      },
    },
  };
}

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    name: String(row.name),
    brand: String(row.brand),
    category: row.category as ProductCategory,
    badge: (row.badge as Product["badge"]) ?? undefined,
    priceBRL: Number(row.price_brl),
    currency: "BRL",
    shortDescription: String(row.short_description ?? ""),
    longDescription: String(row.long_description ?? ""),
    benefits: Array.isArray(row.benefits) ? (row.benefits as string[]) : [],
    usage: String(row.usage ?? ""),
    targetsBiomarkers: Array.isArray(row.targets_biomarkers)
      ? (row.targets_biomarkers as string[])
      : [],
    rating: Number(row.rating ?? 0),
    reviewsCount: Number(row.reviews_count ?? 0),
    image: (row.image_url as string | undefined) ?? undefined,
  };
}
