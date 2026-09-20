import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  ARC_BLOCKS,
  locateInArc,
  resolveOffseasonArc,
  scaleArcWeeks,
} from "../../../supabase/functions/_shared/wic/schedule/timeline/offseasonArc.ts";
import * as mirror from "@/lib/hammer/roadmap/offseasonArc";

const SERVER = "supabase/functions/_shared/wic/schedule/timeline/offseasonArc.ts";
const CLIENT = "src/lib/hammer/roadmap/offseasonArc.ts";

const body = (p: string) => readFileSync(p, "utf8").split("\n").slice(3).join("\n");

describe("offseason arc — client mirror", () => {
  it("is byte-identical below the header", () => {
    expect(body(CLIENT)).toBe(body(SERVER));
  });

  it("produces identical layouts through either import", () => {
    for (const w of [6, 8, 12, 16, 20, 30]) {
      expect(mirror.scaleArcWeeks(w)).toEqual(scaleArcWeeks(w));
    }
  });
});

describe("offseason arc — block boundaries", () => {
  const cases: Array<[number, Record<string, number>]> = [
    [6, { B1: 5, B2: 0, B3: 0, B4: 0, B5: 1 }],
    [8, { B1: 3, B2: 2, B3: 0, B4: 2, B5: 1 }],
    [12, { B1: 5, B2: 2, B3: 1, B4: 2, B5: 2 }],
    [16, { B1: 5, B2: 3, B3: 2, B4: 3, B5: 3 }],
    [20, { B1: 6, B2: 4, B3: 2, B4: 4, B5: 4 }],
    [30, { B1: 9, B2: 6, B3: 3, B4: 6, B5: 6 }],
  ];

  for (const [weeks, expected] of cases) {
    it(`W = ${weeks} weeks lays out ${JSON.stringify(expected)}`, () => {
      const got = scaleArcWeeks(weeks);
      expect(got).toEqual(expected);
      expect(got.B1 + got.B2 + got.B3 + got.B4 + got.B5).toBe(weeks);
    });
  }

  it("never compresses a block below its minimum once it exists", () => {
    for (let w = 8; w <= 40; w += 1) {
      const got = scaleArcWeeks(w);
      for (const def of ARC_BLOCKS) {
        if (got[def.key] > 0) expect(got[def.key]).toBeGreaterThanOrEqual(def.minimumWeeks);
      }
      expect(got.B1 + got.B2 + got.B3 + got.B4 + got.B5).toBe(w);
    }
  });

  it("drops B3 under 12 weeks and caps it at one week through 15", () => {
    for (let w = 8; w <= 11; w += 1) expect(scaleArcWeeks(w).B3).toBe(0);
    for (let w = 12; w <= 15; w += 1) expect(scaleArcWeeks(w).B3).toBe(1);
  });

  it("runs B1 then B5 only under 8 weeks", () => {
    for (let w = 1; w <= 7; w += 1) {
      const got = scaleArcWeeks(w);
      expect(got.B2).toBe(0);
      expect(got.B3).toBe(0);
      expect(got.B4).toBe(0);
      expect(got.B5).toBeGreaterThanOrEqual(1);
    }
  });

  it("is deterministic", () => {
    for (let w = 0; w <= 60; w += 1) {
      expect(scaleArcWeeks(w)).toEqual(scaleArcWeeks(w));
    }
  });
});

describe("offseason arc — calendar layout", () => {
  it("covers the offseason end to end with no gaps", () => {
    const arc = resolveOffseasonArc({ offseasonStart: "2026-10-01", offseasonWeeks: 20 });
    expect(arc.segments.map((s) => s.key)).toEqual(["B1", "B2", "B3", "B4", "B5"]);
    for (let i = 1; i < arc.segments.length; i += 1) {
      const prevEnd = Date.parse(`${arc.segments[i - 1].endDate}T00:00:00Z`);
      const start = Date.parse(`${arc.segments[i].startDate}T00:00:00Z`);
      expect(start - prevEnd).toBe(86_400_000);
    }
    const days = arc.segments.reduce((n, s) => n + s.lengthDays, 0);
    expect(days).toBe(140);
  });

  it("stretches around planned off days instead of eating loadable days", () => {
    const offDays = ["2026-10-05", "2026-10-06", "2026-10-07"];
    const plain = resolveOffseasonArc({ offseasonStart: "2026-10-01", offseasonWeeks: 20 });
    const stretched = resolveOffseasonArc({
      offseasonStart: "2026-10-01",
      offseasonWeeks: 20,
      offDays,
    });
    expect(stretched.weeks).toEqual(plain.weeks);
    expect(stretched.segments[0].workingDays).toBe(plain.segments[0].workingDays);
    expect(stretched.segments[0].lengthDays).toBe(plain.segments[0].lengthDays + 3);
  });

  it("locates a date inside the right block with a 1-4 week wave", () => {
    const arc = resolveOffseasonArc({ offseasonStart: "2026-10-01", offseasonWeeks: 20 });
    const pos = locateInArc(arc, "2026-10-08");
    expect(pos?.block.key).toBe("B1");
    expect(pos?.weekInBlock).toBe(2);
    const late = locateInArc(arc, "2027-02-10");
    expect(late?.block.key).toBe("B5");
  });
});
