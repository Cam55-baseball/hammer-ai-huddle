/** Snapshot rows may participate only through their existing canonical identity.
 * Never parse human-readable dosage or manufacture catalog work from a name. */
export function savedDayCoverage(payload: unknown, rows: readonly Record<string, unknown>[]) {
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as Record<string, unknown>).blocks)) return false;
  const canonical = new Map(rows.filter(row => typeof row.id === "string").map(row => [row.id, row]));
  const represented = new Set<string>();
  for (const block of (payload as { blocks: unknown[] }).blocks) {
    if (!block || typeof block !== "object") return false;
    const b = block as Record<string, unknown>;
    if (b.status !== "ready" || b.replacedByCoachRx) continue;
    if (!Array.isArray(b.drills)) return false;
    for (const drill of b.drills) {
      if (!drill || typeof drill !== "object") return false;
      const saved = drill as Record<string, unknown>;
      const id = saved.prescriptionId;
      if (typeof id !== "string" || !canonical.has(id) || represented.has(id)) return false;
      const row = canonical.get(id);
      if (typeof saved.slug !== "string" || !saved.slug || row?.movement_slug !== saved.slug) return false;
      const modality = b.modality === "defense" ? "fielding" : b.modality;
      if (typeof modality !== "string" || row?.slot !== modality) return false;
      represented.add(id);
    }
  }
  return true;
}