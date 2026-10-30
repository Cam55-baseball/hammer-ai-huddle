import type { SeasonSettingsLike } from './seasonPhase.ts';
import type { TimelineEntry } from './wic/schedule/timeline.ts';

/** Explicit dated season answers only; future/undone entries never change today's phase. */
export function seasonWithTimeline(settings: SeasonSettingsLike & { season_status_manual_at?: string | null }, entries: readonly TimelineEntry[], date: string): SeasonSettingsLike {
  const entry = entries.filter(e => e.tag === 'SEASON' && !e.undone_at && e.start_date <= date)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (!entry || (settings.season_status_manual_at && settings.season_status_manual_at >= entry.created_at) || (settings.season_status_manual && !settings.season_status_manual_at)) return settings;
  const phase = entry.payload.phase ?? (entry.payload.which === 'ends' ? 'off_season' : entry.payload.which === 'starts' ? 'in_season' : null);
  if (!['off_season', 'in_season', 'preseason', 'post_season'].includes(String(phase))) return settings;
  const end = typeof entry.payload.window_end === 'string' ? entry.payload.window_end : null;
  if (end && date > end) return { ...settings, season_status: 'off_season', season_status_manual: true };
  if (end && phase !== 'off_season') {
    const fields = phase === 'in_season' ? { in_season_start_date: entry.start_date, in_season_end_date: end }
      : phase === 'preseason' ? { preseason_start_date: entry.start_date, preseason_end_date: end }
      : { post_season_start_date: entry.start_date, post_season_end_date: end };
    return { ...settings, ...fields, season_status: String(phase), season_status_manual: false,
      ...(phase === 'in_season' ? { preseason_start_date: null, preseason_end_date: null } : {}) };
  }
  return { ...settings, season_status: String(phase), season_status_manual: true };
}