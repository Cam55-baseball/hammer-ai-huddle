import { describe, expect, it } from "vitest";
import { buildCourse, COURSE_STEPS, nextStepIndex, stepFor, BASERUNNING_IQ_COURSE_ROUTE } from "./courseSteps";
import { splitBaserunning } from "@/components/hammer/cards/todayPresentation";

describe("Baserunning IQ course (owner Nov 4 r3 Part C)", () => {
  it("has the seven owner topics in order", () => {
    expect(COURSE_STEPS.map((s) => s.key)).toEqual(["reads", "leads", "jumps", "first_to_third", "tag_ups", "rounding", "sliding"]);
  });
  it("places existing situations by their own words", () => {
    expect(stepFor("Runner on third, 1 out. Fly ball to medium-depth center. Do you tag up?")).toBe("tag_ups");
    expect(stepFor("Runner on first, 0 outs, softball. Gap hit to left-center on 60-foot bases. You round second")).toBe("first_to_third");
    expect(stepFor("Runner slides headfirst into first base on a routine grounder.")).toBe("sliding");
    expect(stepFor("Leads at First")).toBe("leads");
  });
  it("builds steps from given content only, up to 4 checks each, and walks steps in order", () => {
    const sc = Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, scenario_text: "Fly ball to center — tag up?" }));
    const steps = buildCourse([{ id: "l1", title: "Leads at Second" }], sc);
    expect(steps.find((s) => s.key === "tag_ups")!.checks).toHaveLength(4);
    expect(steps.find((s) => s.key === "leads")!.lessons.map((l) => l.id)).toEqual(["l1"]);
    expect(nextStepIndex(new Set())).toBe(0);
    expect(nextStepIndex(new Set(["reads", "leads"]))).toBe(2);
  });
  it("the Mind item 'Baserunning reads — mental work only' opens Baserunning IQ, not the practice log", () => {
    const block = { modality: "baserunning", status: "ready", title: "Baserunning", route: "/practice?module=baserunning", steps: [], drills: [{ name: "Pitcher-read film", dosage: "5 min" }, { name: "Lead footwork", dosage: "3 x 5" }] } as never;
    const { mental, physical } = splitBaserunning([block]);
    expect(mental).toHaveLength(1);
    expect(mental[0].title).toBe("Baserunning reads — mental work only");
    expect(mental[0].route).toBe(BASERUNNING_IQ_COURSE_ROUTE);
    expect(mental[0].route).toBe("/baserunning-iq/course");
    expect(physical[0].route).toBe("/practice?module=baserunning");
  });
});
