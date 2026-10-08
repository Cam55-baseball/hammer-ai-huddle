import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const dashboard = readFileSync("src/pages/ProgressDashboard.tsx", "utf8");
const landing = readFileSync("src/pages/ProgressLanding.tsx", "utf8");

describe("owner's classic General report restoration", () => {
  it("mounts the canonical report inside existing access gates", () => {
    expect(dashboard).toContain("import { UhrcAthleteSection }");
    expect(dashboard).toMatch(/<DataBuildingGate>[\s\S]*hasAdvancedAccess[\s\S]*<UhrcAthleteSection\s*\/>[\s\S]*<PlayerSnapshotCard/);
    expect(dashboard.match(/<UhrcAthleteSection\s*\/>/g)).toHaveLength(1);
  });
  it("keeps the season counter and classic view", () => {
    expect(landing).toContain("<SeasonCounter />");
    expect(landing).toContain("All sections (classic view)");
    expect(landing).toContain("<ProgressDashboard />");
  });
  it("keeps clarified day wording and excludes extra-load wording", () => {
    for (const file of ["src/components/vault/quiz/MorningDayIntent.tsx", "src/components/game-plan/DayControlCard.tsx", "src/components/game-plan/DayStateBanner.tsx"]) {
      const source = readFileSync(file, "utf8");
      for (const label of ["Rest: take it easier", "Push: commit to the plan", "Skip: sit today out"]) expect(source).toContain(label);
      expect(source).not.toMatch(/PUSH DAY\s*[—-]\s*EXTRA LOAD|extra\s+output\s+expected/i);
    }
  });
});