export interface VaultReviewEvent { slug: string; action: string; at: string; detail?: unknown }
/** A gear correction reopens review even when an older text/version approval exists. */
export function pendingEquipmentReviews(events: readonly VaultReviewEvent[]) {
  const latest = new Map<string, VaultReviewEvent>();
  for (const event of events) {
    if (!["equipment_corrected", "review_approved", "make_live"].includes(event.action)) continue;
    if (!Number.isFinite(Date.parse(event.at))) continue;
    const previous = latest.get(event.slug);
    if (!previous || Date.parse(event.at) > Date.parse(previous.at)) latest.set(event.slug, event);
  }
  return [...latest.values()].filter(event => event.action === "equipment_corrected")
    .map(event => ({ slug: event.slug, note: "Required equipment corrected; check the saved before/after gear record." }));
}