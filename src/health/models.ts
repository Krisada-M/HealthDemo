export enum HealthState {
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  HEALTH_APP_MISSING = 'HEALTH_APP_MISSING',
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
  NO_TRUSTED_DATA = 'NO_TRUSTED_DATA',
  READY = 'READY',
}

export type DashboardMetrics = {
  steps: number;
  activeCaloriesKcal: number;
  distanceMeters: number;
  lastUpdatedISO: string;
};

export type HourlyHealthPayload = {
  steps: number;
  activeCalories: number;
  activeCaloriesUnit: 'kcal';
  distance: number;
  distanceUnit: 'm';
  startDate: string; // ISO 8601 with timezone
  endDate: string;   // ISO 8601 with timezone
};

export interface HealthProvider {
  ensurePermissions(): Promise<HealthState>;
  getDashboardMetrics(): Promise<DashboardMetrics>;
  getTodayHourlyPayload(): Promise<HourlyHealthPayload[]>;
}
