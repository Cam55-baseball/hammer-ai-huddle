/**
 * Owner Oct30: at most 3 videos per analysis. Watched videos are not repeated
 * while the pool still has unwatched variety. A saved (hearted) video may be
 * included, but at most one saved video per analysis.
 */
export const MAX_ANALYSIS_VIDEOS = 3;

export function capAnalysisVideos<T>(
  ranked: ReadonlyArray<T>,
  idOf: (v: T) => string,
  watched: ReadonlySet<string>,
  saved: ReadonlySet<string>,
  max = MAX_ANALYSIS_VIDEOS,
): T[] {
  const seen = new Set<string>();
  const pool = ranked.filter((v) => { const id = idOf(v); if (seen.has(id)) return false; seen.add(id); return true; });
  const out: T[] = [];
  let savedUsed = 0;
  const take = (v: T) => {
    const id = idOf(v);
    if (out.length >= max || out.some((o) => idOf(o) === id)) return;
    if (saved.has(id)) { if (savedUsed >= 1) return; savedUsed++; }
    out.push(v);
  };
  // Saved videos are exempt from the watched rule (one at most).
  for (const v of pool) if (!watched.has(idOf(v)) || saved.has(idOf(v))) take(v);
  // Only once unwatched variety is exhausted do watched videos return.
  for (const v of pool) take(v);
  return out;
}
