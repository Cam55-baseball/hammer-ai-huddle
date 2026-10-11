import { describe, it, expect } from "vitest";
import { formatTime, fromSegments, timeKindFor, toSegments } from "../timeEntry";

describe("real time entry — no decimal minutes", () => {
  it("picks seconds for short holds, mm:ss for longer efforts, h:mm:ss past an hour, ss.hh for stopwatch times", () => {
    expect(timeKindFor({ stopwatch: false, targetSeconds: 45 })).toBe("seconds");
    expect(timeKindFor({ stopwatch: false, targetSeconds: 90 })).toBe("seconds");
    expect(timeKindFor({ stopwatch: false, targetSeconds: 150 })).toBe("mmss");
    expect(timeKindFor({ stopwatch: false, targetSeconds: 3600 })).toBe("hmmss");
    expect(timeKindFor({ stopwatch: true, targetSeconds: null })).toBe("sshh");
  });
  it("stores seconds precisely", () => {
    expect(fromSegments("seconds", ["45"])).toBe(45);
    expect(fromSegments("mmss", ["2", "30"])).toBe(150);
    expect(fromSegments("hmmss", ["1", "05", "00"])).toBe(3900);
    expect(fromSegments("sshh", ["4", "52"])).toBe(4.52);
    expect(fromSegments("sshh", ["4", "5"])).toBe(4.5);
    expect(fromSegments("mmss", ["", ""])).toBeNull();
  });
  it("round-trips and labels targets", () => {
    expect(toSegments("mmss", 300)).toEqual(["5", "00"]);
    expect(toSegments("sshh", 3.2)).toEqual(["3", "20"]);
    expect(formatTime("seconds", 45)).toBe("45 s");
    expect(formatTime("mmss", 150)).toBe("2:30");
    expect(formatTime("hmmss", 3900)).toBe("1:05:00");
    expect(formatTime("sshh", 4.5)).toBe("4.50 s");
  });
});
