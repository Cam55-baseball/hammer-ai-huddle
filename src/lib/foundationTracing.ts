/**
 * Foundation recommendation tracing — Wave A observability backbone.
 * Persists every surfaced (or suppressed) Foundation candidate so the
 * admin can replay any historical recommendation deterministically.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  FOUNDATION_RECOMMENDATION_VERSION,
  FOUNDATION_META_VERSION,
  type FoundationScoreResult,
  type FoundationTrigger,
} from './foundationVideos';

export type SurfaceOrigin =
  | 'library'
  | 'hammer'
  | 'today_tip'
  | 'onboarding'
  | 'recovery_flow'
  | 'admin_replay';

export interface TraceRow {
  user_id: string;
  video_id: string;
  surface_origin: SurfaceOrigin;
  active_triggers: FoundationTrigger[];
  matched_triggers: FoundationTrigger[];
  raw_score: number;
  final_score: number;
  score_breakdown: Record<string, unknown>;
  recommendation_version: number;
  engine_version?: string | null;
  snapshot_version?: string | null;
  foundation_meta_version: number;
  suppressed?: boolean;
  suppression_reason?: string | null;
}

export function buildTraceRows(opts: {
  userId: string;
  surface: SurfaceOrigin;
  activeTriggers: FoundationTrigger[];
  results: FoundationScoreResult[];
  engineVersion?: string | null;
  snapshotVersion?: string | null;
}): TraceRow[] {
  return opts.results.map(r => ({
    user_id: opts.userId,
    video_id: r.video.id,
    surface_origin: opts.surface,
    active_triggers: opts.activeTriggers,
    matched_triggers: r.matchedTriggers,
    raw_score: r.breakdown.preTier,
    final_score: r.score,
    score_breakdown: r.breakdown as unknown as Record<string, unknown>,
    recommendation_version: FOUNDATION_RECOMMENDATION_VERSION,
    engine_version: opts.engineVersion ?? null,
    snapshot_version: opts.snapshotVersion ?? null,
    foundation_meta_version: FOUNDATION_META_VERSION,
    suppressed: false,
    suppression_reason: null,
  }));
}

let inFlight = false;
const queue: TraceRow[] = [];

/**
 * Fire-and-forget batched insert. Never throws into the render path.
 * De-duplicates within the current tab via a simple per-tab key set.
 */
const sentKeys = new Set<string>();

export function enqueueFoundationTraces(rows: TraceRow[]) {
  if (!rows.length) return;
  for (const r of rows) {
    const key = `${r.user_id}|${r.video_id}|${r.surface_origin}|${r.matched_triggers.sort().join(',')}`;
    if (sentKeys.has(key)) continue;
    sentKeys.add(key);
    queue.push(r);
  }
  if (sentKeys.size > 500) {
    // bound memory
    const arr = Array.from(sentKeys);
    sentKeys.clear();
    arr.slice(-250).forEach(k => sentKeys.add(k));
  }
  void flush();
}

async function flush() {
  if (inFlight || queue.length === 0) return;
  inFlight = true;
  const batch = queue.splice(0, queue.length);
  try {
    await (supabase as any)
      .from('foundation_recommendation_traces')
      .insert(batch);
  } catch (e) {
    // swallow — observability must never break UX
    console.warn('foundation trace insert failed', e);
  } finally {
    inFlight = false;
    if (queue.length > 0) void flush();
  }
}

/* ----------------------------- Wave G companion logging ----------------------------- */

export interface FatigueDecisionRow {
  user_id: string;
  video_id: string;
  kept: boolean;
  reason?: string | null;
  exposure_score?: number | null;
  snapshot?: Record<string, unknown>;
}

export interface OnboardingDecisionRow {
  user_id: string;
  video_id: string;
  kept: boolean;
  reason?: string | null;
  account_age_days?: number | null;
  weekly_count?: number | null;
  snapshot?: Record<string, unknown>;
}

const fQueue: FatigueDecisionRow[] = [];
const oQueue: OnboardingDecisionRow[] = [];
let fInFlight = false;
let oInFlight = false;

export function enqueueFatigueDecisions(rows: FatigueDecisionRow[]) {
  if (!rows.length) return;
  fQueue.push(...rows);
  void flushDecisions('fatigue');
}

export function enqueueOnboardingDecisions(rows: OnboardingDecisionRow[]) {
  if (!rows.length) return;
  oQueue.push(...rows);
  void flushDecisions('onboarding');
}

async function flushDecisions(kind: 'fatigue' | 'onboarding') {
  if (kind === 'fatigue') {
    if (fInFlight || fQueue.length === 0) return;
    fInFlight = true;
    const batch = fQueue.splice(0, fQueue.length);
    try {
      await (supabase as any).from('foundation_fatigue_decisions').insert(batch);
    } catch (e) {
      console.warn('fatigue decision insert failed', e);
    } finally {
      fInFlight = false;
      if (fQueue.length > 0) void flushDecisions('fatigue');
    }
  } else {
    if (oInFlight || oQueue.length === 0) return;
    oInFlight = true;
    const batch = oQueue.splice(0, oQueue.length);
    try {
      await (supabase as any).from('foundation_onboarding_decisions').insert(batch);
    } catch (e) {
      console.warn('onboarding decision insert failed', e);
    } finally {
      oInFlight = false;
      if (oQueue.length > 0) void flushDecisions('onboarding');
    }
  }
}
