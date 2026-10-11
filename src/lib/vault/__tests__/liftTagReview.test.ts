import { describe, it, expect } from "vitest";
import { buildReviewQueue } from "../reviewQueue";
import { LIFT_TAG_REVIEW } from "../liftTagReview";

describe("lift tag review", () => {
  it("37 undecided audit tags + 3 new blueprint exercises reach the queue", () => {
    expect(LIFT_TAG_REVIEW).toHaveLength(40);
    const q = buildReviewQueue({ flaggedTsv: "h", howToTsv: "h", catalog: [], cleared: new Set(), liftTag: LIFT_TAG_REVIEW });
    expect(q.filter((i) => i.reasons.includes("lift tag"))).toHaveLength(40);
    expect(q.some((i) => i.slug === "lift_slider_ham_bridge_curl")).toBe(true);
  });
  it("approved items leave the queue", () => {
    const q = buildReviewQueue({ flaggedTsv: "h", howToTsv: "h", catalog: [], cleared: new Set(["lift_farmer_toe_walk"]), liftTag: LIFT_TAG_REVIEW });
    expect(q.some((i) => i.slug === "lift_farmer_toe_walk")).toBe(false);
  });
});
