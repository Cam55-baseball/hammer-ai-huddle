/**
 * TEST-only catalog items (wk_movement_catalog.visible_to set) may be read
 * only by the listed accounts. Every player/coach-readable list must apply
 * this — the server builder (wk-generate-daily) and Swap (plan-swap) apply
 * the same rule.
 */
export function canSeeCatalogRow(
  row: { visible_to?: string[] | null },
  viewerId: string | null | undefined,
): boolean {
  if (!Array.isArray(row.visible_to)) return true;
  return !!viewerId && row.visible_to.includes(viewerId);
}

/** PostgREST filter for the same rule. */
export function catalogVisibilityFilter(viewerId: string | null | undefined): string {
  return viewerId ? `visible_to.is.null,visible_to.cs.{${viewerId}}` : "visible_to.is.null";
}
