// Deno tests for notificationAdapters dispatch logic.
// Run via supabase--test_edge_functions.

import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  dispatch,
  __resetForTests,
  type NotificationDispatch,
} from './notificationAdapters.ts';

// --- In-memory Supabase stub --------------------------------------------
function makeSbStub(opts: { flap?: boolean; insertError?: string } = {}) {
  const inserts: any[] = [];
  const stub: any = {
    from(_table: string) {
      return {
        insert(row: any) {
          inserts.push({ table: _table, row });
          if (opts.insertError) return Promise.resolve({ error: { message: opts.insertError } });
          return Promise.resolve({ error: null });
        },
        select() { return this; },
        eq() { return this; },
        gte() { return this; },
        limit() {
          if (opts.flap) return Promise.resolve({ data: [{ id: 'x' }], error: null });
          return Promise.resolve({ data: [], error: null });
        },
      };
    },
  };
  return { stub, inserts };
}

function setEnv(env: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) Deno.env.delete(k);
    else Deno.env.set(k, v);
  }
}

const baseEnv = {
  SUPABASE_URL: 'http://stub',
  SUPABASE_SERVICE_ROLE_KEY: 'stub',
  FOUNDATION_NOTIFICATIONS_ENABLED: undefined,
  SLACK_WEBHOOK_URL: undefined,
  FOUNDATION_ALERT_EMAIL_HOOK_URL: undefined,
};

const sample: NotificationDispatch = {
  key: 'test_alert',
  severity: 'critical',
  title: 'Test alert',
  detail: { foo: 'bar' },
};

// Patch fetch globally to a no-op success unless overridden in a test.
const origFetch = globalThis.fetch;
function setFetch(fn: typeof fetch) { (globalThis as any).fetch = fn; }
function restoreFetch() { (globalThis as any).fetch = origFetch; }

Deno.test({ name: 'dispatch: skipped when disabled flag is off', sanitizeOps: false, sanitizeResources: false, fn: async () => {
  __resetForTests();
  setEnv({ ...baseEnv });
  const r = await dispatch(sample);
  assertEquals(r.skipped, true);
  assertEquals(r.reason, 'disabled');
} });

Deno.test({ name: 'dispatch: skipped for non-critical severity', sanitizeOps: false, sanitizeResources: false, fn: async () => {
  __resetForTests();
  setEnv({ ...baseEnv, FOUNDATION_NOTIFICATIONS_ENABLED: 'true' });
  const r = await dispatch({ ...sample, severity: 'warning' });
  assertEquals(r.skipped, true);
  assertEquals(r.reason, 'non_critical');
} });

Deno.test({ name: 'dispatch: never throws even if all adapters fail', sanitizeOps: false, sanitizeResources: false, fn: async () => {
  __resetForTests();
  setEnv({
    ...baseEnv,
    FOUNDATION_NOTIFICATIONS_ENABLED: 'true',
    SLACK_WEBHOOK_URL: 'https://example.invalid/slack',
    FOUNDATION_ALERT_EMAIL_HOOK_URL: 'https://example.invalid/email',
  });
  setFetch(() => Promise.resolve(new Response('boom', { status: 500 })));
  try {
    const r = await dispatch(sample);
    assertEquals(r.skipped, false);
    assert(r.results && r.results.length === 2);
    for (const res of r.results!) assertEquals(res.ok, false);
  } finally {
    restoreFetch();
  }
} });

Deno.test({ name: 'dispatch: succeeds when fetch returns 200', sanitizeOps: false, sanitizeResources: false, fn: async () => {
  __resetForTests();
  setEnv({
    ...baseEnv,
    FOUNDATION_NOTIFICATIONS_ENABLED: 'true',
    SLACK_WEBHOOK_URL: 'https://example.invalid/slack',
  });
  setFetch(() => Promise.resolve(new Response('ok', { status: 200 })));
  try {
    const r = await dispatch(sample);
    assert(r.results!.some(x => x.adapter === 'slack' && x.ok));
  } finally {
    restoreFetch();
  }
} });

Deno.test({ name: 'emailAdapter: inert when FOUNDATION_ALERT_EMAIL_HOOK_URL unset', sanitizeOps: false, sanitizeResources: false, fn: async () => {
  __resetForTests();
  setEnv({ ...baseEnv, FOUNDATION_NOTIFICATIONS_ENABLED: 'true' });
  // No fetch should be called for email; supply a throwing fetch to prove it.
  setFetch(() => { throw new Error('fetch should not run for inert email'); });
  try {
    const r = await dispatch(sample);
    const email = r.results!.find(x => x.adapter === 'email')!;
    assertEquals(email.ok, false);
    assertEquals(email.error, 'email_disabled');
  } finally {
    restoreFetch();
  }
} });
