export type WearableBrand =
  | "apple"
  | "garmin"
  | "oura"
  | "whoop"
  | "fitbit"
  | "withings";

export interface WearableDevice {
  brand: WearableBrand;
  name: string;
  connected: boolean;
  syncStatus?: "live" | "stale" | "error";
  lastSyncAt?: string;
  supported: "v1" | "coming";
}

export interface DailyHealthMetrics {
  date: string;
  sleepMinutes: number;
  sleepEfficiency: number;
  steps: number;
  activeMinutes: number;
  zone2Minutes: number;
  restingHR: number;
  hrv: number;
  vo2max?: number;
  caloriesBurned: number;
  strain?: number;
}

export interface Goal {
  id: string;
  label: string;
  metricKey: keyof DailyHealthMetrics | "zone2Weekly" | "hrvBaseline";
  target: number;
  unit: string;
  cadence: "daily" | "weekly";
  description: string;
}

export interface GoalProgress {
  current: number;
  percent: number;
  status: "on-track" | "attention" | "at-risk";
}

// ---------------------------------------------------------------------------
// mock devices
// ---------------------------------------------------------------------------

export const DEVICES: WearableDevice[] = [
  {
    brand: "apple",
    name: "Apple Watch Series 9",
    connected: true,
    syncStatus: "live",
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    supported: "v1",
  },
  {
    brand: "withings",
    name: "Withings Body Comp",
    connected: false,
    supported: "v1",
  },
  {
    brand: "garmin",
    name: "Garmin Epix Pro",
    connected: false,
    supported: "coming",
  },
  {
    brand: "oura",
    name: "Oura Ring Heritage",
    connected: false,
    supported: "coming",
  },
  {
    brand: "whoop",
    name: "Whoop 4.0",
    connected: false,
    supported: "coming",
  },
  {
    brand: "fitbit",
    name: "Fitbit Charge 6",
    connected: false,
    supported: "coming",
  },
];

// ---------------------------------------------------------------------------
// 30 days of realistic-ish metrics for João — deterministic (seeded)
// ---------------------------------------------------------------------------

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildMetrics(): DailyHealthMetrics[] {
  const rand = seeded(42);
  const out: DailyHealthMetrics[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);

    // slight upward trend on sleep over time
    const trend = (29 - i) / 29;
    const sleepBase = 395 + trend * 25; // ~6h35 -> ~7h00
    const sleepMinutes = Math.round(sleepBase + (rand() - 0.5) * 55);

    const stepsBase = 7200 + trend * 800;
    const steps = Math.max(
      1800,
      Math.round(stepsBase + (rand() - 0.5) * 2200),
    );

    const zone2Minutes = Math.round(
      (rand() > 0.55 ? 22 + rand() * 18 : rand() * 12),
    );
    const activeMinutes = Math.round(28 + rand() * 38);
    const restingHR = Math.round(54 + (rand() - 0.5) * 4);
    const hrv = Math.round(42 + (rand() - 0.5) * 10);
    const sleepEfficiency = Math.round(82 + (rand() - 0.5) * 12);
    const caloriesBurned = Math.round(2350 + (rand() - 0.5) * 420);

    out.push({
      date: iso,
      sleepMinutes,
      sleepEfficiency,
      steps,
      activeMinutes,
      zone2Minutes,
      restingHR,
      hrv,
      vo2max: i === 0 ? 46.5 : undefined,
      caloriesBurned,
      strain: Math.round((10 + rand() * 7) * 10) / 10,
    });
  }
  return out;
}

export const DAILY_METRICS: DailyHealthMetrics[] = buildMetrics();

// ---------------------------------------------------------------------------
// goals
// ---------------------------------------------------------------------------

export const GOALS: Goal[] = [
  {
    id: "sleep-daily",
    label: "Sono diário",
    metricKey: "sleepMinutes",
    target: 450,
    unit: "min",
    cadence: "daily",
    description: "Dormir pelo menos 7h30 por noite em média na última semana.",
  },
  {
    id: "steps-daily",
    label: "Passos por dia",
    metricKey: "steps",
    target: 8000,
    unit: "passos",
    cadence: "daily",
    description: "Manter média de 8.000 passos diários.",
  },
  {
    id: "zone2-weekly",
    label: "Zona 2 semanal",
    metricKey: "zone2Weekly",
    target: 150,
    unit: "min",
    cadence: "weekly",
    description: "Acumular 150 minutos de cardio em zona 2 por semana.",
  },
  {
    id: "hrv-baseline",
    label: "HRV baseline",
    metricKey: "hrvBaseline",
    target: 45,
    unit: "ms",
    cadence: "daily",
    description: "Manter HRV acima de 45ms (rMSSD) na média de 7 dias.",
  },
  {
    id: "vo2max",
    label: "VO2max",
    metricKey: "vo2max",
    target: 45,
    unit: "ml/kg/min",
    cadence: "daily",
    description: "Manter VO2max acima de 45 para longevidade cardiorrespiratória.",
  },
];

// ---------------------------------------------------------------------------
// progress calculation
// ---------------------------------------------------------------------------

export function computeGoalProgress(
  metrics: DailyHealthMetrics[],
  goal: Goal,
): GoalProgress {
  const last7 = metrics.slice(-7);
  let current = 0;

  if (goal.metricKey === "zone2Weekly") {
    current = last7.reduce((s, m) => s + m.zone2Minutes, 0);
  } else if (goal.metricKey === "hrvBaseline") {
    current = last7.length
      ? Math.round(last7.reduce((s, m) => s + m.hrv, 0) / last7.length)
      : 0;
  } else if (goal.metricKey === "vo2max") {
    const latest = [...metrics].reverse().find((m) => typeof m.vo2max === "number");
    current = latest?.vo2max ?? 0;
  } else {
    const key = goal.metricKey as keyof DailyHealthMetrics;
    const values = last7
      .map((m) => m[key])
      .filter((v): v is number => typeof v === "number");
    current = values.length
      ? Math.round(values.reduce((s, v) => s + v, 0) / values.length)
      : 0;
  }

  const percent = Math.max(
    0,
    Math.min(150, Math.round((current / goal.target) * 100)),
  );

  let status: GoalProgress["status"] = "on-track";
  if (percent < 70) status = "at-risk";
  else if (percent < 95) status = "attention";

  return { current, percent, status };
}

// convenience for UI — average of a daily metric on the last N days
export function average(
  metrics: DailyHealthMetrics[],
  key: keyof DailyHealthMetrics,
  days = 7,
): number {
  const slice = metrics.slice(-days);
  const vals = slice
    .map((m) => m[key])
    .filter((v): v is number => typeof v === "number");
  if (!vals.length) return 0;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}
