import { RejectionReason } from '../../utils/trustedSourcePolicy';

export type ActiveCaloriesSource = "activeRecord" | "totalMinusBasal" | "none";

export interface IngestionRecord {
    type: string;
    time: string;
    value: number;
    origin: string;
    trusted: boolean;
    recordingMethod?: number;
    rejectionReason?: string;
    rawMetadata?: string;
    device?: string;
}

export interface HourlyDetail {
    hourIndex: number;
    activeCalories: number;
    activeCaloriesSource: ActiveCaloriesSource;
    isEstimated: boolean;
    hasActiveRecord: boolean; // Flag to prevent Tier-2 override
    totalCalories?: number;
    basalUsed?: number;
}

export interface FilteringStats {
    recordsRead: number;
    recordsAccepted: number;
    perType: { [key: string]: { read: number; accepted: number } };
    rejectedByReason: { [key in RejectionReason]?: number };
}

export interface ProviderDebugState {
    hourly: HourlyDetail[];
    sumActiveFromTier1: number;
    sumEstimatedFromTier2: number;
    sumTotalCalories: number;
    sumBasalUsed: number;
    avgBmrKcalDay: number;
    stats: FilteringStats;
    auditLog: IngestionRecord[];
}
