/** Canonical setting edits, never executable prose or a second rule catalog. */
export type CueChange = { target: 'wk_movement_catalog'; id: string; field: 'cue'; before: string; after: string };
export type PhilosophyReceipt = { principle_id: string; version: number; version_id: string; changes: CueChange[]; undone?: boolean };
export function cueChanges(value: unknown): CueChange[] {
  if (!Array.isArray(value) || value.length !== 1) throw new Error('Choose one existing TEST cue for this review.');
  return value.map(v => {
    if (!v || v.target !== 'wk_movement_catalog' || v.field !== 'cue' || typeof v.id !== 'string' || !/^[0-9a-f-]{36}$/.test(v.id) || typeof v.before !== 'string' || typeof v.after !== 'string' || !v.after.trim() || v.after.length > 500 || v.before === v.after) throw new Error('A cue change needs its exact saved value and a different replacement.');
    return { target: 'wk_movement_catalog', id: v.id, field: 'cue', before: v.before, after: v.after.trim() };
  });
}