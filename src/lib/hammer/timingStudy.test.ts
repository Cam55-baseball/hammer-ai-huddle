import { describe, it, expect } from "vitest";
import { timingStudy } from "./timingStudy";
describe("position-specific timing study", () => {
  it("uses range evidence only for a defender", () => { expect(timingStudy({ role: "defender", sport: "baseball", flags: ["range"] }).reason).toContain("saved range"); expect(timingStudy({ role: "hitter", sport: "baseball", flags: ["range"] }).reason).not.toContain("saved range"); });
  it("never claims a caught steal without a recorded result", () => { expect(timingStudy({ role: "baserunner", sport: "baseball" }).reason).not.toContain("thrown out"); expect(timingStudy({ role: "baserunner", sport: "baseball", caughtStealing: true }).reason).toContain("logged game"); });
  it("keeps softball and baseball pitcher delivery examples separate", () => { expect(timingStudy({ role: "pitcher", sport: "softball" }).examples[1]).toContain("windmill"); expect(timingStudy({ role: "pitcher", sport: "baseball" }).examples[1]).not.toContain("windmill"); });
});