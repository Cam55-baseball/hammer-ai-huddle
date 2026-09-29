/**
 * Sidearm proposal (owner "Good", 2026-09-29). Arm slot is context only — it
 * never grades and is never shown as a verdict. It only (1) reorders which
 * checks come first and (2) swaps in coaching lines that work from a low slot.
 * Never "get on top" or "raise your elbow".
 */
import type { ReportCardSpec, ReportCardTileSpec, AnalysisLike } from "./types";

type Slot = "high" | "low" | "undetermined";

export function readArmSlot(a: AnalysisLike | null | undefined, module: string | undefined): Slot {
  const r = a as unknown as Record<string, { arm_slot?: { slot?: Slot } } | undefined> | null;
  const key = (module ?? "").toLowerCase() === "throwing" ? "throwing_tiles_deterministic" : "pitching_card_tiles_deterministic";
  return r?.[key]?.arm_slot?.slot ?? "undetermined";
}

/** Low slot: shoulders-wait-for-landing, then front-foot-in-line, first. */
const LOW_SLOT_FIRST = ["trunk_rotation_before_foot_contact", "hip_shoulder_separation", "stride_foot_direction", "drag_line"];

const LOW_SLOT_CUES: Record<string, { baseball: string; softball: string }> = {
  trunk_rotation_before_foot_contact: {
    baseball: "From your slot, let the front foot land first, then let the hips pull the shoulders around. Your arm comes through on its own path.",
    softball: "From your slot, land the front foot first, then let the hips pull the shoulders around to your teammate.",
  },
  hip_shoulder_separation: {
    baseball: "From your slot, keep the front shoulder closed until the front foot lands, then let the hips lead the turn.",
    softball: "From your slot, keep the front shoulder closed until landing, then let the hips lead.",
  },
  stride_foot_direction: {
    baseball: "From your slot, step straight at the target so the turn happens through your hips, not across your body.",
    softball: "From your slot, step straight at your teammate so the turn happens through your hips, not across your body.",
  },
  horizontal_abduction_at_foot_contact: {
    baseball: "From your slot, keep the arm moving with the turn of your body so it never trails far behind you.",
    softball: "From your slot, keep the arm moving with your body's turn so it never trails far behind you.",
  },
  tempo: {
    baseball: "Keep the gather flowing into landing — your slot works best with one smooth move.",
    softball: "Keep the gather flowing into landing — your slot works best with one smooth move.",
  },
};

export function applySlotEmphasis(spec: ReportCardSpec, slot: Slot, sport: string | undefined): ReportCardSpec {
  if (slot !== "low") return spec;
  const sb = (sport ?? "").toLowerCase() === "softball";
  const tiles: ReportCardTileSpec[] = spec.tiles.map((t) => {
    const cue = LOW_SLOT_CUES[t.key];
    return cue ? { ...t, explainer: { ...t.explainer, howToImprove: sb ? cue.softball : cue.baseball } } : t;
  });
  const rank = (t: ReportCardTileSpec) => { const i = LOW_SLOT_FIRST.indexOf(t.key); return i < 0 ? LOW_SLOT_FIRST.length : i; };
  return { ...spec, tiles: tiles.map((t, i) => ({ t, i })).sort((x, y) => rank(x.t) - rank(y.t) || x.i - y.i).map((x) => x.t) };
}

/** Banned in low-slot copy. Test-enforced. */
export const LOW_SLOT_BANNED = [/get on top/i, /raise (?:your|the) elbow/i, /elbow up/i];
export const LOW_SLOT_CUE_TEXT = Object.values(LOW_SLOT_CUES).flatMap((c) => [c.baseball, c.softball]);
