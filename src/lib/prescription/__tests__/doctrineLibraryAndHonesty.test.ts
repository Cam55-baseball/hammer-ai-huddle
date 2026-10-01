import { describe, it, expect } from "vitest";
import { matchPrescriptionDrills } from "@/lib/prescription/matchDrills";
import { DOCTRINE_DRILLS } from "@/data/drills/doctrineDrills";
import { faultKeysFor } from "../../../../supabase/functions/analyze-video/constructiveCriticism";
import { findFootageClaims, scrubFootageClaims } from "../../../../supabase/functions/analyze-video/honestyCheck";

describe("doctrine drill library", () => {
  const cases: Array<[string, string]> = [
    ["hitting", "baseball"], ["hitting", "softball"], ["pitching", "baseball"],
    ["pitching", "softball"], ["throwing", "baseball"], ["throwing", "softball"],
  ];
  it.each(cases)("%s/%s: emitted fault keys match a doctrine drill, never maintenance", (module, sport) => {
    const keys = faultKeysFor(module, sport);
    const covered = keys.filter((k) => matchPrescriptionDrills({ faultKeys: [k], module, sport, includePendingReview: true }).length > 0);
    // only documented gaps may lack a drill
    expect(keys.filter((k) => !covered.includes(k))).toEqual(
      module === "hitting" ? ["lead_elbow_bends_in_swing"] : [],
    );
  });

  it("pending drills never reach athletes", () => {
    for (const d of DOCTRINE_DRILLS) {
      expect(d.ownerReview).toBe("pending_owner_review");
      const sport = d.sports[0];
      const hits = matchPrescriptionDrills({ faultKeys: d.violationKeys, module: d.category, sport, max: 50 });
      expect(hits.some((h) => h.drill.id === d.id)).toBe(false);
    }
  });

  it("every drill has a phase with its number where it is hitting, a video slot, and no athlete numbers", () => {
    for (const d of DOCTRINE_DRILLS) {
      expect(d.videoUrl).toBeNull();
      expect(d.violationKeys.length).toBe(1);
      if (d.category === "hitting") expect(d.phase).toMatch(/^Phase [1-4] — /);
      const text = [d.fixes, d.setup, ...d.steps, ...d.cues, d.feel ?? ""].join(" ");
      expect(text.replace(/Phase [1-4]/g, "")).not.toMatch(/\d/);
    }
  });
});

describe("honesty check", () => {
  it("removes the owner's reported fabrication", () => {
    const bad =
      "The swing motion and ball contact are cut out by a broadcast camera edit. Broadcast video cuts directly from setup stance to outfield play. The full stride swing motion and contact frame are missing.";
    expect(findFootageClaims(bad).length).toBe(3);
    const out = scrubFootageClaims({ summary: [bad], feedback: `Your back hip held. ${bad}`, positives: [], improvements: [], clean_reason: null });
    expect(out.summary).toEqual([]);
    expect(out.feedback).toBe("Your back hip held.");
    expect(out.flags.length).toBe(6);
  });

  it("removes on-screen readouts like exit velocity", () => {
    expect(findFootageClaims("That ball left at an exit velocity of 102 mph.")[0]?.kind).toBe("onscreen_readout");
  });

  it("keeps honest uncertainty about the athlete's own movement", () => {
    expect(findFootageClaims("I couldn't judge your contact position clearly from these frames.")).toEqual([]);
    expect(findFootageClaims("Your hips kept sliding forward after landing.")).toEqual([]);
  });
});
