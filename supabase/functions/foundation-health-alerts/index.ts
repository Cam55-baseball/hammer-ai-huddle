// Foundation Health Alerts monitor — Phase H3 + Phase I.
// Cron-callable. Evaluates threshold-based health checks and writes
// auto-resolving rows into public.foundation_health_alerts.
//
// Phase I: thresholds imported from the shared canonical module
// (../_shared/foundationThresholds.ts). No mirrored constants here.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {
  CRON_STALE_MIN,
  ALERT,
  SYSTEM_USER_ID,
  type AlertSeverity,
} from '../_shared/foundationThresholds.ts';
import { dispatch } from '../_shared/notificationAdapters.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Eval {
  key: string;
  fired: boolean;
  severity?: AlertSeverity;
  title?: string;
  detail?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const t0 = Date.now();
  const evals: Eval[] = [];

  try {
    // 1) Cron heartbeat staleness — one alert per function.
    const beatNames = Object.keys(CRON_STALE_MIN);
    const { data: beats } = await supabase
      .from('foundation_cron_heartbeats')
      .select('function_name, ran_at, status')
      .in('function_name', beatNames)
      .order('ran_at', { ascending: false })
      .limit(500);
    const latest = new Map<string, { ran_at: string; status: string }>();
    for (const b of (beats ?? []) as any[]) {
      if (!latest.has(b.function_name)) latest.set(b.function_name, b);
    }
    const now = Date.now();
    for (const fn of beatNames) {
      const b = latest.get(fn);
      const maxAge = CRON_STALE_MIN[fn];
      if (!b) {
        evals.push({
          key: `cron_missing:${fn}`,
          fired: true,
          severity: 'warning',
          title: `No heartbeat from ${fn}`,
          detail: { function: fn, expected_within_min: maxAge },
        });
        continue;
      }
      const ageMin = (now - new Date(b.ran_at).getTime()) / 60_000;
      if (ageMin > maxAge * ALERT.HEARTBEAT_MISSING_CRIT_RATIO || b.status !== 'ok') {
        evals.push({
          key: `cron_missing:${fn}`,
          fired: true,
          severity: 'critical',
          title: `${fn} heartbeat ${b.status !== 'ok' ? 'errored' : 'critically stale'}`,
          detail: { function: fn, age_min: Math.round(ageMin), status: b.status, ran_at: b.ran_at },
        });
      } else if (ageMin > maxAge) {
        evals.push({
          key: `cron_missing:${fn}`,
          fired: true,
          severity: 'warning',
          title: `${fn} heartbeat stale`,
          detail: { function: fn, age_min: Math.round(ageMin), expected_within_min: maxAge },
        });
      } else {
        evals.push({ key: `cron_missing:${fn}`, fired: false });
      }
    }

    // 2) Suppression rate over last 24h (excluding system user).
    const since24 = new Date(now - 86_400_000).toISOString();
    const { data: tr } = await supabase
      .from('foundation_recommendation_traces')
      .select('suppressed')
      .neq('user_id', SYSTEM_USER_ID)
      .gte('created_at', since24)
      .limit(20_000);
    const total = (tr ?? []).length;
    const supp = (tr ?? []).filter((r: any) => r.suppressed).length;
    if (total >= ALERT.SUPPRESSION_MIN_SAMPLE) {
      const rate = supp / total;
      let sev: AlertSeverity | null = null;
      if (rate >= ALERT.SUPPRESSION_RATE_CRIT) sev = 'critical';
      else if (rate >= ALERT.SUPPRESSION_RATE_WARN) sev = 'warning';
      if (sev) {
        evals.push({
          key: 'suppression_rate_high',
          fired: true,
          severity: sev,
          title: `Suppression rate ${(rate * 100).toFixed(1)}% in last 24h`,
          detail: { total, suppressed: supp, rate: Number(rate.toFixed(3)) },
        });
      } else {
        evals.push({ key: 'suppression_rate_high', fired: false });
      }
    } else {
      evals.push({ key: 'suppression_rate_high', fired: false });
    }

    // 3) Unresolved triggers (org-wide).
    const { count: unresolved } = await supabase
      .from('foundation_trigger_events')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null);
    {
      const n = unresolved ?? 0;
      let sev: AlertSeverity | null = null;
      if (n >= ALERT.UNRESOLVED_TRIGGERS_CRIT) sev = 'critical';
      else if (n >= ALERT.UNRESOLVED_TRIGGERS_WARN) sev = 'warning';
      if (sev) {
        evals.push({
          key: 'unresolved_triggers_high',
          fired: true,
          severity: sev,
          title: `${n} unresolved triggers`,
          detail: { count: n },
        });
      } else {
        evals.push({ key: 'unresolved_triggers_high', fired: false });
      }
    }

    // 4) Stuck triggers >30d.
    const stuckBefore = new Date(now - ALERT.STUCK_TRIGGER_DAYS * 86_400_000).toISOString();
    const { count: stuck } = await supabase
      .from('foundation_trigger_events')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null)
      .lt('fired_at', stuckBefore);
    {
      const n = stuck ?? 0;
      let sev: AlertSeverity | null = null;
      if (n >= ALERT.STUCK_TRIGGER_CRIT) sev = 'critical';
      else if (n >= ALERT.STUCK_TRIGGER_WARN) sev = 'warning';
      if (sev) {
        evals.push({
          key: 'stuck_triggers',
          fired: true,
          severity: sev,
          title: `${n} triggers stuck > ${ALERT.STUCK_TRIGGER_DAYS}d`,
          detail: { count: n, threshold_days: ALERT.STUCK_TRIGGER_DAYS },
        });
      } else {
        evals.push({ key: 'stuck_triggers', fired: false });
      }
    }

    // 5) Replay mismatch rate over last 24h (Phase I).
    const { data: ro } = await supabase
      .from('foundation_replay_outcomes')
      .select('matched')
      .gte('ran_at', since24)
      .limit(5_000);
    const roTotal = (ro ?? []).length;
    const roMismatch = (ro ?? []).filter((r: any) => r.matched === false).length;
    if (roTotal >= ALERT.REPLAY_MISMATCH_MIN_SAMPLE) {
      const rate = roMismatch / roTotal;
      let sev: AlertSeverity | null = null;
      if (rate >= ALERT.REPLAY_MISMATCH_CRIT) sev = 'critical';
      else if (rate >= ALERT.REPLAY_MISMATCH_WARN) sev = 'warning';
      if (sev) {
        evals.push({
          key: 'replay_mismatch_high',
          fired: true,
          severity: sev,
          title: `Replay mismatch ${(rate * 100).toFixed(1)}% in last 24h`,
          detail: { total: roTotal, mismatched: roMismatch, rate: Number(rate.toFixed(3)) },
        });
      } else {
        evals.push({ key: 'replay_mismatch_high', fired: false });
      }
    } else {
      evals.push({ key: 'replay_mismatch_high', fired: false });
    }

    // Apply: upsert/refresh fired alerts; auto-resolve cleared keys.
    let opened = 0; let refreshed = 0; let resolved = 0;
    const newlyOpened: Eval[] = [];
    for (const e of evals) {
      const { data: existing } = await supabase
        .from('foundation_health_alerts')
        .select('id, severity')
        .eq('alert_key', e.key)
        .is('resolved_at', null)
        .maybeSingle();

      if (e.fired) {
        if (existing) {
          await supabase
            .from('foundation_health_alerts')
            .update({
              last_seen_at: new Date().toISOString(),
              severity: e.severity!,
              title: e.title!,
              detail: e.detail ?? {},
            })
            .eq('id', existing.id);
          refreshed += 1;
        } else {
          await supabase.from('foundation_health_alerts').insert({
            alert_key: e.key,
            severity: e.severity!,
            title: e.title!,
            detail: e.detail ?? {},
          });
          opened += 1;
          newlyOpened.push(e);
        }
      } else if (existing) {
        await supabase
          .from('foundation_health_alerts')
          .update({ resolved_at: new Date().toISOString() })
          .eq('id', existing.id);
        resolved += 1;
      }
    }

    // Notification fan-out (no-op unless FOUNDATION_NOTIFICATIONS_ENABLED=true).
    for (const e of newlyOpened) {
      await dispatch({
        key: e.key,
        severity: e.severity!,
        title: e.title!,
        detail: e.detail,
      }).catch(() => {/* never block */});
    }

    await supabase.from('foundation_cron_heartbeats').insert({
      function_name: 'foundation-health-alerts',
      duration_ms: Date.now() - t0,
      status: 'ok',
      metadata: { opened, refreshed, resolved, evaluated: evals.length },
    });

    return new Response(JSON.stringify({ ok: true, opened, refreshed, resolved, evaluated: evals.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    await supabase.from('foundation_cron_heartbeats').insert({
      function_name: 'foundation-health-alerts',
      duration_ms: Date.now() - t0,
      status: 'error',
      error: String((e as Error).message ?? e),
    });
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
