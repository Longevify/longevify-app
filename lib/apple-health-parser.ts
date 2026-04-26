import { XMLParser } from "fast-xml-parser";
import type { DailyHealthMetrics } from "./wearables-mock";

// NOTE: Apple Health exports (export.xml) são gigantes (centenas de MB).
// Para o MVP aceitamos truncagem: processamos apenas os primeiros 50k Records.
// Num fluxo de produção o parser rodaria em server/worker com streaming.
const MAX_RECORDS = 50_000;

type HKRecord = {
  "@_type"?: string;
  "@_startDate"?: string;
  "@_endDate"?: string;
  "@_value"?: string | number;
  "@_unit"?: string;
};

interface DayAccumulator {
  date: string;
  steps: number;
  sleepMinutes: number;
  sleepInBed: number;
  restingHR: number[];
  hrv: number[];
  vo2max: number[];
  activeMinutes: number;
  caloriesBurned: number;
}

function isoDate(d: string | undefined): string | null {
  if (!d) return null;
  // Apple format: "2025-04-22 07:23:12 -0300"
  const match = d.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function getOrInit(
  map: Map<string, DayAccumulator>,
  date: string,
): DayAccumulator {
  let a = map.get(date);
  if (!a) {
    a = {
      date,
      steps: 0,
      sleepMinutes: 0,
      sleepInBed: 0,
      restingHR: [],
      hrv: [],
      vo2max: [],
      activeMinutes: 0,
      caloriesBurned: 0,
    };
    map.set(date, a);
  }
  return a;
}

function diffMinutes(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 0;
  return Math.round((e - s) / 60000);
}

function finalize(day: DayAccumulator): DailyHealthMetrics {
  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

  const restingHR = Math.round(avg(day.restingHR));
  const hrv = Math.round(avg(day.hrv));
  const vo2maxLatest = day.vo2max.length
    ? +day.vo2max[day.vo2max.length - 1].toFixed(1)
    : undefined;

  const sleepEfficiency = day.sleepInBed
    ? Math.round((day.sleepMinutes / day.sleepInBed) * 100)
    : 0;

  return {
    date: day.date,
    sleepMinutes: day.sleepMinutes,
    sleepEfficiency,
    steps: day.steps,
    activeMinutes: day.activeMinutes,
    zone2Minutes: 0, // Apple Health não expõe zone 2 diretamente
    restingHR,
    hrv,
    vo2max: vo2maxLatest,
    caloriesBurned: Math.round(day.caloriesBurned),
  };
}

export function parseAppleHealthXML(xmlString: string): DailyHealthMetrics[] {
  if (!xmlString || typeof xmlString !== "string") return [];

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      isArray: (name) => name === "Record",
      // defensive: o XML pode ter entidades externas ou tags fora do padrão
      processEntities: false,
    });

    const parsed = parser.parse(xmlString);
    const records: HKRecord[] =
      parsed?.HealthData?.Record ?? parsed?.Record ?? [];
    if (!Array.isArray(records) || records.length === 0) return [];

    const slice = records.slice(0, MAX_RECORDS);
    const byDay = new Map<string, DayAccumulator>();

    for (const rec of slice) {
      const type = rec["@_type"];
      const date = isoDate(rec["@_startDate"]);
      if (!type || !date) continue;

      const valueRaw = rec["@_value"];
      const value =
        typeof valueRaw === "number"
          ? valueRaw
          : typeof valueRaw === "string"
            ? parseFloat(valueRaw)
            : NaN;

      const day = getOrInit(byDay, date);

      switch (type) {
        case "HKQuantityTypeIdentifierStepCount":
          if (!Number.isNaN(value)) day.steps += value;
          break;
        case "HKQuantityTypeIdentifierRestingHeartRate":
          if (!Number.isNaN(value)) day.restingHR.push(value);
          break;
        case "HKQuantityTypeIdentifierHeartRateVariabilitySDNN":
          if (!Number.isNaN(value)) day.hrv.push(value);
          break;
        case "HKQuantityTypeIdentifierVO2Max":
          if (!Number.isNaN(value)) day.vo2max.push(value);
          break;
        case "HKQuantityTypeIdentifierActiveEnergyBurned":
          if (!Number.isNaN(value)) day.caloriesBurned += value;
          break;
        case "HKQuantityTypeIdentifierAppleExerciseTime":
          if (!Number.isNaN(value)) day.activeMinutes += value;
          break;
        case "HKCategoryTypeIdentifierSleepAnalysis": {
          const mins = diffMinutes(rec["@_startDate"], rec["@_endDate"]);
          const val = String(valueRaw ?? "");
          // estados "Asleep*" contam como sono; "InBed" como tempo na cama
          if (val.includes("Asleep")) day.sleepMinutes += mins;
          if (val.includes("InBed") || val.includes("Asleep"))
            day.sleepInBed += mins;
          break;
        }
      }
    }

    const days = Array.from(byDay.values())
      .map(finalize)
      .sort((a, b) => a.date.localeCompare(b.date));

    return days;
  } catch {
    // defensive: XML malformado/vazio => array vazio
    return [];
  }
}
