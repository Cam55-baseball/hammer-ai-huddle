import type { CirculationInput, OwnerDrillRow } from './ownerDrills';

export const DRILL_HISTORY_LIMIT = 1000;
export interface EngagementRow { drill_id: string; event: string; created_at: string }
export interface UsageRow { drill_id: string; completed: number; returned: number }

/** Usage is rotation evidence, never proof that a drill improved performance. */
export function projectDrillHistory(events: readonly EngagementRow[]) {
  const served: Record<string, number> = {};
  const completedOn: Record<string, string> = {};
  const latest: Record<string, number> = {};
  for (const row of events) {
    if (!row.drill_id || !Number.isFinite(Date.parse(row.created_at))) continue;
    if (row.event === 'served') served[row.drill_id] = (served[row.drill_id] ?? 0) + 1;
    if (row.event === 'completed') {
      const timestamp = Date.parse(row.created_at);
      if (latest[row.drill_id] === undefined || timestamp > latest[row.drill_id]) {
        latest[row.drill_id] = timestamp;
        completedOn[row.drill_id] = new Date(timestamp).toISOString().slice(0, 10);
      }
    }
  }
  return { served, completedOn };
}

export async function readDrillCirculation(sources: {
  owner: PromiseLike<{ data: OwnerDrillRow[] | null; error: unknown }>;
  usage: PromiseLike<{ data: UsageRow[] | null; error: unknown }>;
  events: PromiseLike<{ data: EngagementRow[] | null; error: unknown }>;
}) {
  const [owner, totals, events] = await Promise.all([sources.owner, sources.usage, sources.events]);
  for (const source of [owner, totals, events]) {
    if (source.error) throw source.error;
    if (!source.data) throw new Error('Drill history was not returned.');
    if (source.data.length >= DRILL_HISTORY_LIMIT) throw new Error('Complete drill history is unavailable.');
  }
  const usage: CirculationInput['usage'] = {};
  for (const row of totals.data ?? []) {
    if (Number.isFinite(row.completed) && row.completed >= 0 && Number.isFinite(row.returned) && row.returned >= 0) {
      usage[row.drill_id] = { completed: row.completed, returned: row.returned };
    }
  }
  return { rows: owner.data ?? [], usage, ...projectDrillHistory(events.data ?? []) };
}