/**
 * Phase Quarter resolver — slices offseason into Q1-Q4 from each user's Season Dates.
 *
 * Mirror of supabase/functions/_shared/wkPhaseQuarter.ts — keep in sync.
 *
 * The 4-quarter offseason model (per Hammer doctrine):
 *   - OS Q1-Q2: Double-eccentric compounds + KOT supplementals, Speed q48h
 *   - OS Q3-Q4: Eccentric compounds + Functional Patterning, Speed q72h
 *   - In-season: Concentric primer + FP pre-pregame, Speed q96h
 *   - Post-season: Decompress / concentric primer + mixed mobility
 */
import { resolveSeasonPhase, normalizeSeasonStatus, type SeasonSettingsLike } from '@/lib/seasonPhase';

export type WkPhase =
  | 'os_q1'
  | 'os_q2'
  | 'os_q3'
  | 'os_q4'
  | 'in_season'
  | 'post_season';

export interface WkPhaseResolution {
  phase: WkPhase;
  displayName: string;
  source: 'date_window' | 'stored' | 'default';
  daysIntoQuarter: number | null;
  daysUntilNextQuarter: number | null;
}

const QUARTER_LABEL: Record<WkPhase, string> = {
  os_q1: 'Offseason Q1 — Strength & Capacity',
  os_q2: 'Offseason Q2 — Power Build',
  os_q3: 'Offseason Q3 — Elastic Transfer',
  os_q4: 'Offseason Q4 — Sport Sharpen',
  in_season: 'In-Season — Strength Primer',
  post_season: 'Post-Season — Decompress',
};

/**
 * Resolve which workout phase quarter the user is in TODAY based on Season Dates.
 *
 * Off-season is defined as the gap between post_season_end → next preseason_start
 * (or, if no future preseason is set, the gap from post_season_end onward).
 *
 * If the user has no season dates configured, we default to OS Q1 so they still
 * get an elite, conservative starting block instead of a blank screen.
 */
export function resolveWkPhase(
  settings: SeasonSettingsLike | null | undefined,
  now: Date = new Date(),
): WkPhaseResolution {
  const normalized = settings
    ? { ...settings, season_status: normalizeSeasonStatus(settings.season_status) ?? settings.season_status }
    : settings;
  const seasonRes = resolveSeasonPhase(normalized);

  if (seasonRes.phase === 'in_season') {
    return {
      phase: 'in_season',
      displayName: QUARTER_LABEL.in_season,
      source: seasonRes.source,
      daysIntoQuarter: seasonRes.daysIntoPhase,
      daysUntilNextQuarter: seasonRes.daysUntilNextPhase,
    };
  }
  if (seasonRes.phase === 'post_season') {
    return {
      phase: 'post_season',
      displayName: QUARTER_LABEL.post_season,
      source: seasonRes.source,
      daysIntoQuarter: seasonRes.daysIntoPhase,
      daysUntilNextQuarter: seasonRes.daysUntilNextPhase,
    };
  }

  // Preseason rolls forward into the final offseason quarter (Q4 ramp).
  if (seasonRes.phase === 'preseason') {
    return {
      phase: 'os_q4',
      displayName: QUARTER_LABEL.os_q4,
      source: seasonRes.source,
      daysIntoQuarter: seasonRes.daysIntoPhase,
      daysUntilNextQuarter: seasonRes.daysUntilNextPhase,
    };
  }

  // Guard: if resolveSeasonPhase defaulted (no signal at all) but the athlete
  // stored a non-off_season status, honor the stored status instead of showing
  // "Offseason Q1". Prevents drift between profile + WK cards.
  if (seasonRes.source === 'default') {
    const stored = (settings?.season_status ?? '').toString();
    if (stored === 'in_season') {
      return { phase: 'in_season', displayName: QUARTER_LABEL.in_season, source: 'stored', daysIntoQuarter: null, daysUntilNextQuarter: null };
    }
    if (stored === 'post_season') {
      return { phase: 'post_season', displayName: QUARTER_LABEL.post_season, source: 'stored', daysIntoQuarter: null, daysUntilNextQuarter: null };
    }
    if (stored === 'preseason') {
      return { phase: 'os_q4', displayName: QUARTER_LABEL.os_q4, source: 'stored', daysIntoQuarter: null, daysUntilNextQuarter: null };
    }
  }


  // Offseason — slice into 4 quarters between post_season_end and next preseason_start.
  const postEnd = parseDate(settings?.post_season_end_date);
  const preStart = parseDate(settings?.preseason_start_date);

  if (postEnd && preStart && preStart > postEnd) {
    const totalMs = preStart.getTime() - postEnd.getTime();
    const elapsed = Math.max(0, now.getTime() - postEnd.getTime());
    const frac = Math.min(1, elapsed / totalMs);
    const quarter = frac < 0.25 ? 'os_q1' : frac < 0.5 ? 'os_q2' : frac < 0.75 ? 'os_q3' : 'os_q4';
    const qLen = totalMs / 4;
    const intoQ = elapsed - Math.floor(frac * 4) * qLen;
    return {
      phase: quarter,
      displayName: QUARTER_LABEL[quarter],
      source: 'date_window',
      daysIntoQuarter: Math.floor(intoQ / 86400000),
      daysUntilNextQuarter: Math.floor((qLen - intoQ) / 86400000),
    };
  }

  // No clear window — assume OS Q1 (conservative, foundation-first).
  return {
    phase: 'os_q1',
    displayName: QUARTER_LABEL.os_q1,
    source: 'default',
    daysIntoQuarter: null,
    daysUntilNextQuarter: null,
  };
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return Number.isFinite(d.getTime()) ? d : null;
}

export function isOffseasonPhase(p: WkPhase): boolean {
  return p === 'os_q1' || p === 'os_q2' || p === 'os_q3' || p === 'os_q4';
}
