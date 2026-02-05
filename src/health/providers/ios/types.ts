export interface IngestionRecord {
    type: string;
    time: string;
    value: number;
    origin: string;
    trusted: boolean;
    rejectionReason?: string;
    rawMetadata?: string;
}

export interface HourlyDetail {
    hourIndex: number;
    activeCalories: number;
    activeCaloriesSource: "activeRecord" | "none";
    isEstimated: boolean;
}

export interface ProviderDebugState {
    hourly: HourlyDetail[];
    stats: { read: number; accepted: number; rejectedManual: number };
    auditLog: IngestionRecord[];
}
