/**
 * Foundation Trigger State Machine — Wave B.
 *
 * Pure functions + thin Supabase persistence layer. The athlete's
 * developmental "state" is derived from the rolling set of fired
 * triggers, but is *temporally stable*:
 *   - min-dwell prevents flapping
 *   - per-trigger cooldowns prevent re-firing storms
 *   - confidence decays each day until the trigger auto-resolves
 *
 * Never throws into UI code — all DB calls are wrapped and degrade
 * to deterministic in-memory computation on failure.
 */
import { supabase } from '@/integrations/supabase/client';
import type { FoundationTrigger } from './foundationVideos';

export const FOUNDATION_STATES = [
  'healthy_foundation',
  'fragile',
  'active_recovery',
  'lost_feel',
  'post_recovery',
  'chronic_decline',
  'post_layoff_rebuild',
] as const;
export type FoundationState = (typeof FOUNDATION_STATES)[number];

/** Hours each state must dwell before transitioning out (anti-flap). */
export const MIN_DWELL_HOURS: Record<FoundationState, number> = {
  healthy_foundation: 0,
  fragile: 48,
  active_recovery: 48,
  lost_feel: 48,
  post_recovery: 72,
  chronic_decline: 96,
  post_layoff_rebuild: 72,
};

/** Per-trigger cooldown (hours) — won't be re-fired/re-counted within this window. */
export const TRIGGER_COOLDOWN_HOURS: Partial<Record<FoundationTrigger, number>> = {
  new_user_30d: 24 * 30, // effectively non-recurring
  fragile_foundation: 72,
  lost_feel: 72,
  mechanics_decline: 96,
  results_decline: 96,
  pre_season: 24 * 14,
  post_layoff: 24 * 7,
  confidence_low: 48,
  philosophy_drift: 96,
};
const DEFAULT_COOLDOWN_HOURS = 72;

/** Daily decay applied to a trigger's confidence; resolves at <= 0. */
export const CONFIDENCE_DECAY_PER_DAY = 0.1;

// ---------------- Pure derivation ----------------

interface DeriveStateInput {
  activeTriggers: FoundationTrigger[];
  layoffDays?: number;
}

/** Map an active trigger set to a single dominant developmental state. */
export function deriveTargetState(input: DeriveStateInput): {
  state: FoundationState;
  reason: string;
  confidence: number;
} {
  const set = new Set(input.activeTriggers);

  if ((input.layoffDays ?? 0) >= 14 || set.has('post_layoff')) {
    return { state: 'post_layoff_rebuild', reason: 'post_layoff', confidence: 0.85 };
  }
  if (set.has('lost_feel')) {
    return { state: 'lost_feel', reason: 'lost_feel', confidence: 0.8 };
  }
  if (set.has('mechanics_decline') && set.has('results_decline')) {
    return { state: 'chronic_decline', reason: 'mechanics+results', confidence: 0.85 };
  }
  if (set.has('mechanics_decline') || set.has('results_decline')) {
    return { state: 'active_recovery', reason: 'single_decline_axis', confidence: 0.7 };
  }
  if (set.has('fragile_foundation') || set.has('new_user_30d')) {
    return { state: 'fragile', reason: 'fragile_or_new', confidence: 0.7 };
  }
  if (set.has('confidence_low') || set.has('philosophy_drift')) {
    return { state: 'fragile', reason: 'confidence_or_drift', confidence: 0.6 };
  }
  return { state: 'healthy_foundation', reason: 'no_active_triggers', confidence: 0.6 };
}

/**
 * Anti-flap transition guard. Returns the state the athlete should be
 * in *after* applying min-dwell rules.
 */
export function applyDwellGuard(opts: {
  current: FoundationState;
  target: FoundationState;
  enteredAt: Date;
  now?: Date;
}): { next: FoundationState; transitioned: boolean } {
  const now = opts.now ?? new Date();
  if (opts.current === opts.target) return { next: opts.current, transitioned: false };

  const dwellHours = (now.getTime() - opts.enteredAt.getTime()) / 3_600_000;
  const required = MIN_DWELL_HOURS[opts.current] ?? 0;

  // Always allow leaving healthy_foundation (escalation is urgent).
  if (opts.current === 'healthy_foundation') {
    return { next: opts.target, transitioned: true };
  }
  if (dwellHours < required) {
    return { next: opts.current, transitioned: false };
  }
  return { next: opts.target, transitioned: true };
}

// ---------------- Persistence ----------------

export interface FoundationStateRow {
  user_id: string;
  current_state: FoundationState;
  prev_state: FoundationState | null;
  state_entered_at: string;
  confidence: number;
  last_transition_reason: string | null;
}

export async function readFoundationState(userId: string): Promise<FoundationStateRow | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('athlete_foundation_state')
      .select('user_id, current_state, prev_state, state_entered_at, confidence, last_transition_reason')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as FoundationStateRow | null;
  } catch (e) {
    console.warn('readFoundationState failed', e);
    return null;
  }
}

/**
 * Reconcile the persisted state with the freshly derived target.
 * Fire-and-forget from the caller's perspective — failures are logged.
 */
export async function reconcileFoundationState(opts: {
  userId: string;
  activeTriggers: FoundationTrigger[];
  layoffDays?: number;
}): Promise<{ state: FoundationState; transitioned: boolean }> {
  const target = deriveTargetState({
    activeTriggers: opts.activeTriggers,
    layoffDays: opts.layoffDays,
  });

  const existing = await readFoundationState(opts.userId);
  const enteredAt = existing?.state_entered_at ? new Date(existing.state_entered_at) : new Date(0);
  const current = (existing?.current_state ?? 'healthy_foundation') as FoundationState;

  const { next, transitioned } = applyDwellGuard({
    current,
    target: target.state,
    enteredAt,
  });

  try {
    if (!existing) {
      await (supabase as any).from('athlete_foundation_state').insert({
        user_id: opts.userId,
        current_state: next,
        prev_state: null,
        confidence: target.confidence,
        last_transition_reason: target.reason,
      });
    } else if (transitioned) {
      await (supabase as any)
        .from('athlete_foundation_state')
        .update({
          current_state: next,
          prev_state: current,
          state_entered_at: new Date().toISOString(),
          confidence: target.confidence,
          last_transition_reason: target.reason,
        })
        .eq('user_id', opts.userId);
    } else if (Math.abs((existing.confidence ?? 0) - target.confidence) > 0.05) {
      // Update confidence without flipping state.
      await (supabase as any)
        .from('athlete_foundation_state')
        .update({ confidence: target.confidence })
        .eq('user_id', opts.userId);
    }
  } catch (e) {
    console.warn('reconcileFoundationState persistence failed', e);
  }

  return { state: next, transitioned };
}

// ---------------- Trigger event log + cooldown ----------------

/**
 * Record fired triggers, respecting per-trigger cooldowns. Returns
 * the subset of triggers that are NOT currently in cooldown — callers
 * should treat this as the "effective" trigger list for surfacing.
 */
export async function recordAndFilterTriggerCooldown(opts: {
  userId: string;
  triggers: FoundationTrigger[];
}): Promise<FoundationTrigger[]> {
  if (opts.triggers.length === 0) return [];
  const lookbackHours = Math.max(
    ...opts.triggers.map(t => TRIGGER_COOLDOWN_HOURS[t] ?? DEFAULT_COOLDOWN_HOURS),
  );
  const since = new Date(Date.now() - lookbackHours * 3_600_000).toISOString();

  let recent: { trigger: string; fired_at: string }[] = [];
  try {
    const { data, error } = await (supabase as any)
      .from('foundation_trigger_events')
      .select('trigger, fired_at')
      .eq('user_id', opts.userId)
      .gte('fired_at', since)
      .order('fired_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    recent = (data ?? []) as { trigger: string; fired_at: string }[];
  } catch (e) {
    console.warn('cooldown read failed', e);
    // On failure, degrade open — don't block surfacing.
    return opts.triggers;
  }

  const lastFiredMs = new Map<string, number>();
  for (const r of recent) {
    if (!lastFiredMs.has(r.trigger)) {
      lastFiredMs.set(r.trigger, new Date(r.fired_at).getTime());
    }
  }

  const now = Date.now();
  const allowed: FoundationTrigger[] = [];
  const toInsert: { user_id: string; trigger: FoundationTrigger; confidence: number }[] = [];

  for (const t of opts.triggers) {
    const cooldownMs = (TRIGGER_COOLDOWN_HOURS[t] ?? DEFAULT_COOLDOWN_HOURS) * 3_600_000;
    const last = lastFiredMs.get(t);
    const inCooldown = last !== undefined && now - last < cooldownMs;
    if (!inCooldown) {
      allowed.push(t);
      toInsert.push({ user_id: opts.userId, trigger: t, confidence: 0.7 });
    }
  }

  if (toInsert.length > 0) {
    try {
      await (supabase as any).from('foundation_trigger_events').insert(toInsert);
    } catch (e) {
      console.warn('trigger event insert failed', e);
    }
  }
  return allowed;
}
