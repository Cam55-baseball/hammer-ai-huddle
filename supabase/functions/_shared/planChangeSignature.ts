/** Compare prescribed work including its legal season; marked slots remain RPC-protected. */
export function planChangeSignature(rows: readonly Record<string, unknown>[]) {
  return rows.map(row => ['phase', 'movement_slug', 'sets', 'reps', 'duration_seconds', 'distance_feet', 'total_reps']
    .map(key => row[key] ?? '').join(':')).sort().join('|');
}