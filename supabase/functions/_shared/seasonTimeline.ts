import type { SeasonSettingsLike } from './seasonPhase.ts';
import type { TimelineEntry } from './wic/schedule/timeline.ts';

/** Explicit dated season answers only; future/undone entries never change today's phase. */
export function seasonWithTimeline(settings: SeasonSettingsLike & { season_status_manual_at?: string | null }, entries: readonly TimelineEntry[], date: string): SeasonSettingsLike {
  const entry = entries.filter(e => e.tag === 'SEASON' && !e.undone_at && e.start_date <= date)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (!entry || (settings.season_status_manual && (!settings.season_status_manual_at || settings.season_status_manual_at >= entry.created_at))) return settings;
  const phase = entry.payload.phase ?? (entry.payload.which === 'ends' ? 'off_season' : entry.payload.which === 'starts' ? 'in_season' : null);
  if (!['off_season', 'in_season', 'preseason', 'post_season'].includes(String(phase))) return settings;
  return { ...settings, season_status: String(phase), season_status_manual: true };
}