import { describe, it, expect } from "vitest";
import { certifiedConditioningTemplate } from "../../../supabase/functions/_shared/wic/conditioning/sessionBuilder";

const cat = (s: string) => ({ rc_easy_flush: "recovery_flush", bases_1st_3rd: "aerobic_base" } as Record<string, string>)[s];

describe("recovery-only conditioning certification", () => {
  it("certifies a flush-only recovery day as a recovery flush session", () => {
    expect(certifiedConditioningTemplate("cond.off_day", "recovery_only", [{ slot: "conditioning", movement_slug: "rc_easy_flush" }], cat)).toBe("cond.recovery_flush");
  });
  it("keeps the chosen session when real conditioning remains", () => {
    expect(certifiedConditioningTemplate("cond.off_day", "recovery_only", [{ slot: "conditioning", movement_slug: "rc_easy_flush" }, { slot: "conditioning", movement_slug: "bases_1st_3rd" }], cat)).toBe("cond.off_day");
  });
  it("never relabels a normal training day", () => {
    expect(certifiedConditioningTemplate("cond.off_day", "muscle_capacity", [{ slot: "conditioning", movement_slug: "rc_easy_flush" }], cat)).toBe("cond.off_day");
  });
});
