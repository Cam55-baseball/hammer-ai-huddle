import { describe, it, expect } from "vitest";
import { BH_UPLOAD_TILES } from "../disciplines/bh";
import { bhContract } from "../contracts/bh.contract";
import { DELAYCAM_PERFORMANCE_SPEC, UPLOAD_FORBIDDEN_WORDS } from "../contracts/delaycamPerformance.spec";

// Rule: a tile's name and definition describe exactly what it measures.
// Upload = body only, so no name/standard/label may promise contact, ball or bat.
describe("upload hitting card naming rule", () => {
  it("tile names and standards never promise contact / ball / bat", () => {
    for (const t of BH_UPLOAD_TILES) {
      expect(t.name, t.key).not.toMatch(UPLOAD_FORBIDDEN_WORDS);
      expect(t.standard ?? "", t.key).not.toMatch(UPLOAD_FORBIDDEN_WORDS);
    }
  });
  it("contract labels never promise contact / ball / bat", () => {
    for (const m of bhContract.metrics) expect(m.label, m.key).not.toMatch(UPLOAD_FORBIDDEN_WORDS);
  });
  it("head and connection tiles are renamed to body-only names", () => {
    const n = (k: string) => BH_UPLOAD_TILES.find((t) => t.key === k)?.name;
    expect(n("eyes_tracking")).toBe("Head Discipline Through the Swing");
    expect(n("back_elbow_contact")).toBe("Back-Elbow Connection");
  });
  it("moved channels are recorded in the DelayCam spec with blockers", () => {
    const keys = DELAYCAM_PERFORMANCE_SPEC.map((e) => e.key);
    for (const k of ["bat_path", "on_plane_pct", "time_to_contact_ms", "bat_speed_contact_mph", "sequencing.barrel", "eyes_tracking.head_ball_alignment", "connection.barrel_to_ball_direction", "contact_frame"]) expect(keys).toContain(k);
    for (const e of DELAYCAM_PERFORMANCE_SPEC) expect(e.blocked_on).toEqual(["native_swift_camera_plugin_240fps", "roboflow_detectors"]);
  });
});
