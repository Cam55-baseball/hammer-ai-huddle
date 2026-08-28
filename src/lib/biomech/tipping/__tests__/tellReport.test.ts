import { describe, expect, it } from "vitest";
import {
  buildTellReport,
  describeFinding,
  DEFAULT_TELL_CONFIG,
  TIPPING_DETECTION_ENABLED,
  type DeliveryTellReport,
  type DeliveryType,
  type PitchObservation,
} from "../tellReport";

/**
 * Synthetic pitcher: energy angle genuinely differs by pitch type
 * (fastball ~10°, curveball ~20°), shoulder tilt genuinely does not
 * (both hover around 30° with the same wobble).
 * Six of each type so the 5-per-type floor is cleared.
 */
const FB_ENERGY = [9.5, 10.2, 9.8, 10.5, 10.0, 9.7];
const CB_ENERGY = [19.6, 20.4, 20.1, 19.9, 20.2, 19.8];
const FB_TILT = [29.5, 30.4, 30.1, 29.8, 30.2, 29.9];
const CB_TILT = [30.2, 29.6, 30.3, 29.9, 30.0, 30.4];

function makeObservations(
  delivery: DeliveryType = "windup",
  prefix = "",
): PitchObservation[] {
  const rows: PitchObservation[] = [];
  FB_ENERGY.forEach((v, i) =>
    rows.push({
      pitch_id: `${prefix}fb-${i}`,
      pitch_type: "fastball",
      delivery_type: delivery,
      metrics: { energy_angle_deg: v, shoulder_tilt_deg: FB_TILT[i] },
    }),
  );
  CB_ENERGY.forEach((v, i) =>
    rows.push({
      pitch_id: `${prefix}cb-${i}`,
      pitch_type: "curveball",
      delivery_type: delivery,
      metrics: { energy_angle_deg: v, shoulder_tilt_deg: CB_TILT[i] },
    }),
  );
  return rows;
}

function delivery(
  report: ReturnType<typeof buildTellReport>,
  d: DeliveryType,
): DeliveryTellReport {
  return report.deliveries.find((x) => x.delivery_type === d)!;
}

function finding(report: ReturnType<typeof buildTellReport>, d: DeliveryType, metric: string) {
  return delivery(report, d).findings.find((f) => f.metric === metric)!;
}

describe("tipping tell report", () => {
  it("stays behind the kill switch", () => {
    expect(TIPPING_DETECTION_ENABLED).toBe(false);
  });

  it("requires 5 pitches per type before computing", () => {
    expect(DEFAULT_TELL_CONFIG.min_pitches_per_type).toBe(5);
  });

  it("flags a metric that genuinely differs by pitch type", () => {
    const report = buildTellReport("p1", makeObservations("windup"));
    const energy = finding(report, "windup", "energy_angle_deg");
    expect(energy.verdict).toBe("likely_tell");
    expect(energy.separation_ratio!).toBeGreaterThan(DEFAULT_TELL_CONFIG.separation_threshold);
    expect(energy.max_mean_gap!).toBeGreaterThan(9);
    expect(delivery(report, "windup").likely_tells).toContain("energy_angle_deg");
  });

  it("does not flag a metric that is the same across pitch types", () => {
    const report = buildTellReport("p1", makeObservations("windup"));
    const tilt = finding(report, "windup", "shoulder_tilt_deg");
    expect(tilt.verdict).toBe("no_tell");
    expect(tilt.separation_ratio!).toBeLessThan(DEFAULT_TELL_CONFIG.separation_threshold);
    expect(delivery(report, "windup").likely_tells).not.toContain("shoulder_tilt_deg");
  });

  it("returns indeterminate rather than a verdict when only one pitch type exists", () => {
    const rows = makeObservations("windup").filter((o) => o.pitch_type === "fastball");
    const report = buildTellReport("p1", rows);
    const energy = finding(report, "windup", "energy_angle_deg");
    expect(energy.verdict).toBe("indeterminate");
    expect(energy.reason).toBe("not_enough_pitch_types");
    expect(energy.separation_ratio).toBeNull();
    expect(energy.confidence).toBeNull();
  });

  it("returns indeterminate when a type has fewer than five pitches", () => {
    const rows = makeObservations("windup").filter(
      (o) => o.pitch_type === "fastball" || ["cb-0", "cb-1", "cb-2", "cb-3"].includes(o.pitch_id),
    );
    const report = buildTellReport("p1", rows);
    const energy = finding(report, "windup", "energy_angle_deg");
    expect(energy.verdict).toBe("indeterminate");
    expect(energy.reason).toBe("not_enough_pitches_per_type");
  });

  it("drops missing values instead of imputing them", () => {
    const rows = makeObservations("windup").map((o, i) =>
      i === 0 ? { ...o, metrics: { ...o.metrics, energy_angle_deg: null } } : o,
    );
    const report = buildTellReport("p1", rows);
    const energy = finding(report, "windup", "energy_angle_deg");
    expect(energy.pitches_dropped_missing).toBe(1);
    expect(energy.pitches_used).toBe(11);
  });

  it("refuses an infinite ratio when there is no within-type variation", () => {
    const rows: PitchObservation[] = [
      ...[0, 1, 2, 3, 4].map((i) => ({
        pitch_id: `fb-${i}`,
        pitch_type: "fastball",
        delivery_type: "windup" as const,
        metrics: { energy_angle_deg: 10, shoulder_tilt_deg: 30 },
      })),
      ...[0, 1, 2, 3, 4].map((i) => ({
        pitch_id: `cb-${i}`,
        pitch_type: "curveball",
        delivery_type: "windup" as const,
        metrics: { energy_angle_deg: 20, shoulder_tilt_deg: 30 },
      })),
    ];
    const report = buildTellReport("p1", rows);
    for (const f of delivery(report, "windup").findings) {
      expect(f.verdict).toBe("indeterminate");
      expect(f.reason).toBe("no_within_type_variation");
      expect(f.separation_ratio).toBeNull();
    }
  });

  it("describes findings without certainty language", () => {
    const report = buildTellReport("p1", makeObservations("windup"));
    const lines = delivery(report, "windup").findings.map(describeFinding);
    expect(lines.join(" ")).toContain("likely tell");
    expect(lines.join(" ")).toContain("no tell");
    expect(lines.join(" ")).toContain("windup");
  });

  describe("delivery separation", () => {
    it("reports windup and stretch separately", () => {
      const report = buildTellReport("p1", [
        ...makeObservations("windup", "w-"),
        ...makeObservations("stretch", "s-"),
      ]);
      expect(report.deliveries.map((d) => d.delivery_type)).toEqual(["windup", "stretch"]);
      expect(delivery(report, "windup").total_pitches).toBe(12);
      expect(delivery(report, "stretch").total_pitches).toBe(12);
    });

    it("never pools windup and stretch pitches of the same type", () => {
      // Same pitch type in both deliveries, but the stretch values are shifted
      // far away. If the two were pooled, within-type variance would explode and
      // the fastball group would report n=12. Neither may happen.
      const rows: PitchObservation[] = [
        ...[0, 1, 2, 3, 4, 5].map((i) => ({
          pitch_id: `w-fb-${i}`,
          pitch_type: "fastball",
          delivery_type: "windup" as const,
          metrics: { energy_angle_deg: FB_ENERGY[i], shoulder_tilt_deg: FB_TILT[i] },
        })),
        ...[0, 1, 2, 3, 4, 5].map((i) => ({
          pitch_id: `s-fb-${i}`,
          pitch_type: "fastball",
          delivery_type: "stretch" as const,
          metrics: { energy_angle_deg: FB_ENERGY[i] + 40, shoulder_tilt_deg: FB_TILT[i] + 40 },
        })),
      ];
      const report = buildTellReport("p1", rows);

      const w = finding(report, "windup", "energy_angle_deg");
      const s = finding(report, "stretch", "energy_angle_deg");
      // One pitch type per delivery → indeterminate, not a fabricated tell.
      expect(w.verdict).toBe("indeterminate");
      expect(s.verdict).toBe("indeterminate");
      expect(w.reason).toBe("not_enough_pitch_types");

      // Group counts prove no pooling occurred.
      expect(delivery(report, "windup").total_pitches).toBe(6);
      expect(delivery(report, "stretch").total_pitches).toBe(6);
      expect(delivery(report, "windup").arsenal[0].n).toBe(6);
      expect(delivery(report, "stretch").arsenal[0].n).toBe(6);
    });

    it("does not let a cross-delivery difference masquerade as a tell", () => {
      // Fastballs only from the windup, curveballs only from the stretch, with a
      // huge gap between them. Pooled, this would look like a screaming tell.
      const rows: PitchObservation[] = [
        ...[0, 1, 2, 3, 4, 5].map((i) => ({
          pitch_id: `w-fb-${i}`,
          pitch_type: "fastball",
          delivery_type: "windup" as const,
          metrics: { energy_angle_deg: FB_ENERGY[i], shoulder_tilt_deg: FB_TILT[i] },
        })),
        ...[0, 1, 2, 3, 4, 5].map((i) => ({
          pitch_id: `s-cb-${i}`,
          pitch_type: "curveball",
          delivery_type: "stretch" as const,
          metrics: { energy_angle_deg: CB_ENERGY[i] + 50, shoulder_tilt_deg: CB_TILT[i] + 50 },
        })),
      ];
      const report = buildTellReport("p1", rows);
      for (const d of report.deliveries) {
        for (const f of d.findings) {
          expect(f.verdict).toBe("indeterminate");
        }
        expect(d.likely_tells).toEqual([]);
      }
    });

    it("excludes pitches with no delivery tag rather than guessing", () => {
      const rows = makeObservations("windup").map((o, i) =>
        i < 3 ? { ...o, delivery_type: null } : o,
      );
      const report = buildTellReport("p1", rows);
      expect(report.excluded_missing_delivery).toBe(3);
      expect(delivery(report, "windup").total_pitches).toBe(9);
      expect(delivery(report, "stretch").total_pitches).toBe(0);
    });
  });

  describe("sample-size confidence", () => {
    it("labels a 5-9 per-type finding as preliminary", () => {
      const report = buildTellReport("p1", makeObservations("windup"));
      const energy = finding(report, "windup", "energy_angle_deg");
      expect(energy.min_group_n).toBe(6);
      expect(energy.confidence).toBe("preliminary");
      expect(describeFinding(energy)).toContain("Early read");
    });

    it("labels a 10+ per-type finding as established", () => {
      const rows = [
        ...makeObservations("windup", "a-"),
        ...makeObservations("windup", "b-"),
      ];
      const report = buildTellReport("p1", rows);
      const energy = finding(report, "windup", "energy_angle_deg");
      expect(energy.min_group_n).toBe(12);
      expect(energy.confidence).toBe("established");
      expect(describeFinding(energy)).not.toContain("Early read");
    });
  });

  describe("arsenal coverage", () => {
    it("reports what is tagged and what is still thin", () => {
      const rows = [
        ...makeObservations("windup").filter((o) => o.pitch_type === "fastball"),
        {
          pitch_id: "w-cb-0",
          pitch_type: "curveball",
          delivery_type: "windup" as const,
          metrics: { energy_angle_deg: 20, shoulder_tilt_deg: 30 },
        },
      ];
      const report = buildTellReport("p1", rows);
      const arsenal = delivery(report, "windup").arsenal;
      const fb = arsenal.find((a) => a.pitch_type === "fastball")!;
      const cb = arsenal.find((a) => a.pitch_type === "curveball")!;
      expect(fb.n).toBe(6);
      expect(fb.meets_minimum).toBe(true);
      expect(fb.pitches_to_confident).toBe(4);
      expect(cb.n).toBe(1);
      expect(cb.meets_minimum).toBe(false);
      expect(cb.pitches_to_minimum).toBe(4);
    });
  });
});
