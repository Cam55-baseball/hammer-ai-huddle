// Phase 12.2 safeguard — silent telemetry for invalid Non-Negotiables.
// Fire-and-forget. Must never throw, never block render, never retry.

type NNInvalidPayload = {
  templateId?: string | null;
  completion_type?: unknown;
  missing_fields: string[];
};

export function trackNNInvalidDropped(payload: NNInvalidPayload) {
  try {
    // Prefer an in-page analytics provider if one is wired up later.
    if (typeof window !== 'undefined' && (window as any)?.analytics?.track) {
      (window as any).analytics.track('NN_INVALID_DROPPED', payload);
      return;
    }

    // Fallback — fire-and-forget POST. The endpoint may not exist yet;
    // that's fine: keepalive ensures it survives navigation, and the
    // .catch() swallows the inevitable network/404 error.
    if (typeof fetch === 'function') {
      fetch('/api/telemetry/nn-invalid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'NN_INVALID_DROPPED',
          ...payload,
        }),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Telemetry must never break render.
  }
}
