/** Twelve device-calendar weeks since the canonical saved screen; never guess from updated_at. */
export function movementRescreenDue(savedAt: string | null | undefined, today: string): boolean {
  if (!savedAt || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return false;
  const saved = new Date(savedAt);
  if (!Number.isFinite(saved.getTime())) return false;
  const day = `${saved.getFullYear()}-${String(saved.getMonth() + 1).padStart(2, '0')}-${String(saved.getDate()).padStart(2, '0')}`;
  const elapsed = (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`)) / 86400000;
  return Number.isFinite(elapsed) && elapsed >= 84;
}