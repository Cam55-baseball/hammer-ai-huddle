export const documentKinds = ["at_bats", "pitches", "defense", "baserun"] as const;
export type DocumentKind = typeof documentKinds[number];
export interface ReviewRow { kind: DocumentKind; index: number; facts: Record<string, unknown>; valid: boolean }
export function documentReviewRows(raw: unknown): ReviewRow[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const source = raw as Record<string, unknown>;
  return documentKinds.flatMap(kind => {
    const rows = source[kind];
    if (!Array.isArray(rows)) return [];
    return rows.map((item, index) => {
      const facts = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
      const inning = facts.inning;
      const validInning = Number.isInteger(inning) && Number(inning) >= 1 && Number(inning) <= 99;
      const valid = validInning && (kind !== "pitches" || ["pitcher", "hitter"].includes(String(facts.perspective))) &&
        (kind !== "defense" || typeof facts.position === "string" && facts.position.trim().length > 0) &&
        (kind !== "baserun" || ["steal", "dirtball_read", "pickoff", "advance", "caught", "tag_up"].includes(String(facts.event_type)));
      return { kind, index, facts, valid };
    });
  });
}
export function documentSelection(rows: ReviewRow[], selected: Set<string>) {
  return Object.fromEntries(documentKinds.map(kind => [kind, rows.filter(row => row.kind === kind && row.valid && selected.has(`${kind}:${row.index}`)).map(row => row.index)]));
}