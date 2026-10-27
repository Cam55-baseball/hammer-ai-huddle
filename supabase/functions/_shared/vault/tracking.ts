/** Live tracking labels do not convert counts into durations or change training doses. */
export const TRACKING_UNITS: Record<string, string> = {
  weight_reps: 'reps', reps: 'reps', hold_seconds: 'seconds', duration: 'seconds',
  sprint_time: 'seconds', jump_distance: 'feet', jump_height: 'inches',
  throw_count: 'throws', velocity: 'mph', bat_speed: 'mph', exit_velocity: 'mph',
  swing_count: 'swings', check_off: 'checkoff', bunt_attempts: 'attempts',
};
export function trackingProjection(payload: Record<string, unknown>) {
  const measure = String(payload.measure_type ?? '');
  return { tracking_measure_type: measure, dosage_unit: TRACKING_UNITS[measure] ?? 'reps' };
}
export function applyLiveTracking<T extends { slug: string }>(catalog: readonly T[], versions: readonly { slug: string; version: number; effective_from: string; payload: unknown; undone_at?: string | null }[], date: string) {
  const live = new Map<string, typeof versions[number]>();
  for (const version of versions) {
    if (version.undone_at || version.effective_from > date) continue;
    if ((live.get(version.slug)?.version ?? -1) < version.version) live.set(version.slug, version);
  }
  return catalog.map(row => {
    const payload = live.get(row.slug)?.payload;
    return payload && typeof payload === 'object' ? { ...row, tracking_measure_type: trackingProjection(payload as Record<string, unknown>).tracking_measure_type } : row;
  });
}