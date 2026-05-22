import {
  getBodyMeasurements,
  computeTrend,
} from "@/lib/fitness/body";
import { MedidasClient } from "./medidas-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Phase 3I — Body composition tracker.
 */
export default async function MedidasPage() {
  const measurements = await getBodyMeasurements(60);

  // Pre-compute trends pra evitar JS no client
  const trends = {
    weight: computeTrend(measurements, "weightKg"),
    bodyFat: computeTrend(measurements, "bodyFatPct"),
    muscle: computeTrend(measurements, "muscleMassKg"),
    waist: computeTrend(measurements, "waistCm"),
  };

  return <MedidasClient measurements={measurements} trends={trends} />;
}
