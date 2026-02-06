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


  if (metadata.recordingMethod !== undefined) {
    if (metadata.recordingMethod === 3) {
      if (allowManual) return { trusted: true, reason: RejectionReason.NONE };
      return { trusted: false, reason: RejectionReason.USER_INPUT };
    }
    if (!ALLOWED_RECORDING_METHODS.includes(metadata.recordingMethod)) {
      if (allowManual) return { trusted: true, reason: RejectionReason.NONE };


      if (metadata.recordingMethod === 0) {
        return { trusted: true, reason: RejectionReason.NONE };
      }

      return { trusted: false, reason: RejectionReason.USER_INPUT };
    }
  } else {
    return { trusted: true, reason: RejectionReason.NONE };
  }

  return { trusted: true, reason: RejectionReason.NONE };
};

export const isTrustedRecord = (record: { metadata?: { dataOrigin?: string; recordingMethod?: number; device?: any } }): boolean => {
  return validateRecord(record).trusted;
};
