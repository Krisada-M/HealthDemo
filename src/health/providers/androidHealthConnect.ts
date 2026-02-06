import {
  initialize,
  requestPermission,
  readRecords,
  getGrantedPermissions
} from 'react-native-health-connect';
import { HealthProvider, HealthState, DashboardMetrics, HourlyHealthPayload } from '../models';
import { createEmptyHourlyBuckets, getDayBoundaries } from '../utils/timeBuckets';
import { validateRecord, RejectionReason } from '../utils/trustedSourcePolicy';
import {
  IngestionRecord,
  HourlyDetail,
  FilteringStats,
  ProviderDebugState
} from './android/types';
import {
  extractValue,
  calculateAverageBmr,
  distributeRecordAcrossBuckets
} from './android/utils';

export class AndroidHealthConnectProvider implements HealthProvider {
  private debugData: ProviderDebugState | null = null;
  private bypassManualFilter: boolean = false;

  constructor() {
    this.debugData = null;
  }


  async ensurePermissions(): Promise<HealthState> {
    try {
      if (!(await initialize())) return HealthState.NOT_SUPPORTED;

      const requestedTypes = ['Steps', 'ActiveCaloriesBurned', 'Distance', 'TotalCaloriesBurned', 'BasalMetabolicRate'];
      const requested = requestedTypes.map(type => ({ accessType: 'read', recordType: type }));

      const granted = await getGrantedPermissions();
      const missing = requested.filter(req => !granted.some(g => (g as any).recordType === req.recordType));

      if (missing.length > 0) {
        await requestPermission(requested as any);
        const finalGranted = await getGrantedPermissions();
        if (finalGranted.length === 0) return HealthState.NOT_AUTHORIZED;
      }

      return HealthState.READY;
    } catch (e) {
      console.error('Health Connect Auth Error:', e);
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

    const auditLog: IngestionRecord[] = [];
    const stats: FilteringStats = this.initStats();
    const hourlyDetails: HourlyDetail[] = buckets.map((_, i) => ({
      hourIndex: i,
      activeCalories: 0,
      activeCaloriesSource: "none",
      isEstimated: true,
      hasActiveRecord: false,
      totalCalories: 0,
      basalUsed: 0
    }));

    const data = await this.fetchAllData(start, end);

    const trusted = {
      steps: this.filterAndTrack(data.steps.records, 'Steps', stats, auditLog),
      distance: this.filterAndTrack(data.distance.records, 'Distance', stats, auditLog),
      active: this.filterAndTrack(data.active.records, 'ActiveCal', stats, auditLog),
      total: this.filterAndTrack(data.total.records, 'TotalCal', stats, auditLog),
      bmr: this.filterAndTrack(data.bmr.records, 'BMR', stats, auditLog),
    };

    const avgBmrKcalDay = calculateAverageBmr(trusted.bmr);

    this.populateMetricsIntoBuckets(buckets, hourlyDetails, trusted);

    const calculationResults = this.applyFallbacks(buckets, hourlyDetails, trusted.total, avgBmrKcalDay);

    this.debugData = {
      hourly: hourlyDetails,
      avgBmrKcalDay,
      stats,
      auditLog,
      ...calculationResults
    };

    return buckets;
  }


  private async fetchAllData(start: Date, end: Date) {
    const timeFilter = { timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() } };
    const bmrStart = new Date(start.getTime() - 30 * 24 * 60 * 60 * 1000);
    const bmrFilter = { timeRangeFilter: { operator: 'between', startTime: bmrStart.toISOString(), endTime: end.toISOString() } };

    const [steps, distance, active, total, bmr] = await Promise.all([
      this.safeRead('Steps', timeFilter),
      this.safeRead('Distance', timeFilter),
      this.safeRead('ActiveCaloriesBurned', timeFilter),
      this.safeRead('TotalCaloriesBurned', timeFilter),
      this.safeRead('BasalMetabolicRate', bmrFilter),
    ]);

    return { steps, distance, active, total, bmr };
  }

  private async safeRead(recordType: any, options: any) {
    try {
      return await readRecords(recordType, options);
    } catch (e) {
      console.warn(`[HealthConnect] Failed to read ${recordType}:`, e);
      return { records: [] };
    }
  }

  private filterAndTrack<T extends { metadata?: any }>(records: T[], typeName: string, stats: FilteringStats, auditLog: IngestionRecord[]): T[] {
    stats.recordsRead += records.length;
    if (!stats.perType[typeName]) stats.perType[typeName] = { read: 0, accepted: 0 };
    stats.perType[typeName].read += records.length;

    return records.filter(r => {
      const validation = validateRecord(r, this.bypassManualFilter);
      const originPackage = r.metadata?.dataOrigin || "unknown";
      const startTimeRaw = (r as any).startTime || (r as any).time;

      let timeLabel = "unknown";
      if (startTimeRaw) {
        const d = new Date(startTimeRaw);
        if (!isNaN(d.getTime())) {
          timeLabel = d.toLocaleTimeString();
        } else {
          timeLabel = `Err: ${startTimeRaw}`;
        }
      }

      const value = extractValue(r);

      auditLog.push({
        type: typeName,
        time: timeLabel,
        value: Number(value.toFixed(1)),
        origin: originPackage,
        trusted: validation.trusted,
        recordingMethod: r.metadata?.recordingMethod,
        rejectionReason: validation.trusted ? undefined : validation.reason,
        rawMetadata: JSON.stringify(r.metadata || {}, null, 2),
        device: r.metadata?.device ? `${r.metadata.device.manufacturer} ${r.metadata.device.model}` : undefined
      });

      if (validation.trusted) {
        stats.recordsAccepted++;
        stats.perType[typeName].accepted++;
        return true;
      } else {
        const reason = validation.reason as RejectionReason;
        stats.rejectedByReason[reason] = (stats.rejectedByReason[reason] || 0) + 1;
        return false;
      }
    });
  }

  private populateMetricsIntoBuckets(buckets: HourlyHealthPayload[], details: HourlyDetail[], trusted: any) {
    const { start: dayStart } = getDayBoundaries();

    trusted.steps.forEach((r: any) => {
      distributeRecordAcrossBuckets(r, buckets, dayStart, (rec) => rec.count, 'steps');
    });

    trusted.distance.forEach((r: any) => {
      distributeRecordAcrossBuckets(r, buckets, dayStart, (rec) => rec.distance.inMeters, 'distance');
    });

    trusted.active.forEach((r: any) => {
      distributeRecordAcrossBuckets(r, buckets, dayStart, (rec) => rec.energy.inKilocalories, 'activeCalories', (idx) => {
        details[idx].activeCaloriesSource = "activeRecord";
        details[idx].isEstimated = false;
        details[idx].hasActiveRecord = true;
      });
    });
  }

  private applyFallbacks(buckets: HourlyHealthPayload[], details: HourlyDetail[], trustedTotal: any[], avgBmr: number) {
    const { start: dayStart } = getDayBoundaries();
    let sumActiveFromTier1 = 0;
    let sumEstimatedFromTier2 = 0;
    let sumTotalCalories = 0;
    let sumBasalUsed = 0;

    trustedTotal.forEach((r: any) => {
      const startStr = r.startTime || r.time;
      const endStr = r.endTime || r.startTime || r.time;
      const rStart = new Date(startStr).getTime();
      const rEnd = new Date(endStr).getTime();
      const totalVal = r.energy.inKilocalories;
      const duration = Math.max(rEnd - rStart, 1);

      for (let i = 0; i < 24; i++) {
        const bStart = dayStart.getTime() + i * 3600000;
        const bEnd = bStart + 3600000;
        const overlap = Math.max(0, Math.min(rEnd, bEnd) - Math.max(rStart, bStart));
        if (overlap > 0) {
          const portion = totalVal * (overlap / duration);
          details[i].totalCalories = (details[i].totalCalories || 0) + portion;
        }
      }
    });

    for (let i = 0; i < 24; i++) {
      const hourTotalCal = details[i].totalCalories || 0;
      sumTotalCalories += hourTotalCal;

      if (details[i].hasActiveRecord) {
        sumActiveFromTier1 += buckets[i].activeCalories;
        details[i].activeCalories = buckets[i].activeCalories;
      } else if (hourTotalCal > 0 && avgBmr > 0) {
        const bucketDurationMs = 3600000;
        const basalHour = avgBmr * (bucketDurationMs / 86400000);
        const activeEst = Math.max(hourTotalCal - basalHour, 0);

        buckets[i].activeCalories = activeEst;
        details[i].activeCalories = activeEst;
        details[i].activeCaloriesSource = "totalMinusBasal";
        details[i].isEstimated = true;
        details[i].basalUsed = basalHour;

        sumEstimatedFromTier2 += activeEst;
        sumBasalUsed += basalHour;
      } else {
        details[i].activeCalories = 0;
        details[i].activeCaloriesSource = "none";
        details[i].isEstimated = true;
      }
    }

    return { sumActiveFromTier1, sumEstimatedFromTier2, sumTotalCalories, sumBasalUsed };
  }

  private initStats(): FilteringStats {
    const stats: any = {
      recordsRead: 0,
      recordsAccepted: 0,
      perType: {},
      rejectedByReason: {}
    };
    [RejectionReason.MISSING_ORIGIN, RejectionReason.UNTRUSTED_PACKAGE, RejectionReason.USER_INPUT, RejectionReason.OTHER].forEach(r => {
      stats.rejectedByReason[r] = 0;
    });
    return stats;
  }


  getDebugInfo(): string[] {
    if (!this.debugData) return ["No data fetched yet"];
    const { stats, sumActiveFromTier1, sumEstimatedFromTier2, sumTotalCalories, avgBmrKcalDay, sumBasalUsed } = this.debugData;

    const info = [
      `Tier1 (Direct): ${sumActiveFromTier1.toFixed(1)} | Tier2 (Est): ${sumEstimatedFromTier2.toFixed(1)}`,
      `Total Energy: ${sumTotalCalories.toFixed(1)} | Basal Used: ${sumBasalUsed.toFixed(1)}`,
      `BMR: ${avgBmrKcalDay > 0 ? avgBmrKcalDay.toFixed(0) : 'MISSING'} kcal/day`
    ];

    const typeRows = Object.entries(stats.perType)
      .map(([type, s]: [string, any]) => `${type}: ${s.accepted}/${s.read} OK`)
      .join('\n• ');
    info.push(`• ${typeRows}`);

    const rejectedManual = stats.rejectedByReason?.[RejectionReason.USER_INPUT] || 0;
    if (rejectedManual > 0) {
      info.push(`⚠️ IGNORED: ${rejectedManual} manual/invalid records.`);
    }

    return info;
  }

  getDetailedHourlyDebug() { return this.debugData?.hourly || []; }
  getIngestionAuditLog(): IngestionRecord[] { return this.debugData?.auditLog || []; }
  setBypassManualFilter(bypass: boolean) { this.bypassManualFilter = bypass; }
}

