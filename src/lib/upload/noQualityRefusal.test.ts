import { describe, expect, it } from "vitest";
import { friendlyRejectReason } from "./uploadErrorCopy";

// Owner, Oct 27: only "no readable picture at all" may stop a report.
describe("no clip-quality refusals", () => {
  it("never turns a small, slow, short/long or damaged clip into a 'too blurry' refusal", () => {
    for (const reason of [
      "reject_low_resolution",
      "reject_low_fps",
      "reject_duration_out_of_bounds",
      "reject_excessive_dropped_frames",
    ]) {
      expect(friendlyRejectReason(reason)).toBeNull();
    }
  });
});
