/**
 * Foundation Fatigue Layer — Wave B.
 *
 * Prevents foundation spam by combining:
 *   1. Exposure score per video (last 30d trace count, exponential decay).
 *   2. Per-domain weekly quota (max foundations per domain in last 7d).
 *   3. Semantic dedupe (domain+scope+top-2 triggers hash).
 *   4. "Too much philosophy" cap when active drill recs exist.
 *
 * Read-side only — never writes; relies on `foundation_recommendation_traces`
 * already being populated by Wave A.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  FoundationDomain,
  FoundationScoreResult,
  FoundationTrigger,
} from './foundationVideos';

export const PER_DOMAIN_WEEKLY_QUOTA = 2;
export const SEMANTIC_DEDUPE_DAYS = 14;
export const EXPOSURE_LOOKBACK_DAYS = 30;
export const EXPOSURE_HALF_LIFE_DAYS = 7;
/** Hard cap on foundations surfaced when other recs are competing for attention. */
export const MAX_FOUNDATIONS_WITH_DRILLS = 1;

export interface FatigueState {
  exposureByVideo: Map<string, number>;
  surfacedDomainsLast7d: Map<FoundationDomain, number>;
  semanticHashesLast14d: Set<string>;
}

interface TraceRow {
  video_id: string;
  created_at: string;
  matched_triggers: string[] | null;
  score_breakdown: { domain?: string } | null;
}

export async function loadFatigueState(userId: string): Promise<FatigueState> {
  const empty: FatigueState = {
    exposureByVideo: new Map(),
    surfacedDomainsLast7d: new Map(),
    semanticHashesLast14d: new Set(),
  };

  const since = new Date(Date.now() - EXPOSURE_LOOKBACK_DAYS * 86_400_000).toISOString();
  let rows: TraceRow[] = [];
  try {
    const { data, error } = await (supabase as any)
      .from('foundation_recommendation_traces')
      .select('video_id, created_at, matched_triggers, score_breakdown, suppressed')
      .eq('user_id', userId)
      .gte('created_at', since)
      .eq('suppressed', false)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    rows = (data ?? []) as TraceRow[];
  } catch (e) {
    console.warn('loadFatigueState failed', e);
    return empty;
  }

  const now = Date.now();
  const cutoff7d = now - 7 * 86_400_000;
  const cutoff14d = now - SEMANTIC_DEDUPE_DAYS * 86_400_000;

  for (const r of rows) {
    const ts = new Date(r.created_at).getTime();
    const ageDays = (now - ts) / 86_400_000;

    // Exponential decay: score = 0.5 ^ (ageDays / halfLife)
    const decay = Math.pow(0.5, ageDays / EXPOSURE_HALF_LIFE_DAYS);
    empty.exposureByVideo.set(
      r.video_id,
      (empty.exposureByVideo.get(r.video_id) ?? 0) + decay,
    );

    if (ts >= cutoff7d) {
      const dom = r.score_breakdown?.domain as FoundationDomain | undefined;
      if (dom) {
        empty.surfacedDomainsLast7d.set(dom, (empty.surfacedDomainsLast7d.get(dom) ?? 0) + 1);
      }
    }

    if (ts >= cutoff14d) {
      const trigs = (r.matched_triggers ?? []).slice().sort().slice(0, 2).join('|');
      empty.semanticHashesLast14d.add(`${r.video_id}|${trigs}`);
    }
  }

  return empty;
}

export interface ApplyFatigueOpts {
  results: FoundationScoreResult[];
  fatigue: FatigueState;
  /** True when other (drill / application) recs are competing this render. */
  competingDrillRecs?: boolean;
  /** Override per-domain weekly quota. */
  perDomainQuota?: number;
  /** Override final cap when drills compete. */
  maxWithDrills?: number;
}

export interface FatigueDecision {
  kept: FoundationScoreResult[];
  suppressed: { result: FoundationScoreResult; reason: SuppressionReason }[];
}

export type SuppressionReason =
  | 'exposure_saturated'
  | 'domain_quota_exceeded'
  | 'semantic_duplicate'
  | 'philosophy_cap';

export function applyFatigue(opts: ApplyFatigueOpts): FatigueDecision {
  const quota = opts.perDomainQuota ?? PER_DOMAIN_WEEKLY_QUOTA;
  const philosophyCap = opts.maxWithDrills ?? MAX_FOUNDATIONS_WITH_DRILLS;
  const kept: FoundationScoreResult[] = [];
  const suppressed: FatigueDecision['suppressed'] = [];

  // Local accumulators reflecting what we just decided to keep.
  const domainCount = new Map<FoundationDomain, number>(opts.fatigue.surfacedDomainsLast7d);
  const seenHashes = new Set<string>(opts.fatigue.semanticHashesLast14d);

  for (const r of opts.results) {
    const dom = r.video.foundation_meta.domain;
    const trigKey = r.matchedTriggers.slice().sort().slice(0, 2).join('|');
    const hash = `${r.video.id}|${trigKey}`;

    // 1. Exposure saturation — if we've shown this exact video heavily
    //    in the last 30d (decayed score >= 3.0), skip it.
    const exposure = opts.fatigue.exposureByVideo.get(r.video.id) ?? 0;
    if (exposure >= 3.0) {
      suppressed.push({ result: r, reason: 'exposure_saturated' });
      continue;
    }

    // 2. Semantic dedupe.
    if (seenHashes.has(hash)) {
      suppressed.push({ result: r, reason: 'semantic_duplicate' });
      continue;
    }

    // 3. Per-domain weekly quota.
    const dc = domainCount.get(dom) ?? 0;
    if (dc >= quota) {
      suppressed.push({ result: r, reason: 'domain_quota_exceeded' });
      continue;
    }

    // 4. Philosophy cap when drills compete.
    if (opts.competingDrillRecs && kept.length >= philosophyCap) {
      suppressed.push({ result: r, reason: 'philosophy_cap' });
      continue;
    }

    kept.push(r);
    domainCount.set(dom, dc + 1);
    seenHashes.add(hash);
  }

  return { kept, suppressed };
}
