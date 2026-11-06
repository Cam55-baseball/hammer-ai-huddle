// Confirms a saved health row matches what the screen sent.
// Timestamps come back from the database as "+00:00" instead of "Z", so they
// are compared as instants, not as text. Everything else must match exactly.
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function sameValue(sent: unknown, saved: unknown): boolean {
  if (typeof sent === 'string' && typeof saved === 'string' && ISO_INSTANT.test(sent) && ISO_INSTANT.test(saved)) {
    const a = Date.parse(sent), b = Date.parse(saved);
    if (!Number.isNaN(a) && !Number.isNaN(b)) return a === b;
  }
  return JSON.stringify(sent ?? null) === JSON.stringify(saved ?? null);
}

export function healthSaveConfirmed(sent: Record<string, unknown>, saved: Record<string, unknown> | null | undefined): boolean {
  if (!saved) return false;
  return Object.entries(sent).every(([key, value]) => sameValue(value, saved[key]));
}
