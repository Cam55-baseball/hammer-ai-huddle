/**
 * Step 24 item 3 follow-up — a how-to guide must match the movement, never a
 * word that merely appears inside another word ("scrunch" contains "run").
 */
import { describe, expect, it } from "vitest";
import { composeGuide } from "@/lib/hammer/prescription/composeGuide";

const guide = (name: string, bucket?: string) =>
  composeGuide({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), bucket: bucket ?? null });

describe("composeGuide family matching", () => {
  it("does not give a foot drill the sprint guide", () => {
    const g = guide("Barefoot towel scrunch (foot fascia)");
    expect(g.easier).not.toMatch(/shorter distance/i);
    expect(g.keyCues.join(" ")).not.toMatch(/push the ground back/i);
    expect(g.stopIf).not.toMatch(/hamstring, calf or groin/i);
  });

  it("still gives real sprint work the sprint guide", () => {
    expect(guide("Acceleration sprint 20 yards").easier).toMatch(/shorter distance/i);
  });

  it("gives arm-care work the arm-care guide", () => {
    expect(guide("90/90 external rotation hold", "arm care").stopIf).toMatch(/shoulder or elbow/i);
  });

  it("never returns a placeholder", () => {
    for (const n of ["Wrist-weight pronation series", "Copenhagen plank", "Barefoot towel scrunch"]) {
      const g = guide(n);
      expect(g.steps.length).toBeGreaterThan(1);
      expect(JSON.stringify(g)).not.toMatch(/guide for this movement is on the way/i);
    }
  });
});
