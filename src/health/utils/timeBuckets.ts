import { HourlyHealthPayload } from '../models';

/**
 * Formats a Date object to a local ISO 8601 string with timezone offset.
 * Example: 2024-05-15T14:00:00.000+07:00
 */
export const toLocalISOString = (date: Date): string => {
  const tzo = -date.getTimezoneOffset();
  const dif = tzo >= 0 ? '+' : '-';
  const pad = (num: number) => (num < 10 ? '0' : '') + num;

  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    'T' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes()) +
    ':' +
    pad(date.getSeconds()) +
    '.' +
    date.getMilliseconds().toString().padStart(3, '0') +
    dif +
    pad(Math.floor(Math.abs(tzo) / 60)) +
    ':' +
    pad(Math.abs(tzo) % 60)
  );
};

export const getDayBoundaries = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
};

export const createEmptyHourlyBuckets = (): HourlyHealthPayload[] => {
  const buckets: HourlyHealthPayload[] = [];
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < 24; i++) {
    const startDate = new Date(baseDate);
    startDate.setHours(i, 0, 0, 0);
    
    const endDate = new Date(baseDate);
    endDate.setHours(i, 59, 59, 999);

    buckets.push({
      steps: 0,
      activeCalories: 0,
      activeCaloriesUnit: 'kcal',
      distance: 0,
      distanceUnit: 'm',
      startDate: toLocalISOString(startDate),
      endDate: toLocalISOString(endDate),
    });
  }
  
  return buckets;
};

export const getBucketIndex = (startTime: string | number | Date): number => {
  return new Date(startTime).getHours();
};
