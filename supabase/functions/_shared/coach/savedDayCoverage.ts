/** Snapshot rows may participate only through their existing canonical identity.
 * Never parse human-readable dosage or manufacture catalog work from a name. */
export function savedDayCoverage(payload: unknown, rows: readonly Record<string, unknown>[]) {
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as Record<string, unknown>).blocks)) return false;
  const canonical = new Set(rows.map(row => row.id).filter(id => typeof id === "string"));
  for (const block of (payload as { blocks: unknown[] }).blocks) {
    if (!block || typeof block !== "object") return false;
    const b = block as Record<string, unknown>;
    if (b.status !== "ready" || b.replacedByCoachRx) continue;
    if (!Array.isArray(b.drills)) return false;
    for (const drill of b.drills) {
      if (!drill || typeof drill !== "object") return false;
      const id = (drill as Record<string, unknown>).prescriptionId;
      if (typeof id !== "string" || !canonical.has(id)) return false;
    }
  }
  return true;
}