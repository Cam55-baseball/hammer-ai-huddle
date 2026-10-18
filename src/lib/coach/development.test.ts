import { vi } from "vitest";
const sw = vi.hoisted(() => ({ on: true }));
vi.mock("@/lib/reportCard/visibility", () => ({
  videoGradesShown: () => sw.on,
  VIDEO_GRADE_PLACEHOLDER: "Grade coming with camera measurement",
}));
import { describe, it, expect } from "vitest";
import {
  reportsByCategory,
  classifyIssues,
  buildCategoryCards,
  strengthsAndWeaknesses,
  buildConnections,
  buildTakeaways,
  type DevReport,
  type DevFinding,
} from "./development";

const rep = (id: string, date: string, score: number | null, module = "pitching"): DevReport => ({
  id, date, module, efficiency_score: score,
});
const find = (id: string, video: string, fault: string, at: string, domain = "pitching"): DevFinding => ({
  id, video_id: video, skill_domain: domain, fault_key: fault, evidence: `evidence for ${fault}`, created_at: at,
});

// 5 reports, most recent first (r5 newest)
const reports = [
  rep("r5", "2026-10-10", 80),
  rep("r4", "2026-10-03", 75),
  rep("r3", "2026-09-26", 70),
  rep("r2", "2026-09-19", 65),
  rep("r1", "2026-09-12", 60),
];

describe("reportsByCategory", () => {
  it("keeps at most 5 most recent per category", () => {
    const many = Array.from({ length: 7 }, (_, i) => rep(`r${i}`, `2026-10-0${i + 1}`, 50));
    expect(reportsByCategory(many).get("pitching")).toHaveLength(5);
  });
});

describe("classifyIssues", () => {
  it("marks a fault in 2+ of the last 5 as Recurring", () => {
    const issues = classifyIssues(reports, [
      find("f1", "r5", "early_arm", "2026-10-10T00:00:00Z"),
      find("f2", "r3", "early_arm", "2026-09-26T00:00:00Z"),
    ]);
    expect(issues[0].status).toBe("Recurring");
    expect(issues[0].times_seen).toBe(2);
  });
  it("marks a first-time fault in the newest report as New", () => {
    const issues = classifyIssues(reports, [find("f1", "r5", "late_rotation", "2026-10-10T00:00:00Z")]);
    expect(issues[0].status).toBe("New");
  });
  it("marks a fault absent from the newest report as Cleaning up", () => {
    const issues = classifyIssues(reports, [
      find("f1", "r2", "glove_side", "2026-09-19T00:00:00Z"),
      find("f2", "r1", "glove_side", "2026-09-12T00:00:00Z"),
    ]);
    expect(issues[0].status).toBe("Cleaning up");
  });
  it("ignores findings in a category with no reports", () => {
    expect(classifyIssues(reports, [find("f1", "x", "foo", "2026-10-10T00:00:00Z", "hitting")])).toHaveLength(0);
  });
});

describe("buildCategoryCards", () => {
  it("detects an upward trend", () => {
    const cards = buildCategoryCards(reports, []);
    expect(cards[0].trend).toBe("up");
    expect(cards[0].reports).toHaveLength(5);
  });
});

describe("strengthsAndWeaknesses", () => {
  it("compares each category to the player's own average, with evidence and date", () => {
    const mixed = [
      ...reports,
      rep("h1", "2026-10-09", 40, "hitting"),
      rep("h2", "2026-10-02", 42, "hitting"),
    ];
    const { strengths, weaknesses } = strengthsAndWeaknesses(mixed);
    expect(strengths[0].text).toContain("Pitching");
    expect(strengths[0].evidence).toContain("latest 2026-10-10");
    expect(weaknesses[0].text).toContain("Hitting");
  });
  it("returns nothing with fewer than 2 scored reports", () => {
    const r = strengthsAndWeaknesses([rep("a", "2026-10-01", 50)]);
    expect(r.strengths).toEqual([]);
    expect(r.note).toContain("Not enough data");
  });
});

describe("buildConnections", () => {
  it("labels a 3+ times recurring fault as Supported pattern", () => {
    const conns = buildConnections(reports, [
      find("f1", "r5", "early_arm", "2026-10-10T00:00:00Z"),
      find("f2", "r4", "early_arm", "2026-10-03T00:00:00Z"),
      find("f3", "r3", "early_arm", "2026-09-26T00:00:00Z"),
    ]);
    expect(conns.some((c) => c.label === "Supported pattern")).toBe(true);
  });
  it("labels a first-time fault as Hypothesis to check", () => {
    const conns = buildConnections(reports, [find("f1", "r5", "new_thing", "2026-10-10T00:00:00Z")]);
    expect(conns.some((c) => c.label === "Hypothesis to check")).toBe(true);
  });
  it("labels a disappeared fault as Observed fact", () => {
    const conns = buildConnections(reports, [find("f1", "r1", "old_thing", "2026-09-12T00:00:00Z")]);
    expect(conns.some((c) => c.label === "Observed fact")).toBe(true);
  });
  it("labels a score trend as Measured change", () => {
    expect(buildConnections(reports, []).some((c) => c.label === "Measured change")).toBe(true);
  });
  it("says Not enough data with fewer than 2 reports", () => {
    expect(buildConnections([reports[0]], [])[0].label).toBe("Not enough data");
  });
});

describe("buildTakeaways", () => {
  it("returns 1–3 takeaways with evidence and confidence", () => {
    const t = buildTakeaways(reports, [
      find("f1", "r5", "early_arm", "2026-10-10T00:00:00Z"),
      find("f2", "r4", "early_arm", "2026-10-03T00:00:00Z"),
    ]);
    expect(t.length).toBeGreaterThanOrEqual(1);
    expect(t.length).toBeLessThanOrEqual(3);
    expect(t[0].evidence.length).toBeGreaterThan(0);
    expect(["High", "Medium", "Low"]).toContain(t[0].confidence);
  });
  it("is honest when there is no data", () => {
    expect(buildTakeaways([], [])[0].text).toContain("Not enough data");
  });
});

describe("report_card switch off (owner, Oct 18)", () => {
  it("shows no video-score strengths, weaknesses or trend", () => {
    sw.on = false;
    const reps = [
      { id: "a", date: "2026-10-01", module: "hitting", efficiency_score: 40 },
      { id: "b", date: "2026-10-05", module: "hitting", efficiency_score: 70 },
      { id: "c", date: "2026-10-06", module: "pitching", efficiency_score: 50 },
    ];
    const sw2 = strengthsAndWeaknesses(reps as any);
    expect(sw2.strengths).toEqual([]);
    expect(sw2.weaknesses).toEqual([]);
    expect(sw2.note).toBe("Video grades: Grade coming with camera measurement.");
    expect(buildCategoryCards(reps as any, []).every((c) => c.trend === "unknown")).toBe(true);
    sw.on = true;
  });
});
