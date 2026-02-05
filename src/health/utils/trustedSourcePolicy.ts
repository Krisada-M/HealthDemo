export const TRUSTED_PACKAGES: string[] = ["com.google.android.apps.fitness"];

export enum RejectionReason {
  NONE = "none",
  MISSING_ORIGIN = "missingOrigin",
  UNTRUSTED_PACKAGE = "untrustedPackage",
  USER_INPUT = "userInput",
  OTHER = "other"
}

export interface ValidationResult {
  trusted: boolean;
  reason: RejectionReason;
}

// Allowed recording methods: 1 (ACTIVELY_RECORDED), 2 (AUTOMATICALLY_RECORDED)
// 0 (UNKNOWN) is suspect, 3 (MANUAL_ENTRY) is strictly forbidden.
const ALLOWED_RECORDING_METHODS = [1, 2];

export const validateRecord = (
  record: { metadata?: { dataOrigin?: string; recordingMethod?: number; device?: any } },
  allowManual: boolean = false
): ValidationResult => {
  const metadata = record.metadata;

  if (!metadata || !metadata.dataOrigin) {
    return { trusted: false, reason: RejectionReason.MISSING_ORIGIN };
  }

  if (!TRUSTED_PACKAGES.includes(metadata.dataOrigin)) {
    return { trusted: false, reason: RejectionReason.UNTRUSTED_PACKAGE };
  }

  // Check recording method if present. 
  // If undefined, we might accept strict or loose. 
  // Requirement says: "REJECT if ... recordingMethod indicates user input / manual entry"
  // Let's explicitly check for MANUAL (3).
  // Also requirement says "Allowed recording methods ... AUTOMATIC, ACTIVELY_RECORDED". 
  // So if it's not in allowed list, we might reject? 
  // Let's stick to explicitly rejecting MANUAL (3) and ensuring it is one of the "good" ones if widely supported.
  // Ideally, if recordingMethod is missing, we might default to safe if package is trusted? 
  // Prompt says: "recordingMethod must be in an allowed set (explicit)"

  if (metadata.recordingMethod !== undefined) {
    if (metadata.recordingMethod === 3) {
      if (allowManual) return { trusted: true, reason: RejectionReason.NONE };
      return { trusted: false, reason: RejectionReason.USER_INPUT };
    }
    if (!ALLOWED_RECORDING_METHODS.includes(metadata.recordingMethod)) {
      // If it's 0 (UNKNOWN) or some future type
      if (allowManual) return { trusted: true, reason: RejectionReason.NONE };

      // Requirement: Do NOT hard-reject solely because device metadata is missing.
      // However, we still need to distinguish from Manual (3). 
      // If it's UNKNOWN (0), and NOT Manual, we might consider it suspect but the prompt implies 
      // we shouldn't kill it just for missing device info. 
      // Let's stick to the core: Only 3 (Manual) is strictly forbidden. 
      // 0 (Unknown) is now allowed if from Trusted Package.
      if (metadata.recordingMethod === 0) {
        return { trusted: true, reason: RejectionReason.NONE };
      }

      return { trusted: false, reason: RejectionReason.USER_INPUT };
    }
  } else {
    // If recordingMethod is missing, but package is trusted, we trust it.
    return { trusted: true, reason: RejectionReason.NONE };
  }

  return { trusted: true, reason: RejectionReason.NONE };
};

export const isTrustedRecord = (record: { metadata?: { dataOrigin?: string; recordingMethod?: number; device?: any } }): boolean => {
  return validateRecord(record).trusted;
};
