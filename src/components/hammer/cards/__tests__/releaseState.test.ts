import { describe, it, expect } from "vitest";
import { releaseState, msUntilLocalMidnight, localDateOf } from "../ReleaseCountdown";

const zones = ["America/New_York", "America/Los_Angeles", "Pacific/Honolulu", "Europe/London", "Asia/Tokyo", "Australia/Sydney", "UTC"];
const instants = [
  "2026-10-07T18:30:00Z", "2026-03-08T06:30:00Z", "2026-11-01T05:30:00Z", // US DST start/end nights
  "2026-03-29T00:30:00Z", "2026-10-25T00:30:00Z", "2026-10-04T13:00:00Z",  // EU DST, AU DST start
];

describe("release line honesty", () => {
  for (const tz of zones) for (const iso of instants) {
    const now = Date.parse(iso);
    it(`${tz} @ ${iso}`, () => {
      const ready = releaseState(now, tz, true);
      expect(ready.kind).toBe("ready");
      // the countdown lands exactly on local 00:00 of the next local date
      const end = now + ready.ms;
      expect(localDateOf(end, tz)).not.toBe(localDateOf(now, tz));
      expect(localDateOf(end - 1000, tz)).toBe(localDateOf(now, tz));
      expect(ready.ms).toBe(msUntilLocalMidnight(now, tz));

      const pending = releaseState(now, tz, false);
      expect(pending.kind).toBe("building"); // never "opens in" without a built plan
      if (pending.kind === "building") {
        expect(pending.readyAt).toBeGreaterThan(now);
        expect(pending.ms).toBeLessThanOrEqual(24 * 3_600_000);
      }
    });
  }
  it("pre-build not run yet at 9am: expected time is after local noon", () => {
    const now = Date.parse("2026-10-07T13:00:00Z"); // 09:00 New York
    const st = releaseState(now, "America/New_York", false);
    expect(st.kind).toBe("building");
    if (st.kind === "building") expect(new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(st.readyAt))).toBe("12:10");
  });
});
