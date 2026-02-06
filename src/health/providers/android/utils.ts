import { HourlyHealthPayload } from '../../models';

export function extractValue(r: any): number {
    if (r.count) return r.count;
    if (r.energy?.inKilocalories) return r.energy.inKilocalories;
    if (r.distance?.inMeters) return r.distance.inMeters;
    if (r.basalMetabolicRate?.inKilocaloriesPerDay) return r.basalMetabolicRate.inKilocaloriesPerDay;
    return 0;
}

export function calculateAverageBmr(trustedBmr: any[]): number {
    if (trustedBmr.length === 0) return 0;
    const sum = trustedBmr.reduce((acc, r) => acc + r.basalMetabolicRate.inKilocaloriesPerDay, 0);
    return sum / trustedBmr.length;
}

export function distributeRecordAcrossBuckets(
    record: any,
    buckets: HourlyHealthPayload[],
    dayStart: Date,
    valueExtractor: (r: any) => number,
    bucketKey: keyof HourlyHealthPayload,
    onBucketTouch?: (idx: number) => void
) {
    const startStr = record.startTime || record.time;
    const endStr = record.endTime || record.startTime || record.time;

    const rStart = new Date(startStr).getTime();
    const rEnd = new Date(endStr).getTime();
    const totalValue = valueExtractor(record);

    if (isNaN(rStart) || isNaN(rEnd)) return;

    const duration = rEnd - rStart;

    for (let i = 0; i < 24; i++) {
        const bStart = dayStart.getTime() + i * 3600000;
        const bEnd = bStart + 3600000;

        if (duration === 0) {
            if (rStart >= bStart && rStart < bEnd) {
                (buckets[i] as any)[bucketKey] += totalValue;
                if (onBucketTouch) onBucketTouch(i);
            }
            continue;
        }

        const overlapStart = Math.max(rStart, bStart);
        const overlapEnd = Math.min(rEnd, bEnd);
        const overlapDuration = Math.max(0, overlapEnd - overlapStart);

        if (overlapDuration > 0) {
            const ratio = overlapDuration / duration;
            const portion = totalValue * ratio;
            (buckets[i] as any)[bucketKey] += portion;
            if (onBucketTouch) onBucketTouch(i);
        }
    }
}
