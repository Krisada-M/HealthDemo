import HealthKit, {
  QuantityTypeIdentifier,
  QuantitySample
} from '@kingstinct/react-native-healthkit';
import { HealthProvider, HealthState, DashboardMetrics, HourlyHealthPayload } from '../models';
import { createEmptyHourlyBuckets, getDayBoundaries } from '../utils/timeBuckets';
import {
  IngestionRecord,
  HourlyDetail,
  ProviderDebugState
} from './ios/types';
import { distributeSample } from './ios/utils';

export class IosHealthKitProvider implements HealthProvider {
  private debugData: ProviderDebugState | null = null;
  private bypassManualFilter: boolean = false;

  async ensurePermissions(): Promise<HealthState> {
    const isAvailable = HealthKit.isHealthDataAvailable();
    if (!isAvailable) return HealthState.NOT_SUPPORTED;

    const readTypes: QuantityTypeIdentifier[] = [
      'HKQuantityTypeIdentifierStepCount',
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      'HKQuantityTypeIdentifierDistanceWalkingRunning',
    ];

    try {
      const status = await HealthKit.requestAuthorization({ toRead: readTypes, toShare: [] });
      return status ? HealthState.READY : HealthState.NOT_AUTHORIZED;
    } catch (e) {
      console.error('HealthKit Auth Error:', e);
      return HealthState.NOT_AUTHORIZED;
    }
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const hourly = await this.getTodayHourlyPayload();
    const totals = hourly.reduce((acc, curr) => ({
      steps: acc.steps + curr.steps,
      activeCalories: acc.activeCalories + curr.activeCalories,
      distance: acc.distance + curr.distance
    }), { steps: 0, activeCalories: 0, distance: 0 });

    return {
      steps: totals.steps,
      activeCaloriesKcal: totals.activeCalories,
      distanceMeters: totals.distance,
      lastUpdatedISO: new Date().toISOString(),
    };
  }

  async getTodayHourlyPayload(): Promise<HourlyHealthPayload[]> {
    const { start, end } = getDayBoundaries();
    const buckets = createEmptyHourlyBuckets();

    // 1. Setup local state
    const auditLog: IngestionRecord[] = [];
    const hourlyDetails: HourlyDetail[] = buckets.map((_, i) => ({
      hourIndex: i, activeCalories: 0, activeCaloriesSource: "none", isEstimated: false
    }));
    const stats = { read: 0, accepted: 0, rejectedManual: 0 };

    // 2. Query Data
    const [steps, calories, distance] = await Promise.all([
      HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
        limit: -1,
        filter: {
          date: { startDate: start, endDate: end },
        },
      }),
      HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', {
        limit: -1,
        filter: {
          date: { startDate: start, endDate: end },
        },
      }),
      HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierDistanceWalkingRunning', {
        limit: -1,
        filter: {
          date: { startDate: start, endDate: end },
        },
      }),
    ]);

    // 3. Process & Filter
    this.processSamples(steps, 'Steps', 'count', buckets, hourlyDetails, auditLog, stats, 'steps');
    this.processSamples(calories, 'ActiveCal', 'kcal', buckets, hourlyDetails, auditLog, stats, 'activeCalories', (idx) => {
      hourlyDetails[idx].activeCaloriesSource = "activeRecord";
    });
    this.processSamples(distance, 'Distance', 'm', buckets, hourlyDetails, auditLog, stats, 'distance');

    // 4. Store debug state
    this.debugData = { hourly: hourlyDetails, stats, auditLog };

    return buckets;
  }

  private processSamples(
    samples: ReadonlyArray<QuantitySample>,
    typeName: string,
    unit: string,
    buckets: HourlyHealthPayload[],
    details: HourlyDetail[],
    auditLog: IngestionRecord[],
    stats: { read: number; accepted: number; rejectedManual: number },
    bucketKey: keyof HourlyHealthPayload,
    onBucketTouch?: (idx: number) => void
  ) {
    const { start: dayStart } = getDayBoundaries();
    stats.read += samples.length;

    samples.forEach(sample => {
      const isManual = !!sample.metadata?.HKWasUserEntered;
      const origin = sample.sourceRevision?.source?.bundleIdentifier || 'unknown';
      const value = sample.quantity;

      const trusted = !isManual || this.bypassManualFilter;

      auditLog.push({
        type: typeName,
        time: sample.startDate.toLocaleTimeString(),
        value: Number(value.toFixed(1)),
        origin,
        trusted,
        rejectionReason: trusted ? undefined : 'manual_entry',
        rawMetadata: JSON.stringify(sample.metadata || {}, null, 2)
      });

      if (trusted) {
        stats.accepted++;
        distributeSample(sample, buckets, dayStart, value, bucketKey, onBucketTouch);
      } else {
        stats.rejectedManual++;
      }
    });
  }

  // --- Debug Interface ---

  getDebugInfo(): string[] {
    if (!this.debugData) return ["No data fetched yet"];
    const { stats } = this.debugData;
    return [
      `iOS HealthKit: ${stats.accepted}/${stats.read} samples accepted`,
      stats.rejectedManual > 0 ? `⚠️ IGNORED: ${stats.rejectedManual} manual entries (HKWasUserEntered)` : 'No manual entries detected'
    ];
  }

  getDetailedHourlyDebug() { return this.debugData?.hourly || []; }
  getIngestionAuditLog(): IngestionRecord[] { return this.debugData?.auditLog || []; }
  setBypassManualFilter(bypass: boolean) { this.bypassManualFilter = bypass; }
}

