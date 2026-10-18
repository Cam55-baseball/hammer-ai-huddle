// Display calculations only; absent records are not a zero rate.
export function recordedRate(completed: number, total: number): number | null {
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0 || completed < 0 || completed > total) return null;
  return (completed / total) * 100;
}

export function recordedChange(current: number | null | undefined, baseline: number | null | undefined): number | null {
  if (current == null || baseline == null || !Number.isFinite(current) || !Number.isFinite(baseline) || current < 0 || baseline <= 0) return null;
  return ((current - baseline) / baseline) * 100;
}