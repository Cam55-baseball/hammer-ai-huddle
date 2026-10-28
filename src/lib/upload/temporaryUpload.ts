/**
 * Analysis uploads are temporary until the athlete taps Save to Players Club
 * (owner P0, Oct 28). Unsaved uploads are cleaned up after this long.
 */
export const TEMPORARY_UPLOAD_HOURS = 24;

export function temporaryUploadUntil(now: Date = new Date()): string {
  return new Date(now.getTime() + TEMPORARY_UPLOAD_HOURS * 3_600_000).toISOString();
}

/** The only thing a failed written analysis may say (owner P0, Oct 28). */
export const ANALYSIS_DID_NOT_FINISH = "Your analysis didn't finish. Tap Retry.";
