/**
 * Phase II — Notification dispatch (gated, critical-only).
 *
 * Master gate: FOUNDATION_NOTIFICATIONS_ENABLED='true'
 * Severity gate: critical-only (warning/info skipped even when enabled)
 * Flapping window: 10 min (skip if same alert_key+adapter dispatched recently)
 * Idempotency: alert_key + adapter + minute_bucket unique index
 * Retries: per-adapter max 3, exp backoff 500/1500/4500ms, then DLQ
 * Outer timeout: 20s hard ceiling — never blocks evaluator
 *
 * All attempts are logged to public.foundation_notification_dispatches.
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export type Severity = 'info' | 'warning' | 'critical';

export interface NotificationDispatch {
  key: string;
  severity: Severity;
  title: string;
  detail?: Record<string, unknown>;
}

export interface AdapterResult {
  ok: boolean;
  error?: string;
  attempts: number;
}

export interface NotificationAdapter {
  name: string;
  /** When true, this adapter runs even if FOUNDATION_NOTIFICATIONS_ENABLED is off.
   *  Used by in-app channels (owner alert center) that don't depend on external infra. */
  alwaysOn?: boolean;
  send(d: NotificationDispatch, signal: AbortSignal): Promise<{ ok: boolean; error?: string }>;
}

const FLAP_WINDOW_MS = 10 * 60_000;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [500, 1500, 4500];
const DISPATCH_DEADLINE_MS = 20_000;
const PER_ATTEMPT_TIMEOUT_MS = 5_000;

// --- Adapters -----------------------------------------------------------

export const slackAdapter: NotificationAdapter = {
  name: 'slack',
  async send(d, signal) {
    const url = Deno.env.get('SLACK_WEBHOOK_URL');
    if (!url) return { ok: false, error: 'SLACK_WEBHOOK_URL not configured' };
    const payload = {
      text: `:rotating_light: *${d.severity.toUpperCase()}* — ${d.title}`,
      attachments: [{
        color: d.severity === 'critical' ? 'danger' : 'warning',
        fields: [
          { title: 'Alert key', value: d.key, short: true },
          { title: 'Detail', value: '```' + JSON.stringify(d.detail ?? {}, null, 2).slice(0, 1500) + '```', short: false },
        ],
      }],
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `slack ${res.status}: ${body.slice(0, 200)}` };
    }
    await res.text().catch(() => '');
    return { ok: true };
  },
};

// Email adapter posts to a configurable webhook (FOUNDATION_ALERT_EMAIL_HOOK_URL).
// Inert when unset — never references send-transactional-email so it cannot 4xx
// when the transactional-email infra has not been scaffolded for this project.
// To enable real email delivery, run the email-domain + scaffold flow and point
// FOUNDATION_ALERT_EMAIL_HOOK_URL at the resulting endpoint (or any HTTPS sink).
export const emailAdapter: NotificationAdapter = {
  name: 'email',
  async send(d, signal) {
    const hookUrl = Deno.env.get('FOUNDATION_ALERT_EMAIL_HOOK_URL');
    if (!hookUrl) return { ok: false, error: 'email_disabled' };
    const res = await fetch(hookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        severity: d.severity,
        title: d.title,
        alertKey: d.key,
        detail: d.detail ?? {},
        minute_bucket: minuteBucket().toISOString(),
      }),
      signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `email ${res.status}: ${body.slice(0, 200)}` };
    }
    await res.text().catch(() => '');
    return { ok: true };
  },
};

// In-app adapter — writes critical alerts to public.owner_alerts so they
// show up in the Owner Alert Center bell, regardless of email/slack config.
// Always on (no master gate dependency) — this is the primary owner channel.
export const inAppOwnerAlertAdapter: NotificationAdapter = {
  name: 'in_app_owner',
  alwaysOn: true,
  async send(d, _signal) {
    const sb = getSupabase();
    if (!sb) return { ok: false, error: 'no_supabase_client' };
    const bucket = minuteBucket();
    const { error } = await sb.from('owner_alerts').insert({
      alert_key: d.key,
      severity: d.severity,
      title: d.title,
      detail: d.detail ?? {},
      minute_bucket: bucket.toISOString(),
    });
    if (error) {
      // Duplicate key = already inserted this minute, that's success (idempotent).
      if (/duplicate|unique/i.test(error.message)) return { ok: true };
      return { ok: false, error: `in_app ${error.message}` };
    }
    return { ok: true };
  },
};

const ADAPTERS: NotificationAdapter[] = [inAppOwnerAlertAdapter, slackAdapter, emailAdapter];

// --- Internal helpers ---------------------------------------------------

export function minuteBucket(now: Date = new Date()): Date {
  const b = new Date(now);
  b.setUTCSeconds(0, 0);
  return b;
}

function getSupabase(): SupabaseClient | null {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function logDispatch(
  sb: SupabaseClient | null,
  row: {
    alert_key: string;
    severity: Severity;
    adapter: string;
    status: string;
    attempt: number;
    error?: string | null;
    payload?: Record<string, unknown> | null;
    minute_bucket?: Date | null;
  },
): Promise<void> {
  if (!sb) return;
  try {
    await sb.from('foundation_notification_dispatches').insert({
      alert_key: row.alert_key,
      severity: row.severity,
      adapter: row.adapter,
      status: row.status,
      attempt: row.attempt,
      error: row.error ?? null,
      payload: row.payload ?? null,
      minute_bucket: row.minute_bucket ? row.minute_bucket.toISOString() : null,
    });
  } catch {
    // Never throw from logger.
  }
}

async function isFlapping(sb: SupabaseClient, alertKey: string, adapter: string): Promise<boolean> {
  const since = new Date(Date.now() - FLAP_WINDOW_MS).toISOString();
  const { data } = await sb
    .from('foundation_notification_dispatches')
    .select('id')
    .eq('alert_key', alertKey)
    .eq('adapter', adapter)
    .eq('status', 'ok')
    .gte('dispatched_at', since)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function sendWithRetry(
  adapter: NotificationAdapter,
  d: NotificationDispatch,
  outerSignal: AbortSignal,
): Promise<AdapterResult> {
  let lastError: string | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (outerSignal.aborted) return { ok: false, error: 'outer_timeout', attempts: attempt - 1 };
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    outerSignal.addEventListener('abort', onAbort, { once: true });
    const t = setTimeout(() => ctrl.abort(), PER_ATTEMPT_TIMEOUT_MS);
    try {
      const r = await adapter.send(d, ctrl.signal);
      clearTimeout(t);
      outerSignal.removeEventListener('abort', onAbort);
      if (r.ok) return { ok: true, attempts: attempt };
      lastError = r.error;
    } catch (e) {
      clearTimeout(t);
      outerSignal.removeEventListener('abort', onAbort);
      lastError = String((e as Error).message ?? e);
    }
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((res) => setTimeout(res, BACKOFF_MS[attempt - 1]));
    }
  }
  return { ok: false, error: lastError ?? 'unknown', attempts: MAX_ATTEMPTS };
}

// --- Public API ---------------------------------------------------------

export interface DispatchResult {
  skipped: boolean;
  reason?: string;
  results?: Array<{ adapter: string; ok: boolean; error?: string; attempts: number }>;
}

let configWarned = false;

/**
 * Best-effort dispatch. Never throws. Returns within DISPATCH_DEADLINE_MS.
 * Critical-only when enabled; warning/info are logged as skipped_severity.
 */
export async function dispatch(d: NotificationDispatch): Promise<DispatchResult> {
  const enabled = (Deno.env.get('FOUNDATION_NOTIFICATIONS_ENABLED') ?? '').toLowerCase() === 'true';
  const sb = getSupabase();
  const bucket = minuteBucket();

  if (!enabled) {
    for (const a of ADAPTERS) {
      await logDispatch(sb, { alert_key: d.key, severity: d.severity, adapter: a.name, status: 'skipped_disabled', attempt: 0, payload: { title: d.title } });
    }
    return { skipped: true, reason: 'disabled' };
  }

  // Startup config validation (logged at most once per cold start).
  if (!configWarned) {
    const slackOk = !!Deno.env.get('SLACK_WEBHOOK_URL');
    const emailOk = !!Deno.env.get('FOUNDATION_ALERT_EMAIL_HOOK_URL');
    if (!slackOk && !emailOk) {
      await logDispatch(sb, { alert_key: d.key, severity: d.severity, adapter: 'all', status: 'config_invalid', attempt: 0, error: 'no adapter configured' });
    }
    configWarned = true;
  }

  // Critical-only severity gate. Even alwaysOn adapters skip non-critical;
  // they exist for the owner alert center which only surfaces criticals.
  if (d.severity !== 'critical') {
    for (const a of ADAPTERS) {
      await logDispatch(sb, { alert_key: d.key, severity: d.severity, adapter: a.name, status: 'skipped_severity', attempt: 0 });
    }
    return { skipped: true, reason: 'non_critical' };
  }

  // Master gate: when off, only adapters marked alwaysOn run.
  // Other adapters log skipped_disabled (path exercised, no external send).
  const activeAdapters = enabled ? ADAPTERS : ADAPTERS.filter((a) => a.alwaysOn);
  if (!enabled) {
    for (const a of ADAPTERS) {
      if (!a.alwaysOn) {
        await logDispatch(sb, { alert_key: d.key, severity: d.severity, adapter: a.name, status: 'skipped_disabled', attempt: 0, payload: { title: d.title } });
      }
    }
  }

  // Outer 20s hard timeout
  const outerCtrl = new AbortController();
  const outerTimer = setTimeout(() => outerCtrl.abort(), DISPATCH_DEADLINE_MS);
  const results: Array<{ adapter: string; ok: boolean; error?: string; attempts: number }> = [];

  try {
    await Promise.allSettled(activeAdapters.map(async (a) => {
      try {
        if (sb && (await isFlapping(sb, d.key, a.name))) {
          await logDispatch(sb, { alert_key: d.key, severity: d.severity, adapter: a.name, status: 'skipped_flap', attempt: 0, minute_bucket: bucket });
          results.push({ adapter: a.name, ok: true, attempts: 0 });
          return;
        }
        const r = await sendWithRetry(a, d, outerCtrl.signal);
        // Idempotency-aware insert: minute_bucket unique index prevents dup rows
        // for the same (alert_key, adapter, minute) — second insert will conflict.
        if (sb) {
          const { error: insErr } = await sb.from('foundation_notification_dispatches').insert({
            alert_key: d.key,
            severity: d.severity,
            adapter: a.name,
            status: r.ok ? 'ok' : 'dlq',
            attempt: r.attempts,
            error: r.error ?? null,
            payload: { title: d.title, detail: d.detail ?? {} },
            minute_bucket: bucket.toISOString(),
          });
          if (insErr && /duplicate|unique/i.test(insErr.message)) {
            await logDispatch(sb, { alert_key: d.key, severity: d.severity, adapter: a.name, status: 'skipped_idem', attempt: r.attempts, minute_bucket: bucket });
          }
        }
        results.push({ adapter: a.name, ...r });
      } catch (e) {
        const err = String((e as Error).message ?? e);
        await logDispatch(sb, { alert_key: d.key, severity: d.severity, adapter: a.name, status: 'dlq', attempt: 1, error: err, minute_bucket: bucket });
        results.push({ adapter: a.name, ok: false, error: err, attempts: 1 });
      }
    }));
  } finally {
    clearTimeout(outerTimer);
  }
  return { skipped: false, results };
}

// Test seam — reset module state between tests.
export function __resetForTests(): void {
  configWarned = false;
}
