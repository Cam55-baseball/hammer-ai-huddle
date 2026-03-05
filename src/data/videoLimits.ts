export const VIDEO_LIMITS = {
  MAX_CLIP_DURATION_SEC: 300,       // 5 minutes per clip
  MAX_FILE_SIZE_MB: 500,            // 500 MB max
  MAX_FILE_SIZE_BYTES: 500 * 1024 * 1024,
  MAX_SESSION_DURATION_MIN: 60,     // 60 min full session
  SUPPORTED_FORMATS: ['mp4', 'mov', 'webm', 'avi', 'm4v'],
  SUPPORTED_MIME_TYPES: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-m4v'],
} as const;

export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  if (file.size > VIDEO_LIMITS.MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File exceeds ${VIDEO_LIMITS.MAX_FILE_SIZE_MB}MB limit` };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!(VIDEO_LIMITS.SUPPORTED_FORMATS as readonly string[]).includes(ext)) {
    return { valid: false, error: `Unsupported format: .${ext}. Use ${VIDEO_LIMITS.SUPPORTED_FORMATS.join(', ')}` };
  }

  return { valid: true };
}
