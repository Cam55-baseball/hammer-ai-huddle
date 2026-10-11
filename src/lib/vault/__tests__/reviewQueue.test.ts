import { describe, it, expect } from "vitest";
import { buildReviewQueue } from "../reviewQueue";

const flaggedTsv = "slug\tdesc\twhy\na_move\tx\tthin setup\nb_move\tx\tunsure\n";
const howToTsv = "slug\tname\tcat\twhy\tdesc\na_move\tA\tc\tsafest version\nc_move\tC\tc\tfiller\n";
const catalog = [{ slug: "band_full", name: "Band Series — Full Chart" }, { slug: "plain", name: "Plain squat" }];

describe("owner review queue", () => {
  it("merges flagged descriptions, how-to drafts and series into one item per exercise", () => {
    const q = buildReviewQueue({ flaggedTsv, howToTsv, catalog, cleared: new Set() });
    expect(q.map((i) => i.slug)).toEqual(["a_move", "b_move", "band_full", "c_move"]);
    expect(q[0].reasons).toEqual(["flagged description", "how-to draft"]);
    expect(q[2].reasons).toEqual(["series list"]);
  });
  it("an approved or live-edited exercise leaves the queue", () => {
    const q = buildReviewQueue({ flaggedTsv, howToTsv, catalog, cleared: new Set(["a_move", "band_full"]) });
    expect(q.map((i) => i.slug)).toEqual(["b_move", "c_move"]);
  });
});
