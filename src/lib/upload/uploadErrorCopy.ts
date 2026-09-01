/**
 * Plain-language copy for every video upload / analysis failure.
 *
 * Rule: a message must say (1) what happened in everyday words,
 * (2) why, in terms the athlete can check, and (3) exactly what to do
 * next. No pixel math, no error codes, no "see console".
 */

export const UPLOAD_ERRORS = {
  notAVideo:
    "That file isn't a video. Pick a clip from your camera roll (.mp4 or .mov work best).",

  tooLarge:
    "That video is too big to upload. Trim it to just the swing or pitch — a few seconds is plenty — and try again.",

  unreadable:
    "We couldn't open that video. It may still be downloading from iCloud or Google Photos, or it may be a format we can't read. Wait for it to finish downloading, or re-save it from your camera roll and try again.",

  tooSmall:
    "This clip is too blurry to analyze. Videos shared through text or social apps get shrunk down. Upload the original straight from your camera roll instead.",

  lowFps:
    "This clip was recorded too slowly to read the movement. Record again with your phone's normal video mode (or slow-mo) — anything at 24 frames per second or higher works.",

  tooShort: "This clip is too short. Record at least half a second of movement.",

  tooLong:
    "This clip is too long. Trim it down to under a minute — just the rep you want looked at.",

  droppedFrames:
    "Too much of this clip came through damaged. Re-save it from your camera roll and upload again.",

  notEnoughFrames:
    "We couldn't pull enough clear pictures out of this clip to analyze it. Try a steadier clip, filmed in better light, with the athlete fully in frame.",

  frameExtractionFailed:
    "Your browser couldn't read this video. Try again in Safari or Chrome, or re-save the clip from your camera roll first.",

  poseFailed:
    "We couldn't find the athlete's body in this clip. Make sure the whole body is in frame, the camera is steady, and the lighting is good — then upload again.",

  storageFailed:
    "The upload didn't finish. Check your connection and try again — your video is still selected.",

  recordFailed:
    "We couldn't save this video to your library. Try again in a moment.",

  sessionExpired:
    "You've been signed out. Sign in again and your video will still be here.",

  notReady: "The upload didn't finish preparing. Give it a moment and try again.",

  generic:
    "Something went wrong with this video. Try uploading it again — if it keeps failing, try a different clip.",
} as const;

/** Maps the analyze-video edge function's structured reject reason to copy. */
export function friendlyRejectReason(reason: string | null): string | null {
  switch (reason) {
    case "reject_low_resolution":
      return UPLOAD_ERRORS.tooSmall;
    case "reject_low_fps":
      return UPLOAD_ERRORS.lowFps;
    case "reject_duration_out_of_bounds":
      return UPLOAD_ERRORS.tooLong;
    case "reject_excessive_dropped_frames":
      return UPLOAD_ERRORS.droppedFrames;
    case "missing_video_sha256":
    case "missing_probe_metadata":
      return UPLOAD_ERRORS.notReady;
    default:
      return null;
  }
}

/**
 * Never surface a raw thrown error to an athlete. Known friendly strings
 * (already from UPLOAD_ERRORS) pass through; anything else falls back.
 */
export function friendlyThrownError(err: unknown): string {
  const msg = (err as { message?: string })?.message;
  if (msg && (Object.values(UPLOAD_ERRORS) as string[]).includes(msg)) return msg;
  return UPLOAD_ERRORS.generic;
}
