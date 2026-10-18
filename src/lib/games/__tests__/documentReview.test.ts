import { describe, it, expect } from "vitest";
import { documentReviewRows, documentSelection } from "../documentReview";
describe("document review", () => {
  it("keeps unknown facts unknown", () => {
    const rows = documentReviewRows({ at_bats: [{ inning: 1, result: null, exit_velo_mph: null }] });
    expect(rows[0].facts).toEqual({ inning: 1, result: null, exit_velo_mph: null });
  });
  it("never selects a draft without explicit review", () => {
    const rows = documentReviewRows({ at_bats: [{ inning: 1, result: "Double" }] });
    expect(documentSelection(rows, new Set())).toEqual({ at_bats: [], pitches: [], defense: [], baserun: [] });
    expect(documentSelection(rows, new Set(["at_bats:0"])).at_bats).toEqual([0]);
  });
  it("refuses missing required facts instead of supplying them", () => {
    const rows = documentReviewRows({ at_bats: [{ result: "Double" }], pitches: [{ inning: 1 }], defense: [{ inning: 1, position: null }], baserun: [{ inning: 1, event_type: "unknown" }] });
    expect(rows.map(row => row.valid)).toEqual([false, false, false, false]);
    expect(documentSelection(rows, new Set(rows.map(row => `${row.kind}:${row.index}`)))).at_bats).toEqual([]);
  });
});