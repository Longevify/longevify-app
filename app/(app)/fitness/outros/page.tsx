import { getOtherWorkouts, getOtherStats } from "@/lib/fitness/server";
import { OutrosClient } from "./outros-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OutrosPage() {
  const [history, stats] = await Promise.all([
    getOtherWorkouts(30),
    getOtherStats(),
  ]);

  return <OutrosClient history={history} stats={stats} />;
}
