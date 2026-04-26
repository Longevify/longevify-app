// Domain types used by every repository. Re-exports existing mock-data types
// so the UI can keep importing through a single surface once migrated.

export type {
  Biomarker,
  BiomarkerCategory,
  BiomarkerPoint,
  BiomarkerStatus,
  CategoryGrade,
  Patient,
  ScorePoint,
} from "@/lib/mock-data";

export type {
  DailyHealthMetrics,
  Goal,
  GoalProgress,
  WearableBrand,
  WearableDevice,
} from "@/lib/wearables-mock";

export type { Product, ProductBadge, ProductCategory } from "@/lib/products";

export interface BiomarkerStats {
  total: number;
  optimal: number;
  normal: number;
  out: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface ProductRecommendation {
  productId: string;
  reason: string;
  score: number;
}
