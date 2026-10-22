import { describe, expect, it } from "vitest";
import { pendingEquipmentReviews } from "../../../../supabase/functions/_shared/vault/equipmentReview";
import { buildReviewQueue } from "../reviewQueue";

describe("catalog equipment owner review", () => {
  const correction = { slug: "db_bench", action: "equipment_corrected", at: "2026-10-22T01:13:00Z" };
  it("reopens previously approved equipment when a newer correction is made", () => {
    const pending = pendingEquipmentReviews([{ ...correction, action: "review_approved", at: "2026-10-21T00:00:00Z" }, correction]);
    const queue = buildReviewQueue({ flaggedTsv: "", howToTsv: "", catalog: [], cleared: new Set(["db_bench"]), equipmentReview: pending });
    expect(queue.map(row => row.slug)).toEqual(["db_bench"]);
  });
  it("clears corrected gear only after a later explicit owner approval", () => {
    expect(pendingEquipmentReviews([correction, { ...correction, action: "review_approved", at: "2026-10-22T02:00:00Z" }])).toEqual([]);
  });
});