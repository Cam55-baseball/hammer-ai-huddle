/**
 * Step 24 item 3 — no activity ever shows "a guide is on the way".
 *
 * A hand-written guide in movementGuide.ts is always preferred. When there
 * isn't one, this composes a real, structured guide out of the activity's own
 * stored fields — setup, cue, stop-if, dose, and (for a series) each part of
 * the series as its own numbered step. Nothing is invented about the movement:
 * every sentence is built from what the movement row itself says, plus the
 * general coaching rules for its family.
 *
 * Output shape is the athlete-facing order the owner asked for:
 *   Setup · numbered Steps · Key cues · Common mistakes · Easier version · Stop if
 */
import { doseBullets } from "@/lib/hammer/prescription/doseBullets";

export interface ComposedGuide {
  readonly setup: string;
  readonly steps: ReadonlyArray<string>;
  readonly keyCues: ReadonlyArray<string>;
  readonly mistakes: ReadonlyArray<string>;
  readonly easier: string;
  readonly stopIf: string;
}

export interface ComposeInput {
  name: string;
  slug?: string | null;
  setup?: string | null;
  cue?: string | null;
  stopIf?: string | null;
  dosage?: string | null;
  bucket?: string | null;
}

type Family = "arm_care" | "throwing" | "hitting" | "speed" | "jump" | "lift" | "mobility" | "conditioning" | "general";

function familyOf(i: ComposeInput): Family {
  // Word-boundary matching only. Substring matching used to read "scrunch" as
  // "run" and hand a foot drill the sprint guide (Step 24 item 3 follow-up).
  const t = ` ${`${i.name} ${i.slug ?? ""} ${i.bucket ?? ""}`.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  const has = (...words: string[]) => words.some((w) => t.includes(` ${w} `));
  if (has("arm", "armcare", "arm care", "cuff", "scap", "scaps", "rotator", "pronation", "supination", "forearm", "band", "bands")) return "arm_care";
  if (has("throw", "throws", "throwing", "catch", "catching", "toss", "long", "plyo ball", "pickoff", "pitch", "pitching")) return "throwing";
  if (has("swing", "swings", "tee", "bat", "hitting", "barrel")) return "hitting";
  if (has("sprint", "sprints", "accel", "acceleration", "run", "runs", "running", "skip", "skips", "wicket", "wickets", "dash", "speed", "sled", "fly")) return "speed";
  if (has("jump", "jumps", "hop", "hops", "bound", "bounds", "pogo", "pogos", "plyo", "plyos")) return "jump";
  if (has("squat", "squats", "press", "deadlift", "row", "rows", "hinge", "lunge", "lunges", "carry", "carries", "curl", "curls", "lift", "lifts", "bench", "pull", "chin")) return "lift";
  if (has("mobility", "stretch", "flow", "breath", "breathing", "reach", "roll", "fascia", "foot", "ankle", "car", "cars", "isometric", "hold", "holds", "scrunch")) return "mobility";
  if (has("tempo", "conditioning", "aerobic", "circuit", "bike", "row erg")) return "conditioning";
  return "general";
}


const FAMILY: Record<Family, { cues: string[]; mistakes: string[]; easier: string; stopIf: string; open: string }> = {
  arm_care: {
    open: "Light, controlled shoulder work. It is preparation and maintenance, not a workout — you should finish feeling warm, never tired.",
    cues: ["Set your shoulder blades before your arm moves.", "Slow on the way back — the return is the part that builds the arm.", "Breathe out on the effort; never hold your breath."],
    mistakes: ["Using a heavy band and yanking the reps.", "Letting the elbow drift away from the body when the drill says to keep it in.", "Rushing through to finish, so the cuff never actually works."],
    easier: "Step closer to the anchor for less band tension, or drop to half the listed reps and keep every rep clean.",
    stopIf: "Any sharp or pinching pain in the shoulder or elbow, or numbness down the arm.",
  },
  throwing: {
    open: "Throwing work. The arm follows the body, so the legs and trunk lead every rep.",
    cues: ["Four-seam grip across the seams — fingers on top, thumb underneath.", "Chest finishes over the front leg.", "Throw through the target, not at it."],
    mistakes: ["All arm, no legs.", "Rushing the count between throws.", "Pushing the intent higher than the drill asks for."],
    easier: "Shorten the distance and drop the intent to about 60 percent; keep the same shapes.",
    stopIf: "Elbow or shoulder pain, or the arm feels heavy and slow instead of loose.",
  },
  hitting: {
    open: "Swing work. Quality of the shape matters more than how hard you hit it.",
    cues: ["Take your normal stance and your normal grip.", "Move the barrel through the ball, not at it.", "Finish balanced — you should be able to hold the finish."],
    mistakes: ["Swinging faster than you can control.", "Casting the hands out away from the body.", "Falling off the back side."],
    easier: "Cut the round in half and slow the tempo down until the shape is repeatable.",
    stopIf: "Wrist, back or rib pain, or the swing falls apart from fatigue.",
  },
  speed: {
    open: "Speed work. It is only speed work if you are fresh — full rest between reps is part of the prescription.",
    cues: ["Tall posture, eyes level.", "Push the ground back behind you.", "Full recovery between reps — walk back slowly."],
    mistakes: ["Cutting the rest short and turning it into conditioning.", "Reaching the foot out in front of the body.", "Straining the face and shoulders."],
    easier: "Drop to about 80 percent effort over a shorter distance and add rest between reps.",
    stopIf: "Any pull or grab in the hamstring, calf or groin. Stop at the first twinge.",
  },
  jump: {
    open: "Jump work for springiness. Small numbers, maximum quality.",
    cues: ["Stiff ankles, quiet landings.", "Land where you took off.", "Stop the set the moment the ground time gets slow."],
    mistakes: ["Chasing the number of reps instead of the quality.", "Loud, heavy landings.", "Collapsing the knees inward on landing."],
    easier: "Halve the contacts, or do the same drill with both legs instead of one.",
    stopIf: "Knee, shin or achilles pain, or landings stop feeling controlled.",
  },
  lift: {
    open: "Loaded strength work. Position first, weight second.",
    cues: ["Brace the trunk before the bar or weight moves.", "Control the lowering.", "Leave the listed reps in the tank — this is not a max."],
    mistakes: ["Adding weight before the position is solid.", "Letting the back round or the knees cave.", "Holding the breath through the whole set."],
    easier: "Reduce the load, or do the same movement with bodyweight until the shape is clean.",
    stopIf: "Sharp joint or back pain, or your form breaks down — put the weight down.",
  },
  mobility: {
    open: "Mobility and position work. This is a downshift, not a workout.",
    cues: ["Move slowly and breathe.", "Go to a mild stretch, never to pain.", "Own the end range — don't bounce."],
    mistakes: ["Forcing the range.", "Rushing through to tick it off.", "Holding your breath."],
    easier: "Reduce the range and hold for less time.",
    stopIf: "Sharp pain, pins and needles, or dizziness.",
  },
  conditioning: {
    open: "Conditioning. Steady and repeatable — you should be able to finish the last rep like the first.",
    cues: ["Set a pace you can hold.", "Stay tall as fatigue arrives.", "Breathe on a rhythm."],
    mistakes: ["Starting too fast.", "Letting posture fall apart at the end.", "Turning a steady effort into a race."],
    easier: "Cut the volume by a third and keep the pace.",
    stopIf: "Chest pain, dizziness, or you can no longer hold the pace safely.",
  },
  general: {
    open: "Work prescribed as part of today's plan.",
    cues: ["Take your time setting up.", "Control every rep.", "Stop the set when quality drops."],
    mistakes: ["Rushing the setup.", "Chasing reps over quality.", "Ignoring the dose."],
    easier: "Halve the listed volume and keep the quality high.",
    stopIf: "Any sharp pain, or you can't do the movement as described.",
  },
};

export function composeGuide(input: ComposeInput): ComposedGuide {
  const fam = FAMILY[familyOf(input)];
  const parts = doseBullets(input.dosage);

  const steps: string[] = [];
  steps.push(input.setup?.trim() ? `Set up: ${input.setup.trim()}` : "Get into position and take one easy practice rep before you start counting.");
  if (parts.bullets.length > 0) {
    steps.push("Work through the series in order, one part at a time:");
    parts.bullets.forEach((b) => steps.push(b));
    steps.push("Rest only as long as you need between parts, then move to the next one.");
  } else if (input.dosage?.trim()) {
    steps.push(`Complete the prescribed dose: ${input.dosage.trim()}.`);
  }
  if (input.cue?.trim()) steps.push(`Hold this through every rep: ${input.cue.trim()}`);
  steps.push("Finish the last rep as cleanly as the first — if you can't, stop the set there.");

  const keyCues = input.cue?.trim() ? [input.cue.trim(), ...fam.cues] : [...fam.cues];

  return {
    setup: input.setup?.trim() || `${fam.open} ${parts.heading ? `This one is a series: ${parts.heading}.` : ""}`.trim(),
    steps,
    keyCues,
    mistakes: fam.mistakes,
    easier: fam.easier,
    stopIf: input.stopIf?.trim() || fam.stopIf,
  };
}
