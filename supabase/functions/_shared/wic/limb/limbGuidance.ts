// _shared/wic/limb/limbGuidance.ts — limb-size guidance (owner approved 2026-10-07, safety first).
// Pure. Reads ONLY athlete_context.anthropometrics (the one player profile).
// Guidance is information on a card: it never adds, removes or changes a card, exercise or dose,
// and it never overrides age, growth, injury or phase rules (it only gets QUIETER under them):
//  - growth mode: no stride target (don't chase stride while growing); mobility emphasis on.
//  - injury to an area: that area's hint is dropped.
//  - under 9 or unknown age: no extension number, bat guidance only.
// Never grades or changes arm slot (elite filter) — the slot line only says it is the athlete's own.

export const LIMB_GUIDANCE_VERSION = "limb_guidance_v1";

const pos = (v: unknown): number | null => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
const r1 = (x: number) => Math.round(x * 10) / 10;
const ftIn = (inches: number) => `${Math.floor(inches / 12)} ft ${Math.round(inches % 12)} in`;

export interface LimbInput {
  anthropometrics: Record<string, unknown> | null | undefined;
  age: number | null;
  sport: "baseball" | "softball";
  growthMode: boolean;
  pain: Partial<Record<"arm" | "leg" | "back", boolean>>;
}

export interface LimbHints {
  version: string;
  stride: string | null;      // speed card
  extension: string | null;   // throwing / pitching cards
  bat: string | null;         // bat-speed card
  mobility: string | null;    // first lift / mobility row
}

/** Bat length by height (inches), the common youth/adult chart. */
export function batLengthFor(heightIn: number, weightLb: number | null): number {
  const bands: [number, number][] = [[40, 26], [44, 27], [48, 28], [52, 29], [56, 30], [60, 31], [64, 32], [68, 33], [72, 33], [999, 34]];
  let len = bands.find(([h]) => heightIn <= h)![1];
  if (weightLb != null && weightLb >= 180 && len < 34) len += 1;
  if (weightLb != null && weightLb < 70 && len > 26) len -= 1;
  return len;
}
export function batDropFor(age: number | null, sport: "baseball" | "softball"): string {
  if (sport === "softball") return age != null && age < 14 ? "-11 to -12" : "-9 to -10";
  if (age == null || age < 10) return "-10 to -12";
  if (age < 13) return "-8 to -10";
  if (age < 15) return "-5 to -8";
  return "-3 (high school and college rules)";
}

export function limbGuidance(i: LimbInput): LimbHints {
  const a = (i.anthropometrics ?? {}) as Record<string, unknown>;
  const h = pos(a.height_in), ws = pos(a.wingspan_in), leg = pos(a.leg_length_in);
  const arm = pos(a.arm_total_in), torso = pos(a.torso_in), femur = pos(a.femur_in);
  const wt = pos(a.weight_lbs) ?? pos(a.weight_lb);
  const out: LimbHints = { version: LIMB_GUIDANCE_VERSION, stride: null, extension: null, bat: null, mobility: null };

  // Sprint stride relative to leg length (top speed ≈ 2.1–2.5 × leg length; first steps short).
  if (leg && !i.growthMode && !i.pain.leg && (i.age == null || i.age >= 11)) {
    const lo = leg * 2.1, hi = leg * 2.5;
    out.stride = `Stride guide for your leg length (${r1(leg)} in): first 3 steps short and quick; at top speed about ${ftIn(lo)} to ${ftIn(hi)} per step. Never reach for it — push the ground back.`;
  }

  // Pitching extension context (release point out front) from height, arms and torso.
  if (h && !i.pain.arm && i.age != null && i.age >= 9) {
    const span = ws ?? (arm ? arm * 2 + (h * 0.24) : h);
    const base = h * 0.8 + (span - h) * 0.5 + (torso && femur ? (femur - torso) * 0.1 : 0);
    out.extension = `Extension guide for your size: release about ${ftIn(base - 3)} to ${ftIn(base + 3)} in front of the rubber. It comes from a strong stride, not from reaching. Your arm slot is your own — we never change it.`;
  }

  // Bat size from height, weight and arm length.
  if (h) {
    let len = batLengthFor(h, wt);
    if (arm && h && arm / h > 0.47 && len < 34) len += 1; // long arms reach a slightly longer bat
    if (arm && h && arm / h < 0.41 && len > 26) len -= 1;
    out.bat = `Bat size guide: about ${len} in long, drop ${batDropFor(i.age, i.sport)}. Check it: knob on the middle of your chest, arm straight out — your fingertips should reach the end. League bat rules come first.`;
  }

  // Mobility emphasis for long levers and during growth.
  const longLegs = (leg && h && leg / h > 0.49) || (femur && torso && femur / torso > 1.15);
  const longArms = ws && h && ws / h > 1.04;
  const parts: string[] = [];
  if (i.growthMode) parts.push("hamstrings, calves and quads every day while you're growing");
  if (longLegs && !i.pain.leg) parts.push("hips and hamstrings (long legs)");
  if (longArms && !i.pain.arm) parts.push("upper back and lats (long arms)");
  if (parts.length) out.mobility = `Mobility focus for your body: ${parts.join("; ")}. Do it in the warm-up and after training.`;
  return out;
}

/** Which row gets which hint: the first row on each card. */
export function attachLimbHints<T extends { slot?: string | null; sequence_role?: string | null; why_payload?: any }>(rows: readonly T[], hints: LimbHints): T[] {
  const out = rows.map((r) => r);
  const put = (pred: (r: T) => boolean, text: string | null) => {
    if (!text) return;
    const idx = out.findIndex(pred);
    if (idx < 0) return;
    out[idx] = { ...out[idx], why_payload: { ...(out[idx].why_payload ?? {}), limb_hint: text } } as T;
  };
  put((r) => r.slot === "speed", hints.stride);
  put((r) => r.slot === "bat_speed", hints.bat);
  put((r) => r.slot === "windmill" || r.slot === "throwing" || r.slot === "ub_primer", hints.extension);
  put((r) => r.slot === "lift" && !(r.why_payload as any)?.limb_hint, hints.mobility);
  return out;
}
