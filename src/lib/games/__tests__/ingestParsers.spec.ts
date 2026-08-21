import { describe, it, expect } from "vitest";
import {
  parseIngestText,
  locationToZone,
  mapPitchType,
  contactQuality,
} from "../ingestParsers";

describe("ingestParsers", () => {
  it("detects and maps a Trackman export", () => {
    const csv = [
      "Inning,PitchofPA,TaggedPitchType,RelSpeed,SpinRate,HorzBreak,InducedVertBreak,PlateLocSide,PlateLocHeight,PitchCall,PitcherThrows,BatterSide,Balls,Strikes,Batter",
      "3,2,Fastball,92.4,2280,-6.1,17.2,0.0,2.5,StrikeSwinging,Right,Left,1,1,Doe Jane",
    ].join("\n");
    const res = parseIngestText(csv);
    expect(res.source).toBe("trackman");
    const row = res.rows[0] as any;
    expect(row.pitch_type).toBe("FB");
    expect(row.pitch_velo).toBe(92.4);
    expect(row.result).toBe("swinging_strike");
    expect(row.location).toEqual({ zone: 2, outZone: null });
    expect(row.pitch_movement.spin_rpm).toBe(2280);
    expect(row.batter_handedness).toBe("L");
  });

  it("maps HitTrax batted balls into at-bat rows", () => {
    const csv = ["Inning,Velo,LA,Dir,Res", "1,97.2,18,-14,Double"].join("\n");
    const res = parseIngestText(csv);
    expect(res.source).toBe("hittrax");
    const row = res.rows[0] as any;
    expect(row.kind).toBe("at_bat");
    expect(row.contact_quality).toBe("barrel");
    expect(row.exit_direction).toBe("LF");
  });

  it("flags unknown exports instead of guessing", () => {
    const res = parseIngestText("foo,bar\n1,2");
    expect(res.recognized).toBe(false);
    expect(res.rows).toHaveLength(0);
  });

  it("zones and quality behave at the edges", () => {
    expect(locationToZone(0, 4.2)?.outZone).toBe("UP");
    expect(locationToZone(-1.4, 2.5)?.outZone).toBe("IN");
    expect(mapPitchType("Sweeper")).toBe("SW");
    expect(contactQuality(70, 2)).toBe("topped");
  });
});
