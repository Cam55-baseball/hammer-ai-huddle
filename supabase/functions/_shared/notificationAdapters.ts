/**
 * Phase I — Notification dispatch scaffolding.
 *
 * Adapters are present but inert. Live delivery is gated by the
 * FOUNDATION_NOTIFICATIONS_ENABLED env flag (default off). When enabled in
 * a future phase, the dispatcher will fan out to each registered adapter.
 *
 * No webhook secrets are read in this phase.
 */

export type Severity = 'info' | 'warning' | 'critical';

export interface NotificationDispatch {
  key: string;
  severity: Severity;
  title: string;
  detail?: Record<string, unknown>;
}

export interface NotificationAdapter {
  name: string;
  send(d: NotificationDispatch): Promise<{ ok: boolean; error?: string }>;
}

// --- Stubs ---------------------------------------------------------------
// Both adapters intentionally return ok without hitting the network. They
// document the interface a future implementation must satisfy.

export const slackAdapter: NotificationAdapter = {
  name: 'slack',
  async send(_d) {
    return { ok: true };
  },
};

export const emailAdapter: NotificationAdapter = {
  name: 'email',
  async send(_d) {
    return { ok: true };
  },
};

const ADAPTERS: NotificationAdapter[] = [slackAdapter, emailAdapter];

export interface DispatchResult {
  skipped: boolean;
  results?: Array<{ adapter: string; ok: boolean; error?: string }>;
}

/**
 * Dispatch a notification. No-op unless FOUNDATION_NOTIFICATIONS_ENABLED='true'.
 * Best-effort: never throws, never blocks the caller.
 */
export async function dispatch(d: NotificationDispatch): Promise<DispatchResult> {
  const enabled = (Deno.env.get('FOUNDATION_NOTIFICATIONS_ENABLED') ?? '').toLowerCase() === 'true';
  if (!enabled) return { skipped: true };
  const results: Array<{ adapter: string; ok: boolean; error?: string }> = [];
  for (const a of ADAPTERS) {
    try {
      const r = await a.send(d);
      results.push({ adapter: a.name, ok: r.ok, error: r.error });
    } catch (e) {
      results.push({ adapter: a.name, ok: false, error: String((e as Error).message ?? e) });
    }
  }
  return { skipped: false, results };
}
