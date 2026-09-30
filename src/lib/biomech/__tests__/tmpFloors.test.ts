import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { LM, pointPx, mid, median, bodyScalePx } from "../anchors/poseKinematics";
const s = decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", "still-subject-15d75bc9.ndjson.gz"))).toString("utf8"));
it("floors", () => {
  const st = bodyScalePx(s)!; const F = s.frames;
  const rng = (xs: number[]) => { const m = median(xs)!; return Math.max(...xs.map((x) => Math.abs(x - m))); };
  const m3 = (arr: (number|null)[]) => arr.map((_, k) => { const w = [arr[k-1], arr[k], arr[k+1]].filter((x): x is number => x != null); return w.length >= 2 ? median(w) : null; });
  const out: Record<string, number> = { stature_px: st, fps: s.header.fps_true ?? 0, frames: F.length };
  const hipMidY = m3(F.map((f) => mid(pointPx(s, f, LM.L_HIP), pointPx(s, f, LM.R_HIP))?.y ?? null)).filter((x): x is number => x != null);
  out.com_drop_pct = rng(hipMidY) * 100 / st;
  for (const [n, i] of [["lhip_x", LM.L_HIP], ["rhip_x", LM.R_HIP]] as const) out[n + "_pct"] = rng(m3(F.map((f) => pointPx(s, f, i)?.x ?? null)).filter((x): x is number => x != null)) * 100 / st;
  // trunk-tibia angle both sides
  for (const side of ["L", "R"] as const) {
    const K = side === "L" ? LM.L_KNEE : LM.R_KNEE, A = side === "L" ? LM.L_ANKLE : LM.R_ANKLE;
    const v = F.map((f) => { const S = mid(pointPx(s, f, LM.L_SHOULDER), pointPx(s, f, LM.R_SHOULDER)), H = mid(pointPx(s, f, LM.L_HIP), pointPx(s, f, LM.R_HIP)), k = pointPx(s, f, K), a = pointPx(s, f, A);
      if (!S || !H || !k || !a) return null; const t = Math.atan2(S.x - H.x, H.y - S.y), b = Math.atan2(k.x - a.x, a.y - k.y); return Math.abs(((t - b) * 180 / Math.PI + 540) % 360 - 180); });
    out["trunk_tibia_" + side] = rng(m3(v).filter((x): x is number => x != null));
  }
  // world hip yaw
  const yaw = F.map((f) => { const w = f.world as number[] | undefined; if (!w || w.length < 99) return null; return Math.atan2(w[LM.R_HIP*3+2] - w[LM.L_HIP*3+2], w[LM.R_HIP*3] - w[LM.L_HIP*3]) * 180 / Math.PI; }).filter((x): x is number => x != null);
  out.world_hip_yaw_deg = yaw.length ? rng(yaw) : -1;
  // body speed % stature/s
  const idx = [LM.L_WRIST, LM.R_WRIST, LM.L_HIP, LM.R_HIP, LM.L_SHOULDER, LM.R_SHOULDER, LM.L_ANKLE, LM.R_ANKLE];
  const sp: (number|null)[] = F.map((f, k) => { if (k === 0 || k === F.length - 1) return null; const dt = F[k+1].timestamp_seconds - F[k-1].timestamp_seconds; const v = idx.map((i) => { const a = pointPx(s, F[k-1], i), b = pointPx(s, F[k+1], i); return a && b ? Math.hypot(b.x-a.x, b.y-a.y) / dt * 100 / st : null; }).filter((x): x is number => x != null); return v.length >= 6 ? median(v) : null; });
  const sm = m3(sp).filter((x): x is number => x != null);
  out.body_speed_median = median(sm)!; out.body_speed_max = Math.max(...sm);
  console.log(JSON.stringify(out));
});
