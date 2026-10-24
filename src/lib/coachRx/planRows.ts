/** Presentation-only partition; retain canonical rows and their logging IDs. */
export function partitionCoachRows<T extends { why_payload?: { coach_rx?: unknown } | null }>(rows: readonly T[]) {
  return {
    hammers: rows.filter(row => typeof row.why_payload?.coach_rx !== "string"),
    coach: rows.filter(row => typeof row.why_payload?.coach_rx === "string"),
  };
}