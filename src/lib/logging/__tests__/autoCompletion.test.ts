import { describe, it, expect } from "vitest";
import { autoStatus } from "../autoCompletion";

const lift = (rows: Array<Record<string, number>>, extra: Partial<Parameters<typeof autoStatus>[0]> = {}) =>
  autoStatus({ prescribedRows: 3, targets: { reps: 5 }, rows, ...extra });

describe("completion comes from entries", () => {
  it("all prescribed sets met = Done", () => expect(lift([{ reps: 5 }, { reps: 5 }, { reps: 5 }])).toBe("done"));
  it("some sets = Cut short", () => expect(lift([{ reps: 5 }])).toBe("cut_short"));
  it("fewer reps than prescribed in a set = Cut short", () => expect(lift([{ reps: 5 }, { reps: 5 }, { reps: 3 }])).toBe("cut_short"));
  it("an extra set = Done + Did more", () => expect(lift([{ reps: 5 }, { reps: 5 }, { reps: 5 }, { reps: 5 }])).toBe("did_more"));
  it("more reps = Done + Did more", () => expect(lift([{ reps: 5 }, { reps: 6 }, { reps: 5 }])).toBe("did_more"));
  it("nothing before day's end = no label; nothing after = Missed", () => {
    expect(lift([])).toBeNull();
    expect(lift([], { dayOver: true })).toBe("missed");
  });
  it("Skip is explicit", () => expect(lift([{ reps: 5 }], { skipped: true })).toBe("skipped"));
  it("slower stopwatch times are not 'more work'", () => {
    expect(autoStatus({ prescribedRows: 2, targets: { distance: 90, time: 10 }, rows: [{ distance: 90, time: 14 }, { distance: 90, time: 15 }], lowerIsBetter: ["time"] })).toBe("done");
  });
  it("longer holds and extra distance count as Did more", () => {
    expect(autoStatus({ prescribedRows: 1, targets: { time: 45 }, rows: [{ time: 60 }] })).toBe("did_more");
    expect(autoStatus({ prescribedRows: 1, targets: { distance: 90 }, rows: [{ distance: 120 }] })).toBe("did_more");
  });
});
