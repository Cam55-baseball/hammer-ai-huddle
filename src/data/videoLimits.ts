export const VIDEO_LIMITS = {
  MAX_CLIP_DURATION_SEC: 300,       // 5 minutes per clip
  MAX_FILE_SIZE_MB: 2048,           // 2 GB max
  MAX_FILE_SIZE_BYTES: 2048 * 1024 * 1024,
  MAX_SESSION_DURATION_MIN: 60,     // 60 min full session
  SUPPORTED_FORMATS: ['mp4', 'mov', 'webm', 'avi', 'm4v'],
  SUPPORTED_MIME_TYPES: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-m4v'],
} as const;

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(0);
}

export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  if (file.size > VIDEO_LIMITS.MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Your video is too large (${formatMB(file.size)} MB). Max is ${VIDEO_LIMITS.MAX_FILE_SIZE_MB} MB — try a shorter clip or compress the file and upload again.`,
    };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!(VIDEO_LIMITS.SUPPORTED_FORMATS as readonly string[]).includes(ext)) {
    return { valid: false, error: `Unsupported format: .${ext}. Use ${VIDEO_LIMITS.SUPPORTED_FORMATS.join(', ')}` };
  }

  return { valid: true };
}

/** The landing hero is downloaded by every visitor, so it must be a small MP4. */
export const LANDING_DEMO_MAX_MB = 25;

export function validateLandingDemoFile(file: File): { valid: boolean; error?: string } {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext !== 'mp4' || (file.type && file.type !== 'video/mp4')) {
    return {
      valid: false,
      error:
        'The landing page video must be an MP4 (H.264). QuickTime .mov files will not play in many browsers — export or convert the clip to MP4 first.',
    };
  }
  if (file.size > LANDING_DEMO_MAX_MB * 1024 * 1024) {
    return {
      valid: false,
      error: `This clip is ${formatMB(file.size)} MB. Keep the landing video under ${LANDING_DEMO_MAX_MB} MB (720p, about 1.5 Mbps) so it loads on phone data.`,
    };
  }
  return { valid: true };
}

