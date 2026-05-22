import { getRunningHistory, getRunningStats } from "@/lib/fitness/server";
import { CorridaClient } from "./corrida-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CorridaPage() {
  const [history, stats] = await Promise.all([
    getRunningHistory(20),
    getRunningStats(),
  ]);

  return <CorridaClient history={history} stats={stats} />;
}
