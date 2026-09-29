import { it } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { pointPx } from "../anchors/poseKinematics";
import { stanceBaseline, unroll } from "../anchors/stanceLock";
it("floors", () => {
  const s = decodeLandmarkSeriesText(gunzipSync(readFileSync(__dirname + "/fixtures/still-subject-15d75bc9.ndjson.gz")).toString());
  const L = { baseline: stanceBaseline(s, 0, s.frames.length - 1) }; console.log("F base", JSON.stringify(L.baseline));
  const st = L.baseline?.stature_px ?? 1000, roll = L.baseline?.roll_deg ?? 0;
  const P = (f: any, i: number) => { const p = pointPx(s, f, i); return p ? unroll(p, roll) : null; };
  const sig: Record<string, number[]> = {};
  const add = (k: string, v: number | null) => { if (v != null && Number.isFinite(v)) (sig[k] ??= []).push(v); };
  const ang = (a: any, b: any) => a && b ? Math.atan2(b.y - a.y, Math.abs(b.x - a.x) + 1e-9) * 180 / Math.PI : null;
  for (const f of s.frames) {
    if (!f.pose_detected) continue;
    const ls = P(f, 11), rs = P(f, 12), le = P(f, 2), re = P(f, 5), n = P(f, 0), e7 = P(f, 7), e8 = P(f, 8);
    add("shoulder_tilt_deg", ang(ls, rs)); add("shoulder_dx_frac", ls && rs ? Math.abs(ls.x - rs.x) / (L.baseline?.shoulder_len_px ?? 1) : null);
    add("eye_tilt_deg", ang(le, re)); add("eye_dx_px", le && re ? Math.abs(le.x - re.x) : null);
    for (const [k, i] of [["lank", 27], ["rank", 28], ["ltoe", 31], ["rtoe", 32], ["lwr", 15], ["rwr", 16]] as const) { const p = P(f, i); add(k + "_x_pct", p ? p.x / st * 100 : null); add(k + "_x_in70", p ? p.x / st * 70 : null); }
    add("nose_fwd_ew", n && e7 && e8 ? (n.x - (e7.x + e8.x) / 2) / (L.baseline?.ear_width_px ?? 1) : null);
    const am = P(f, 27) && P(f, 28) ? { x: (P(f, 27)!.x + P(f, 28)!.x) / 2, y: (P(f, 27)!.y + P(f, 28)!.y) / 2 } : null, em = le && re ? { x: (le.x + re.x) / 2, y: (le.y + re.y) / 2 } : null;
    add("balance_deg", am && em ? Math.atan2(em.x - am.x, am.y - em.y) * 180 / Math.PI : null);
    const hl = P(f, 29), tl = P(f, 31); add("foot_len_px", hl && tl ? Math.hypot(hl.x - tl.x, hl.y - tl.y) : null);
    for (const [pk, th] of [[17, 21], [18, 22]]) { const a = P(f, pk), b = P(f, th); add("swivel_" + pk, a && b ? Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI : null); add("handspan_" + pk, a && b ? Math.hypot(b.x - a.x, b.y - a.y) / st * 100 : null); }
  }
  const q = (a: number[], p: number) => { const b = [...a].sort((x, y) => x - y); return b[Math.round(p * (b.length - 1))]; };
  for (const [k, v] of Object.entries(sig)) console.log("F", k, "n", v.length, "med", q(v, .5).toFixed(3), "p2-p98", (q(v, .98) - q(v, .02)).toFixed(3));
});
