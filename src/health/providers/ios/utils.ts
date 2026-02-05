import { QuantitySample } from '@kingstinct/react-native-healthkit';
import { HourlyHealthPayload } from '../../models';

/**
 * Distributes a sample's value across hourly buckets based on time overlap.
 */
export function distributeSample(
    sample: QuantitySample,
    buckets: HourlyHealthPayload[],
    dayStart: Date,
    totalValue: number,
    bucketKey: keyof HourlyHealthPayload,
    onBucketTouch?: (idx: number) => void
) {
    const rStart = sample.startDate.getTime();
    const rEnd = sample.endDate.getTime();
    const duration = Math.max(rEnd - rStart, 1);

    for (let i = 0; i < 24; i++) {
        const bStart = dayStart.getTime() + i * 3600000;
        const bEnd = bStart + 3600000;
        const overlap = Math.max(0, Math.min(rEnd, bEnd) - Math.max(rStart, bStart));

        if (overlap > 0) {
            const portion = totalValue * (overlap / duration);
            (buckets[i] as any)[bucketKey] += portion;
            if (onBucketTouch) onBucketTouch(i);
            if (bucketKey === 'activeCalories') {
                // This was in original code, likely to ensure value is present or for some quirk
                (buckets[i] as any).activeCalories += 0;
            }
        }
    }
}
