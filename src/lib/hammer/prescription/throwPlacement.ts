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
    // Arm care, warm-up throws, catch play and long toss move from the Pitching card to the
    // Throwing card (placed just before Pitching). Pitches and full-go work stay on Pitching;
    // a day whose Pitching card would be left empty is not split.
    const pi = out.findIndex((b) => b.modality === "pitching" && b.status === "ready");
    if (pi >= 0) {
      const p = out[pi];
      const isThrowWork = (d: Drill) => d.stage !== "full_go" && (d.armEvent as { kind?: string } | null | undefined)?.kind !== "pitch" && throwKind(d) !== "position" && !/pitch/i.test(d.name);
      const moving = p.drills.filter(isThrowWork);
      const staying = p.drills.filter((d) => !isThrowWork(d));
      if (moving.length && staying.length) {
        out[pi] = { ...p, drills: staying, steps: opts.toSteps(staying) };
        const ti2 = out.findIndex((b) => b.modality === "throwing" && b.status === "ready");
        if (ti2 >= 0) out[ti2] = { ...out[ti2], drills: [...moving, ...out[ti2].drills] };
        else out.splice(pi, 0, { ...p, modality: "throwing", drills: moving, steps: opts.toSteps(moving), route: "/practice?module=throwing", ctaLabel: "Open throwing", gamePlanTemplate: null, because: [] } as B);
      }
    }
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
  for (const d of rows) (throwKind(d) === "position" ? position : section).push(withThrowCount(d));
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
    // A gear-restricted (dry/shadow) Defense card never receives live throws.
    const dry = def.drills.length > 0 && def.drills.every((d) => /dry|shadow|footwork|read/i.test(d.name));
    // Owner Nov 4 r3 Part B readiness gate: no full catch play to the position distance → no position throws.
    const gate = (throwing as { catchPlayGate?: { defenseThrows: boolean; because: string | null } } | null)?.catchPlayGate;
    const held = gate && !gate.defenseThrows;
    const kept = held ? def.drills.filter((d) => !(/throw|toss/i.test(`${d.name} ${d.dosage ?? ""}`) || d.armEvent)) : def.drills;
    const drills = [...kept.map(withThrowCount), ...(dry || held ? [] : position)];
    const because = held && gate!.because ? [...((def as { because?: string[] }).because ?? []), gate!.because] : (def as { because?: string[] }).because;
    out[di] = { ...def, drills, steps: opts.toSteps(drills), ...(because ? { because } : {}) };
  }
  return ti >= 0 ? out.filter((_, i) => i !== ti) : out;
}

/** Owner Nov 4 r4: arm (and any) cool-down rows never sit in the warm-up or on a throwing card —
 *  they move, unchanged, to the Recovery card. Placement only: no row is added or re-dosed. */
export const COOLDOWN_ROW = /cooldown|cool-down|cool down/i;
export function withCooldownInRecovery<B extends Block>(blocks: readonly B[], opts: { toSteps: (d: readonly Drill[]) => string[] }): B[] {
  const out = blocks.map((b) => ({ ...b }));
  const moved: Drill[] = [];
  out.forEach((b, i) => {
    if (b.modality === "recovery" || b.status !== "ready") return;
    if (!["warmup", "throwing", "pitching", "defense"].includes(b.modality)) return;
    const cool = b.drills.filter((d) => COOLDOWN_ROW.test(d.name));
    if (!cool.length) return;
    const keep = b.drills.filter((d) => !COOLDOWN_ROW.test(d.name));
    for (const d of cool) if (!moved.some((m) => m.name === d.name)) moved.push({ ...d, throwSection: undefined, stage: "prep" });
    out[i] = { ...b, drills: keep, steps: opts.toSteps(keep) };
  });
  if (!moved.length) return out;
  const ri = out.findIndex((b) => b.modality === "recovery" && b.status === "ready");
  if (ri >= 0) {
    const r = out[ri];
    const drills = [...r.drills, ...moved];
    const dm = (r as { durationMin?: number }).durationMin;
    out[ri] = { ...r, drills, steps: opts.toSteps(drills), ...(typeof dm === "number" ? { durationMin: dm + 6 } : {}) };
    return out;
  }
  // No Recovery card today: open one for the cool-down (never leave it in the warm-up).
  const src = out.find((b) => b.modality === "warmup") ?? out[0];
  if (!src) return out;
  out.push({ ...src, modality: "recovery", title: "Recovery — arm cool-down", why: "Cool down your arm after today's throws.", drills: moved, steps: opts.toSteps(moved), route: "/bounce-back-bay", ctaLabel: "Open recovery", durationMin: 6, gamePlanTemplate: null, because: [] } as B);
  return out;
}
