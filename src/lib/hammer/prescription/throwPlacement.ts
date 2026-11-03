/**
 * Owner Nov 3 (round 2) — where throwing lives, by player type. Placement only:
 * no throw is added and no count changes (arm limits were applied before this).
 *
 * POSITION PLAYERS (5Tool; Golden 2Way marked or defaulted position player):
 *   no standalone Throwing card. Throwing warm-up → catch play (long toss inside
 *   catch play) becomes the LAST section of the Warm-up card, where the throws are
 *   logged; every position throw goes to the Defense card.
 * PITCHERS (Complete Pitcher; Golden 2Way marked pitcher): the Throwing card stays,
 *   ordered arm care → throwing warm-up → catch play → long toss.
 * Every throwing item shows how many throws are expected.
 */
type Drill = { name: string; dosage?: string; cue?: string; stage?: string; armCard?: string; armEvent?: { count?: number } | null; [k: string]: unknown };
type Block = { modality: string; status: string; title: string; drills: readonly Drill[]; steps: readonly string[]; [k: string]: unknown };

const ARM_CARE = /band|cuff|scap|activation|neural prep|wrist|forearm|cooldown|cool-down|arm care|arm-care|sleeper|arm prep|arm circles/i;
const WARMUP_THROW = /warm-up throw|warm-up toss|whip throw|tennis-ball|tennis ball/i;
const LONG_TOSS = /long[- ]toss/i;
const CATCH_PLAY = /catch play|extension toss|catch|partner toss|flat-ground toss/i;
const THROW = /throw|toss|catch play|long[- ]toss/i;

export type ThrowKind = "arm_care" | "warmup" | "catch_play" | "long_toss" | "position";
export function throwKind(d: Drill): ThrowKind {
  const n = d.name;
  if (LONG_TOSS.test(n)) return "long_toss";
  if (WARMUP_THROW.test(n)) return "warmup";
  if (CATCH_PLAY.test(n)) return "catch_play";
  if (ARM_CARE.test(n) && !/throws?\b/i.test(d.dosage ?? "")) return "arm_care";
  return THROW.test(n) || d.armEvent ? "position" : "arm_care";
}
const ORDER: Record<ThrowKind, number> = { arm_care: 0, warmup: 1, catch_play: 2, long_toss: 3, position: 4 };

/** "N throws" stays as written; otherwise add the count we know. */
export function withThrowCount(d: Drill): Drill {
  if (throwKind(d) === "arm_care") return d;
  const dose = d.dosage ?? "";
  if (/\bthrows?\b/i.test(dose)) return d;
  const n = d.armEvent?.count ?? (() => {
    const m = dose.match(/(\d+)\s*[x×]\s*(\d+)/i);
    if (m) return Number(m[1]) * Number(m[2]);
    const one = dose.match(/~?\s*(\d+)\s*(reps|each)?/i);
    return one ? Number(one[1]) : null;
  })();
  if (!n) return d;
  return { ...d, dosage: dose ? `${dose} · ${n} throws` : `${n} throws` };
}

const LOG_CARD = /Log these on your (Throwing|arm) card\./g;

export function placeThrowsByRole<B extends Block>(blocks: readonly B[], opts: { pitcher: boolean; toSteps: (d: readonly Drill[]) => string[] }): B[] {
  const out = blocks.map((b) => ({ ...b }));
  const ti = out.findIndex((b) => b.modality === "throwing");
  if (opts.pitcher) {
    return out.map((b) => {
      if (b.modality !== "throwing" || b.status !== "ready") return b;
      const drills = [...b.drills].map((d, i) => ({ d: withThrowCount(d), i }))
        .sort((x, y) => ORDER[throwKind(x.d)] - ORDER[throwKind(y.d)] || x.i - y.i).map((x) => x.d);
      const title = drills.some((d) => throwKind(d) === "position") ? "Throwing — arm care, catch play and position throws" : "Throwing — arm care, warm-up throws, catch play, long toss";
      return { ...b, title, drills, steps: opts.toSteps(drills) };
    });
  }
  const throwing = ti >= 0 ? out[ti] : null;
  const rows = throwing && throwing.status === "ready" ? [...throwing.drills] : [];
  const wi = out.findIndex((b) => b.modality === "warmup" && b.status === "ready");
  const di = out.findIndex((b) => b.modality === "defense" && b.status === "ready");
  const section: Drill[] = [];
  const position: Drill[] = [];
  const ri = out.findIndex((b) => b.modality === "recovery" && b.status === "ready");
  const cooldown: Drill[] = [];
  for (const d of rows) {
    if (ri >= 0 && /cooldown|cool-down/i.test(d.name)) cooldown.push(d);
    else (throwKind(d) === "position" ? position : section).push(withThrowCount(d));
  }
  if (cooldown.length) { const r = out[ri]; const drills = [...r.drills, ...cooldown]; out[ri] = { ...r, drills, steps: opts.toSteps(drills) }; }
  // Warm-up throws already moved into the warm-up: keep them together at the very end.
  if (wi >= 0) {
    const w = out[wi];
    const moved = w.drills.filter((d) => /^(Arm prep|Warm-up throws) — /.test(d.name) && /Throwing card|arm card/.test(d.cue ?? ""));
    const keep = w.drills.filter((d) => !moved.includes(d));
    const all = [...moved.map((d) => ({ ...d, cue: (d.cue ?? "").replace(LOG_CARD, "Log them right here.").trim() })), ...section]
      .map((d, i) => ({ d, i })).sort((x, y) => ORDER[throwKind(x.d)] - ORDER[throwKind(y.d)] || x.i - y.i)
      .map(({ d }) => ({ ...withThrowCount(d), throwSection: true, ...(LONG_TOSS.test(d.name) ? { name: d.name.startsWith("Long toss") ? d.name : `Long toss (inside catch play) — ${d.name}` } : {}) }));
    const drills = [...keep, ...all];
    out[wi] = { ...w, drills, steps: opts.toSteps(drills) };
  }
  if (di >= 0) {
    const def = out[di];
    const drills = [...def.drills.map(withThrowCount), ...position];
    out[di] = { ...def, drills, steps: opts.toSteps(drills) };
  }
  return ti >= 0 ? out.filter((_, i) => i !== ti) : out;
}
