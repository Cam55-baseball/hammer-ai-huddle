const LEG = new Set(['ankle','knee','hip','hamstring','groin','quad','calf','foot']);
/** Structured, unresolved restrictions only; never diagnose a note or interpret healed history. */
export function activeRestrictedAreas(raw: unknown): string[] {
  return Array.isArray(raw) ? [...new Set(raw.flatMap(r=>r&&typeof r==='object'&&typeof r.region==='string'&&r.recovery_status!=='healed'&&['active','pain','managing','moderate','acute','severe'].includes(r.recovery_status??r.severity)?[r.region.trim().toLowerCase()]:[]))] : [];
}
export function restrictedConditioningReason(regions: readonly string[]): string|null {
  return regions.some(r=>LEG.has(r)) ? `Because your ${regions.filter(r=>LEG.has(r)).join(' and ')} restriction blocks running, use the existing easy-flush conditioning instead: seated stationary bike only, at a comfortable pace, arms relaxed. No running, walking, bouncing or standing pedaling. Only do this if it is pain-free and within your professional's restrictions; otherwise stop and update Hammers. This is conditioning, not a running session.` : null;
}