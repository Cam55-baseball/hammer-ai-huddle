import { vi } from "vitest";
const sw = vi.hoisted(() => ({ on: true }));
vi.mock("@/lib/reportCard/visibility", () => ({
  videoGradesShown: () => sw.on,
  VIDEO_GRADE_PLACEHOLDER: "Grade coming with camera measurement",
}));
import { describe, it, expect } from "vitest";
import {
  parseReportsPayload,
  moduleLabel,
  reportDateLabel,
  reportScoreLabel,
  gradeSourceLabel,
  gradeLine,
  recapLines,
  type CoachReportRow,
  type CoachGradeRow,
  type CoachRecap,
} from "./reports";

const report: CoachReportRow = {
  id: "r1",
  created_at: "2026-10-10T12:00:00Z",
  session_date: "2026-10-09",
  module: "hitting",
  sport: "baseball",
  status: "done",
  efficiency_score: 72,
  title: null,
};

describe("parseReportsPayload", () => {
  it("returns empty lists for null or missing sections", () => {
    expect(parseReportsPayload(null)).toEqual({ reports: [], grades: [], recap: null });
    expect(parseReportsPayload({})).toEqual({ reports: [], grades: [], recap: null });
  });
});

describe("report labels", () => {
  it("labels known modules and falls back safely", () => {
    expect(moduleLabel("hitting")).toBe("Hitting");
    expect(moduleLabel(null)).toBe("Video analysis");
    expect(moduleLabel("custom")).toBe("Custom");
  });
  it("prefers the session date over the upload date", () => {
    expect(reportDateLabel(report)).toBe("2026-10-09");
    expect(reportDateLabel({ ...report, session_date: null })).toBe("2026-10-10");
  });
  it("says when a score was not recorded instead of inventing one", () => {
    expect(reportScoreLabel(report)).toBe("Efficiency score: 72");
    expect(reportScoreLabel({ ...report, efficiency_score: null })).toBe("Score: not recorded");
  });
});

describe("grade labels", () => {
  const grade: CoachGradeRow = {
    id: "g1",
    graded_at: "2026-09-01",
    grade_type: "scout_evaluation",
    grade_source: "coach_entered",
    overall_grade: 45,
    position_evaluated: "CF",
    player_confirmed: true,
  };
  it("shows the grade line with what was recorded", () => {
    expect(gradeLine(grade)).toBe("Overall grade: 45 (Acceptable) · Position: CF · Type: scout evaluation");
  });
  it("says details not recorded when the grade is empty", () => {
    expect(gradeLine({ ...grade, overall_grade: null, position_evaluated: null, grade_type: null }))
      .toBe("Grade details not recorded");
  });
  it("labels the source honestly", () => {
    expect(gradeSourceLabel("coach_entered")).toBe("Source: coach entered");
    expect(gradeSourceLabel(null)).toBe("Source: not recorded");
  });
});

describe("recapLines", () => {
  it("shows the period and only the numbers that exist", () => {
    const recap: CoachRecap = {
      period_start: "2026-08-31",
      period_end: "2026-10-11",
      generated_at: "2026-10-12",
      strength_change_percent: 4,
      total_weight_lifted: null,
    };
    expect(recapLines(recap)).toEqual([
      "Period: 2026-08-31 to 2026-10-11",
      "Strength change: 4%",
    ]);
  });
});

describe("report_card switch off (owner, Oct 18)", () => {
  it("never shows a video efficiency number", () => {
    sw.on = false;
    expect(reportScoreLabel(report)).toBe("Grade: Grade coming with camera measurement");
    sw.on = true;
  });
});
