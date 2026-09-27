/**
 * Side-mismatch check — compares the declared side against the footage.
 *
 * Owner rule (2026-09-27): runs before tile values; a mismatch asks the user,
 * never silently switches or proceeds; inconclusive → proceed on the declared
 * side and say the check could not confirm it. A check that cries wolf is
 * worse than none, so a signal may only vote once it has been shown reliable.
 *
 * Validation against the owner-confirmed LEFT 24 fps clips (914cf54c,
 * 9d2e117e) and the still clip — every candidate signal FAILED:
 *  - stride_foot: largest ankle rise. 914cf54c → left ankle 0.235 bh at the
 *    walk-off (frame 214) beats the real right-foot lift 0.169 (frame 177);
 *    9d2e117e → left ankle 0.158 (frame 34) vs right 0.061. Both point RIGHT-
 *    handed → false mismatch on 2/2 confirmed clips.
 *  - top_hand: stance wrist height. 914cf54c → left wrist 0.118 LOWER (reads
 *    right-handed); 9d2e117e → 0.009 (indistinguishable). False / inconclusive.
 *  - stance_orientation: shoulder x-order flips with camera side; from one
 *    angle it cannot separate "lefty filmed from 1B" from "righty from 3B"
 *    without direction_sign, which is itself derived FROM the declared side.
 *    Circular → excluded.
 * So RELIABLE_SIGNALS is empty and the verdict is always "inconclusive" with
 * the evidence recorded. Add a signal here only after it passes the confirmed
 * clips without a false mismatch.
 */
import type { LandmarkSeries } from "../pose/landmarkSeriesFormat";
import type { Handedness } from "./strideSide";

export const SIDE_CHECK_VERSION = "side_check@1.0.0-no-reliable-signal";
export type SideSignal = "stride_foot" | "top_hand" | "stance_orientation";
export const RELIABLE_SIGNALS: readonly SideSignal[] = [];

export interface SideSignalEvidence {
  readonly signal: SideSignal;
  readonly suggests: Handedness | null;
  readonly detail: Record<string, number | string | null>;
  readonly reliable: boolean;
}
export interface SideCheckResult {
  readonly version: string;
  readonly declared: Handedness;
  readonly verdict: "consistent" | "mismatch" | "inconclusive";
  readonly suggested: Handedness | null;
  readonly reason: string;
  readonly evidence: readonly SideSignalEvidence[];
}

const MIN_VIS = 0.5;
function pt(f: LandmarkSeries["frames"][number], i: number) {
  if (!f.pose_detected || (f.visibility?.[i] ?? 0) < MIN_VIS) return null;
  const x = f.normalized[i * 3], y = f.normalized[i * 3 + 1];
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}
const med = (a: number[]) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return b[Math.floor((b.length - 1) / 2)]; };
const r4 = (n: number | null) => (n == null ? null : Math.round(n * 1e4) / 1e4);

export function checkDeclaredSide(series: LandmarkSeries, declared: Handedness): SideCheckResult {
  const H: number[] = []; const ank: Record<27 | 28, [number, number][]> = { 27: [], 28: [] }; const wr: number[] = [];
  series.frames.forEach((f, k) => {
    const p = [11, 12, 27, 28].map((i) => pt(f, i));
    if (p.every(Boolean)) H.push(Math.abs((p[2]!.y + p[3]!.y) / 2 - (p[0]!.y + p[1]!.y) / 2));
    for (const i of [27, 28] as const) { const q = pt(f, i); if (q && q.x > 0.005 && q.x < 0.995) ank[i].push([k, q.y]); }
    const lw = pt(f, 15), rw = pt(f, 16); if (lw && rw) wr.push(lw.y - rw.y);
  });
  const h = med(H);
  const rise = (i: 27 | 28) => { const ys = ank[i].map((r) => r[1]); const b = med(ys.slice(0, Math.ceil(ys.length / 2))); if (b == null || !h) return null; return Math.max(0, ...ys.map((y) => (b - y) / h)); };
  const rl = rise(27), rr = rise(28);
  // Front foot lifts: left ankle lifting → right-handed (R).
  const stride: Handedness | null = rl == null || rr == null || Math.max(rl, rr) < 0.1 ? null : rl > rr ? "R" : "L";
  const wd = med(wr.slice(0, Math.ceil(wr.length * 0.3)));
  // Left wrist lower (bottom hand) → right-handed.
  const hand: Handedness | null = wd == null || Math.abs(wd) < 0.02 ? null : wd > 0 ? "R" : "L";
  const evidence: SideSignalEvidence[] = [
    { signal: "stride_foot", suggests: stride, detail: { left_ankle_rise_bh: r4(rl), right_ankle_rise_bh: r4(rr) }, reliable: RELIABLE_SIGNALS.includes("stride_foot") },
    { signal: "top_hand", suggests: hand, detail: { left_minus_right_wrist_y: r4(wd) }, reliable: RELIABLE_SIGNALS.includes("top_hand") },
    { signal: "stance_orientation", suggests: null, detail: { excluded: "circular_with_direction_sign_single_camera" }, reliable: false },
  ];
  const votes = evidence.filter((e) => e.reliable && e.suggests != null);
  if (votes.length === 0) return { version: SIDE_CHECK_VERSION, declared, verdict: "inconclusive", suggested: null, reason: "no_reliable_signal_could_confirm_side", evidence };
  const s = votes[0].suggests!;
  if (votes.some((v) => v.suggests !== s)) return { version: SIDE_CHECK_VERSION, declared, verdict: "inconclusive", suggested: null, reason: "reliable_signals_disagree", evidence };
  return { version: SIDE_CHECK_VERSION, declared, verdict: s === declared ? "consistent" : "mismatch", suggested: s, reason: s === declared ? "footage_agrees" : "footage_contradicts_declared_side", evidence };
}
