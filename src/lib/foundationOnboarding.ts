/**
 * Foundation Onboarding Sequencer + Kill Switches — Wave E.
 *
 * Cold-start guarantee: in the first 30 days, athletes get a curated
 * 1-per-week ramp from beginner-safe foundations only. No advanced
 * philosophies until accountAgeDays >= 14 AND >=10 reps logged.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  FoundationAudience,
  FoundationScoreResult,
  FoundationVideoCandidate,
} from './foundationVideos';

const ADVANCED_GATE_DAYS = 14;
const ADVANCED_GATE_REPS = 10;
const COLD_START_DAYS = 30;

/**
 * Returns true if this candidate is allowed under cold-start rules.
 * Beginner-safe = audience includes new_to_sport / beginner / all_levels.
 */
export function isBeginnerSafe(c: FoundationVideoCandidate): boolean {
  const a = c.foundation_meta.audience_levels as FoundationAudience[];
  return a.includes('new_to_sport') || a.includes('beginner') || a.includes('all_levels');
}

export interface OnboardingGate {
  inColdStart: boolean;
  advancedAllowed: boolean;
  weeklyCap: number; // recommendations allowed this week during cold start
}

export function computeOnboardingGate(opts: {
  accountAgeDays: number;
  totalRepsLogged: number;
}): OnboardingGate {
  const inColdStart = opts.accountAgeDays <= COLD_START_DAYS;
  const advancedAllowed =
    opts.accountAgeDays >= ADVANCED_GATE_DAYS && opts.totalRepsLogged >= ADVANCED_GATE_REPS;
  return { inColdStart, advancedAllowed, weeklyCap: 1 };
}

/**
 * Filter results under cold-start rules. Cap to weekly quota and remove
 * advanced-only foundations until the athlete has earned the unlock.
 */
export function applyOnboardingGate(opts: {
  results: FoundationScoreResult[];
  gate: OnboardingGate;
  surfacedThisWeek: number;
}): { kept: FoundationScoreResult[]; suppressed: FoundationScoreResult[] } {
  if (!opts.gate.inColdStart) return { kept: opts.results, suppressed: [] };

  const kept: FoundationScoreResult[] = [];
  const suppressed: FoundationScoreResult[] = [];
  let weekUsed = opts.surfacedThisWeek;

  for (const r of opts.results) {
    const a = r.video.foundation_meta.audience_levels as FoundationAudience[];
    const onlyAdvanced = a.length > 0 && a.every(x => x === 'advanced');
    if (onlyAdvanced && !opts.gate.advancedAllowed) {
      suppressed.push(r);
      continue;
    }
    if (!isBeginnerSafe(r.video) && !opts.gate.advancedAllowed) {
      suppressed.push(r);
      continue;
    }
    if (weekUsed >= opts.gate.weeklyCap) {
      suppressed.push(r);
      continue;
    }
    kept.push(r);
    weekUsed += 1;
  }
  return { kept, suppressed };
}

// ---------------- Kill switches ----------------

export interface FoundationKillSwitches {
  enabled: boolean;
  learningEnabled: boolean;
  stateMachineEnabled: boolean;
  fatigueEnabled: boolean;
  rolloutPct: number; // 0–100
}

const DEFAULTS: FoundationKillSwitches = {
  enabled: true,
  learningEnabled: true,
  stateMachineEnabled: true,
  fatigueEnabled: true,
  rolloutPct: 100,
};

let cached: { value: FoundationKillSwitches; ts: number } | null = null;
const CACHE_MS = 60_000;

export async function readFoundationKillSwitches(): Promise<FoundationKillSwitches> {
  if (cached && Date.now() - cached.ts < CACHE_MS) return cached.value;
  try {
    const { data } = await (supabase as any)
      .from('engine_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'foundations_enabled',
        'foundations_learning_enabled',
        'foundations_state_machine_enabled',
        'foundations_fatigue_enabled',
        'foundations_rollout_pct',
      ]);
    const value = { ...DEFAULTS };
    for (const row of (data ?? []) as { setting_key: string; setting_value: any }[]) {
      const v = row.setting_value;
      const raw = typeof v === 'object' && v !== null && 'value' in v ? (v as any).value : v;
      switch (row.setting_key) {
        case 'foundations_enabled': value.enabled = raw !== false; break;
        case 'foundations_learning_enabled': value.learningEnabled = raw !== false; break;
        case 'foundations_state_machine_enabled': value.stateMachineEnabled = raw !== false; break;
        case 'foundations_fatigue_enabled': value.fatigueEnabled = raw !== false; break;
        case 'foundations_rollout_pct': {
          const n = Number(raw);
          if (Number.isFinite(n)) value.rolloutPct = Math.max(0, Math.min(100, n));
          break;
        }
      }
    }
    cached = { value, ts: Date.now() };
    return value;
  } catch (e) {
    console.warn('readFoundationKillSwitches failed; using defaults', e);
    return DEFAULTS;
  }
}

/** Deterministic per-user rollout: hash userId → bucket 0–99. */
export function userInRollout(userId: string, pct: number): boolean {
  if (pct >= 100) return true;
  if (pct <= 0) return false;
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = ((h << 5) - h) + userId.charCodeAt(i);
    h |= 0;
  }
  const bucket = Math.abs(h) % 100;
  return bucket < pct;
}
