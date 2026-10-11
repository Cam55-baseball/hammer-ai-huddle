import { describe, it, expect } from "vitest";
import { buildReviewQueue } from "../reviewQueue";
import { LIFT_TAG_REVIEW } from "../liftTagReview";

describe("lift tag review", () => {
  it("42 earlier items + 37 newly tagged lifts reach the queue; no lift left out", () => {
    expect(LIFT_TAG_REVIEW).toHaveLength(79);
    const q = buildReviewQueue({ flaggedTsv: "h", howToTsv: "h", catalog: [], cleared: new Set(), liftTag: LIFT_TAG_REVIEW });
    expect(q.filter((i) => i.reasons.includes("lift tag"))).toHaveLength(79);
    expect(q.some((i) => i.slug === "lift_slider_ham_bridge_curl")).toBe(true);
    expect(new Set(LIFT_TAG_REVIEW.map((w) => w.slug)).size).toBe(79);
    // The 10 tags that would change the double-check are suggested, never applied.
    expect(LIFT_TAG_REVIEW.filter((w) => w.note.includes("NOT applied"))).toHaveLength(10);
  });
  it("approved items leave the queue", () => {
    const q = buildReviewQueue({ flaggedTsv: "h", howToTsv: "h", catalog: [], cleared: new Set(["lift_farmer_toe_walk"]), liftTag: LIFT_TAG_REVIEW });
    expect(q.some((i) => i.slug === "lift_farmer_toe_walk")).toBe(false);
  });
});
