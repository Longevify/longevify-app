import { DietaClient } from "./dieta-client";
import { MOCK_MEALS } from "@/lib/dieta/mock";
import type { MealEntry } from "@/lib/dieta/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Busca as refeicoes do dia do backend.
 * Enquanto feat/dieta-backend esta em flight, retorna mock.
 */
async function fetchTodayMeals(): Promise<MealEntry[]> {
  try {
    // When the backend is live, swap this for a real fetch:
    // const { getUserIdFromCookie } = await import("@/lib/auth/jwt");
    // const { userId, accessToken } = await getUserIdFromCookie();
    // if (!userId) return [];
    // const today = new Date().toISOString().slice(0, 10);
    // const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    // const res = await fetch(`${baseUrl}/api/dieta/meals?date=${today}`, {
    //   headers: { Authorization: `Bearer ${accessToken}` },
    //   cache: "no-store",
    // });
    // if (!res.ok) throw new Error("Backend not ready");
    // return res.json();

    return MOCK_MEALS;
  } catch {
    return MOCK_MEALS;
  }
}

export default async function DietaPage() {
  const meals = await fetchTodayMeals();

  return <DietaClient initialMeals={meals} />;
}
