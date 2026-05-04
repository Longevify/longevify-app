/**
 * Health bridge — HealthKit (iOS) + Health Connect (Android)
 * Uses @capacitor-community/health
 */

import { registerPlugin } from '@capacitor/core';

export type HealthDataType =
  | 'steps'
  | 'heart_rate'
  | 'sleep_analysis'
  | 'active_energy_burned'
  | 'body_mass'
  | 'height'
  | 'blood_pressure_systolic'
  | 'blood_pressure_diastolic'
  | 'blood_glucose'
  | 'oxygen_saturation'
  | 'respiratory_rate'
  | 'body_temperature';

export interface HealthSample {
  type: HealthDataType;
  value: number;
  unit: string;
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
  sourceName?: string;
}

export interface HealthQueryOptions {
  types: HealthDataType[];
  startDate: Date;
  endDate: Date;
  limit?: number;
}

export interface HealthPlugin {
  requestAuthorization(options: {
    read: HealthDataType[];
    write: HealthDataType[];
  }): Promise<{ authorized: boolean }>;
  query(options: HealthQueryOptions): Promise<{ data: HealthSample[] }>;
  store(options: {
    type: HealthDataType;
    value: number;
    unit: string;
    startDate: string;
    endDate: string;
  }): Promise<void>;
  isAvailable(): Promise<{ available: boolean }>;
}

const Health = registerPlugin<HealthPlugin>('Health', {
  web: () =>
    import('@capacitor-community/health').then((m) => new m.HealthWeb()),
});

const READ_TYPES: HealthDataType[] = [
  'steps',
  'heart_rate',
  'sleep_analysis',
  'active_energy_burned',
  'body_mass',
  'height',
  'blood_pressure_systolic',
  'blood_pressure_diastolic',
  'blood_glucose',
  'oxygen_saturation',
  'respiratory_rate',
  'body_temperature',
];

const WRITE_TYPES: HealthDataType[] = [
  'body_mass',
  'height',
  'blood_glucose',
];

/**
 * Request HealthKit (iOS) / Health Connect (Android) permissions.
 * Call this before any data access — safe to call multiple times.
 */
export async function requestHealthPermissions(): Promise<boolean> {
  try {
    const { available } = await Health.isAvailable();
    if (!available) {
      console.warn('[Health] Health APIs not available on this device/platform.');
      return false;
    }
    const { authorized } = await Health.requestAuthorization({
      read: READ_TYPES,
      write: WRITE_TYPES,
    });
    return authorized;
  } catch (err) {
    console.error('[Health] requestHealthPermissions failed:', err);
    return false;
  }
}

/**
 * Query health data for the given types and date range.
 * Returns empty array on failure — never throws.
 */
export async function getHealthData(
  types: HealthDataType[],
  startDate: Date,
  endDate: Date,
  limit = 1000,
): Promise<HealthSample[]> {
  try {
    const { data } = await Health.query({ types, startDate, endDate, limit });
    return data;
  } catch (err) {
    console.error('[Health] getHealthData failed:', err);
    return [];
  }
}

/**
 * Write a single health data point.
 * Throws on failure — caller should handle.
 */
export async function writeHealthData(
  type: HealthDataType,
  value: number,
  unit: string,
  date: Date,
): Promise<void> {
  const iso = date.toISOString();
  await Health.store({ type, value, unit, startDate: iso, endDate: iso });
}
