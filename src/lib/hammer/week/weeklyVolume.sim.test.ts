import { describe, expect, it } from "vitest";
import { buildWeek, perceivedReadiness, sessionVersion, weeklyMinimums, type Readiness, type SkillCategory } from "./weeklyVolume";
import { parseDrillVideoLink, drillVideoSource } from "@/lib/prescription/drillVideoSource";

const PROGRAMS: { program: string; owned: SkillCategory[] }[] = [
  { program: "5tool", owned: ["hitting", "defense", "baserunning", "bunting"] },
  { program: "golden_2way", owned: ["hitting", "defense", "baserunning", "bunting"] },
  { program: "hitting_only", owned: ["hitting", "bunting"] },
  { program: "defense_only", owned: ["defense", "baserunning"] },
];
const pattern: Readiness[] = ["high", "normal", "low", "normal", "low", "high", "normal"];

describe("8-week simulation, every program, both sports", () => {
  for (const sport of ["baseball", "softball"])
    for (const p of PROGRAMS)
      it(`${sport} ${p.program}`, () => {
        const counts: number[] = [];
        for (let w = 0; w < 8; w++) {
          const readiness = pattern.map((_, i) => pattern[(i + w) % 7]);
          const week = buildWeek({ ...p, readinessByDay: readiness, weekIndex: w, texVisionPrescribed: w % 2 === 0 });
          const rest = week.filter((d) => d.rest);
          expect(rest).toHaveLength(1);
          expect(rest[0].sessions).toHaveLength(0); // rest day: no physical work
          expect(week.filter((d) => !d.rest)).toHaveLength(6);
          for (const d of week) expect(d.mind.physical).toBe(false); // Mind item daily
          const mins = weeklyMinimums(p.owned, p.program);
          for (const [cat, n] of Object.entries(mins)) {
            expect(week.flatMap((d) => d.sessions).filter((s) => s.category === cat)).toHaveLength(n);
          }
          // no spill-over: only owned categories appear
          for (const s of week.flatMap((d) => d.sessions)) expect(p.owned).toContain(s.category);
          // readiness modulates inside the session
          for (const d of week) for (const s of d.sessions) expect(s.version).toBe(sessionVersion(readiness[d.dayIndex]).version);
          counts.push(week.flatMap((d) => d.sessions).length);
        }
        expect(new Set(counts).size).toBe(1); // no week-by-week ramp
      });
});

describe("rules", () => {
  it("minimums", () => {
    expect(weeklyMinimums(["hitting", "defense", "baserunning", "bunting"], "5tool")).toEqual({ hitting: 3, defense: 4, baserunning: 1, bunting: 2 });
    expect(weeklyMinimums(["bunting"], "hitting_only")).toEqual({});
  });
  it("low readiness keeps the session as low-taxing", () => {
    expect(sessionVersion(perceivedReadiness({ checkIn: 2 }))).toEqual({ version: "low_taxing", volume: 0.5 });
    expect(perceivedReadiness({ loadRatio: 1.6 })).toBe("low");
    expect(perceivedReadiness({})).toBe("normal");
  });
  it("video links: official embeds only", () => {
    expect(parseDrillVideoLink("https://youtu.be/dQw4w9WgXcQ")?.embedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(parseDrillVideoLink("https://vimeo.com/123456789")?.embedUrl).toBe("https://player.vimeo.com/video/123456789");
    expect(parseDrillVideoLink("https://example.com/v.mp4")).toBeNull();
    expect(parseDrillVideoLink("http://youtu.be/dQw4w9WgXcQ")).toBeNull();
    expect(drillVideoSource({})).toBeNull();
  });
});
