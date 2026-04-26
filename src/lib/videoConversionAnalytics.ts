/**
 * PHASE 8 — analytics only.
 * No ranking influence. No DB mutation. Never throws.
 */
export function trackCtaClick(videoId: string, action: string) {
  try {
    console.log('[CTA_CLICK]', {
      videoId,
      action,
      timestamp: Date.now(),
    });
  } catch {
    // silent fail (never break UI)
  }
}
