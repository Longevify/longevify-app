// Normalizadores: convertem responses brutas das APIs (Oura/Whoop) para
// o tipo unificado DailyHealthMetrics consumido pela UI.

import type { DailyHealthMetrics } from "@/lib/wearables-mock";

interface DayAcc {
  date: string;
  sleepMinutes: number;
  sleepInBed: number;
  steps: number;
  activeMinutes: number;
  zone2Minutes: number;
  restingHR: number[];
  hrv: number[];
  caloriesBurned: number;
  vo2max?: number;
  strain?: number;
}

function getDay(map: Map<string, DayAcc>, date: string): DayAcc {
  let d = map.get(date);
  if (!d) {
    d = {
      date,
      sleepMinutes: 0,
      sleepInBed: 0,
      steps: 0,
      activeMinutes: 0,
      zone2Minutes: 0,
      restingHR: [],
      hrv: [],
      caloriesBurned: 0,
    };
    map.set(date, d);
  }
  return d;
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
}

function finalize(d: DayAcc): DailyHealthMetrics {
  return {
    date: d.date,
    sleepMinutes: Math.round(d.sleepMinutes),
    sleepEfficiency: d.sleepInBed
      ? Math.round((d.sleepMinutes / d.sleepInBed) * 100)
      : 0,
    steps: Math.round(d.steps),
    activeMinutes: Math.round(d.activeMinutes),
    zone2Minutes: Math.round(d.zone2Minutes),
    restingHR: avg(d.restingHR),
    hrv: avg(d.hrv),
    vo2max: d.vo2max,
    caloriesBurned: Math.round(d.caloriesBurned),
    strain: d.strain,
  };
}

// ---------------------------------------------------------------------------
// Oura — https://cloud.ouraring.com/v2/docs
// ---------------------------------------------------------------------------

interface OuraResponse {
  daily_sleep?: { data?: OuraDailySleep[] };
  daily_activity?: { data?: OuraDailyActivity[] };
  heartrate?: { data?: OuraHeartRate[] };
}

interface OuraDailySleep {
  day: string;
  contributors?: { total_sleep?: number; efficiency?: number };
  // alguns endpoints retornam métricas dentro de "score" + "contributors"
  total_sleep_duration?: number; // segundos
  time_in_bed?: number; // segundos
  efficiency?: number;
  average_hrv?: number;
  lowest_heart_rate?: number;
}

interface OuraDailyActivity {
  day: string;
  steps?: number;
  active_calories?: number;
  total_calories?: number;
  high_activity_time?: number; // segundos
  medium_activity_time?: number;
  low_activity_time?: number;
}

interface OuraHeartRate {
  timestamp: string;
  bpm: number;
  source?: string;
}

export function normalizeOura(raw: OuraResponse): DailyHealthMetrics[] {
  const map = new Map<string, DayAcc>();

  for (const s of raw.daily_sleep?.data ?? []) {
    const d = getDay(map, s.day);
    if (typeof s.total_sleep_duration === "number")
      d.sleepMinutes += s.total_sleep_duration / 60;
    if (typeof s.time_in_bed === "number") d.sleepInBed += s.time_in_bed / 60;
    if (typeof s.average_hrv === "number") d.hrv.push(s.average_hrv);
    if (typeof s.lowest_heart_rate === "number")
      d.restingHR.push(s.lowest_heart_rate);
  }

  for (const a of raw.daily_activity?.data ?? []) {
    const d = getDay(map, a.day);
    if (typeof a.steps === "number") d.steps += a.steps;
    if (typeof a.active_calories === "number")
      d.caloriesBurned += a.active_calories;
    if (typeof a.medium_activity_time === "number")
      d.activeMinutes += a.medium_activity_time / 60;
    if (typeof a.high_activity_time === "number")
      d.activeMinutes += a.high_activity_time / 60;
    // Aproximação: zone2 ~ medium activity time
    if (typeof a.medium_activity_time === "number")
      d.zone2Minutes += a.medium_activity_time / 60;
  }

  for (const hr of raw.heartrate?.data ?? []) {
    const date = hr.timestamp.slice(0, 10);
    const d = getDay(map, date);
    if (typeof hr.bpm === "number") d.restingHR.push(hr.bpm);
  }

  return Array.from(map.values())
    .map(finalize)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Whoop — https://developer.whoop.com
// ---------------------------------------------------------------------------

interface WhoopResponse {
  recovery?: { records?: WhoopRecovery[] };
  sleep?: { records?: WhoopSleep[] };
  cycle?: { records?: WhoopCycle[] };
  workout?: { records?: WhoopWorkout[] };
}

interface WhoopRecovery {
  created_at: string;
  score?: {
    hrv_rmssd_milli?: number;
    resting_heart_rate?: number;
    recovery_score?: number;
  };
}

interface WhoopSleep {
  start: string;
  end: string;
  score?: {
    stage_summary?: {
      total_in_bed_time_milli?: number;
      total_awake_time_milli?: number;
      total_light_sleep_time_milli?: number;
      total_slow_wave_sleep_time_milli?: number;
      total_rem_sleep_time_milli?: number;
    };
    sleep_efficiency_percentage?: number;
  };
}

interface WhoopCycle {
  start: string;
  end: string;
  score?: {
    strain?: number;
    kilojoule?: number;
    average_heart_rate?: number;
    max_heart_rate?: number;
  };
}

interface WhoopWorkout {
  start: string;
  end: string;
  score?: {
    strain?: number;
    kilojoule?: number;
    zone_duration?: {
      zone_two_milli?: number;
    };
  };
}

export function normalizeWhoop(raw: WhoopResponse): DailyHealthMetrics[] {
  const map = new Map<string, DayAcc>();

  for (const r of raw.recovery?.records ?? []) {
    const date = r.created_at.slice(0, 10);
    const d = getDay(map, date);
    if (typeof r.score?.hrv_rmssd_milli === "number")
      d.hrv.push(r.score.hrv_rmssd_milli);
    if (typeof r.score?.resting_heart_rate === "number")
      d.restingHR.push(r.score.resting_heart_rate);
  }

  for (const s of raw.sleep?.records ?? []) {
    const date = s.start.slice(0, 10);
    const d = getDay(map, date);
    const stage = s.score?.stage_summary;
    if (stage?.total_in_bed_time_milli)
      d.sleepInBed += stage.total_in_bed_time_milli / 60000;
    const slept =
      (stage?.total_light_sleep_time_milli ?? 0) +
      (stage?.total_slow_wave_sleep_time_milli ?? 0) +
      (stage?.total_rem_sleep_time_milli ?? 0);
    if (slept) d.sleepMinutes += slept / 60000;
  }

  for (const c of raw.cycle?.records ?? []) {
    const date = c.start.slice(0, 10);
    const d = getDay(map, date);
    if (typeof c.score?.kilojoule === "number")
      d.caloriesBurned += c.score.kilojoule / 4.184; // kJ -> kcal
    if (typeof c.score?.strain === "number") {
      d.strain = Math.max(d.strain ?? 0, c.score.strain);
    }
  }

  for (const w of raw.workout?.records ?? []) {
    const date = w.start.slice(0, 10);
    const d = getDay(map, date);
    const startMs = new Date(w.start).getTime();
    const endMs = new Date(w.end).getTime();
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs) {
      d.activeMinutes += (endMs - startMs) / 60000;
    }
    if (w.score?.zone_duration?.zone_two_milli)
      d.zone2Minutes += w.score.zone_duration.zone_two_milli / 60000;
  }

  return Array.from(map.values())
    .map(finalize)
    .sort((a, b) => a.date.localeCompare(b.date));
}
