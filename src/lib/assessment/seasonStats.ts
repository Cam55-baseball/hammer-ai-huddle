/** Optional player-reported stats: blank stays missing, never becomes zero. */
export function parseSeasonStats(values: Readonly<Record<string, string>>): Record<string, number> | null {
  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(values)) {
    if (!raw.trim()) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return null;
    result[key] = value;
  }
  return result;
}