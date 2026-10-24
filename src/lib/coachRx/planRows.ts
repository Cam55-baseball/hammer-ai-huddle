/** Presentation-only partition; retain canonical rows and their logging IDs. */
export function partitionCoachRows<T extends { why_payload?: unknown }>(rows: readonly T[]) {
  const isCoach = (row: T) => {
    const payload = row.why_payload;
    return payload !== null && typeof payload === "object" && "coach_rx" in payload && typeof payload.coach_rx === "string";
  };
  return {
    hammers: rows.filter(row => !isCoach(row)),
    coach: rows.filter(isCoach),
  };
}