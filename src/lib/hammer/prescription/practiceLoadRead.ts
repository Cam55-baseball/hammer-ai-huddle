/** A capped history is not a complete weekly load. Never silently use its partial totals. */
export const PRACTICE_HISTORY_LIMIT = 1000;

export async function readPracticeLoadSources<T, U>(sources: {
  sessions: PromiseLike<{ data: T[] | null; error: unknown }>;
  logs: PromiseLike<{ data: U[] | null; error: unknown }>;
}): Promise<{ sessions: T[]; logs: U[] }> {
  const [sessions, logs] = await Promise.all([sources.sessions, sources.logs]);
  if (sessions.error) throw sessions.error;
  if (logs.error) throw logs.error;
  if (!sessions.data || !logs.data) throw new Error('Practice history was not returned. Try again.');
  if (sessions.data.length >= PRACTICE_HISTORY_LIMIT || logs.data.length >= PRACTICE_HISTORY_LIMIT) {
    throw new Error('Could not read your complete practice history. Try again.');
  }
  return { sessions: sessions.data, logs: logs.data };
}