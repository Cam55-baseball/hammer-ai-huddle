/**
 * Equipment vocabulary + deterministic statement parser.
 *
 * Constitutional stance: the language model is NEVER allowed to claim that an
 * athlete's equipment was saved. Parsing here is deterministic, testable, and
 * allow-listed against the canonical token set used by
 * `wk_movement_catalog.equipment_requirements` (mirrored by the onboarding
 * EquipmentStep picker). A confirmation message may only ever be produced by a
 * confirmed database write, and only for the tokens this parser resolved.
 *
 * Pure — no I/O.
 */

export interface EquipmentTokenDef {
  readonly token: string;
  readonly label: string;
  /** Lowercase phrases that unambiguously mean this token. */
  readonly phrases: ReadonlyArray<string>;
}

/** Canonical allow-list. Tokens outside this list are never persisted. */
export const EQUIPMENT_VOCABULARY: ReadonlyArray<EquipmentTokenDef> = [
  { token: "barbell", label: "barbell", phrases: ["barbell", "bar bell", "olympic bar"] },
  { token: "plates", label: "weight plates", phrases: ["weight plates", "plates", "bumper plates"] },
  { token: "squat_rack", label: "squat rack", phrases: ["squat rack", "power rack", "rack"] },
  { token: "bench", label: "bench", phrases: ["bench press", "flat bench", "bench"] },
  { token: "dumbbell", label: "dumbbells", phrases: ["dumbbells", "dumbbell", "db's", "dbs"] },
  { token: "kettlebell", label: "kettlebells", phrases: ["kettlebells", "kettlebell", "kettle bell"] },
  { token: "trap_bar", label: "trap bar", phrases: ["trap bar", "hex bar"] },
  { token: "cable_stack", label: "cable machine", phrases: ["cable machine", "cable stack", "cables"] },
  { token: "landmine", label: "landmine", phrases: ["landmine"] },
  { token: "box", label: "box or step", phrases: ["plyo box", "jump box", "step box", "box"] },

  { token: "mini_band", label: "mini bands", phrases: ["mini bands", "mini band", "loop bands"] },
  { token: "jband", label: "J-Bands", phrases: ["j-bands", "j bands", "jbands", "jaeger bands"] },
  { token: "bands", label: "resistance bands", phrases: ["resistance bands", "resistance band", "bands", "band"] },
  { token: "med_ball", label: "medicine ball", phrases: ["medicine ball", "med ball", "med balls", "medballs"] },
  { token: "plyo_ball", label: "plyo balls", phrases: ["plyo balls", "plyo ball", "plyocare"] },
  { token: "ladder", label: "agility ladder", phrases: ["agility ladder", "speed ladder", "ladder"] },
  { token: "hurdles", label: "mini hurdles", phrases: ["mini hurdles", "hurdles", "hurdle"] },
  { token: "foam_roller", label: "foam roller", phrases: ["foam roller", "foam rolling"] },
  { token: "lacrosse_ball", label: "massage ball", phrases: ["lacrosse ball", "massage ball"] },
  { token: "rebounder", label: "rebounder net", phrases: ["rebounder", "bounce back net", "pitchback"] },

  { token: "gamer_bat", label: "game bat", phrases: ["game bat", "gamer bat", "my bat", "a bat", "bat"] },
  { token: "overload_bat", label: "heavy (overload) bat", phrases: ["overload bat", "heavy bat", "weighted bat"] },
  { token: "underload_bat", label: "light (underload) bat", phrases: ["underload bat", "light bat", "speed bat"] },
  { token: "tee", label: "hitting tee", phrases: ["hitting tee", "batting tee", "tee"] },
  { token: "ball", label: "balls", phrases: ["baseballs", "softballs", "wiffle balls", "balls"] },
  { token: "net", label: "net or cage", phrases: ["batting cage", "hitting net", "cage", "net"] },
  { token: "screen", label: "front toss screen", phrases: ["front toss screen", "l-screen", "l screen", "toss screen", "screen"] },
  { token: "pitching_machine", label: "pitching machine", phrases: ["pitching machine", "hitting machine", "jugs machine", "hack attack", "iron mike", "spinball", "machine"] },
  { token: "weighted_ball", label: "weighted balls", phrases: ["weighted baseballs", "weighted balls", "weighted ball", "overload balls"] },
  { token: "glove", label: "glove or mitt", phrases: ["fielding glove", "first base mitt", "catchers mitt", "catcher's mitt", "glove", "mitt"] },
  { token: "catchers_gear", label: "catcher's gear", phrases: ["catchers gear", "catcher's gear", "catching gear", "chest protector", "shin guards", "catchers mask"] },
  { token: "radar", label: "radar gun", phrases: ["radar gun", "pocket radar", "stalker gun", "radar"] },
  { token: "bat_sensor", label: "bat sensor", phrases: ["blast motion", "bat sensor", "diamond kinetics", "swing sensor"] },
  { token: "mound", label: "a pitching mound", phrases: ["pitching mound", "portable mound", "bullpen mound", "mound"] },
  { token: "turf", label: "turf or hitting mat", phrases: ["turf mat", "hitting mat", "artificial turf", "turf"] },
  { token: "wall", label: "a throwing wall", phrases: ["throwing wall", "brick wall", "wall"] },
  { token: "field", label: "a field", phrases: ["a field", "the field", "diamond", "field"] },
  { token: "open_space", label: "open running space", phrases: ["open space", "open field", "running space", "yard", "park"] },
  { token: "bodyweight", label: "bodyweight only", phrases: ["bodyweight only", "just bodyweight", "body weight only", "nothing but my body"] },
];

const LABEL_BY_TOKEN = new Map(EQUIPMENT_VOCABULARY.map((d) => [d.token, d.label]));

/** Human label for a stored token — never shows a raw identifier. */
export function equipmentLabel(token: string): string {
  return LABEL_BY_TOKEN.get(token) ?? token.replace(/_/g, " ");
}

/** "tee, net and front toss screen" */
export function equipmentList(tokens: ReadonlyArray<string>): string {
  const labels = tokens.map(equipmentLabel);
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

export type EquipmentScopeHint = "persistent" | "session";
export type ParseConfidence = "high" | "low" | "none";

export interface ParsedEquipmentStatement {
  /** Tokens the athlete says they HAVE. */
  readonly have: ReadonlyArray<string>;
  /** Tokens the athlete says they do NOT have (removed from the profile). */
  readonly lacks: ReadonlyArray<string>;
  readonly scope: EquipmentScopeHint;
  readonly confidence: ParseConfidence;
  /** Phrase → token evidence, for the "here's what I understood" prompt. */
  readonly matches: ReadonlyArray<{ phrase: string; token: string; negated: boolean }>;
}

const HEDGE = /\b(maybe|not sure|might|i think|used to|probably|sometimes|if i|when i|kind of|sort of)\b/;
const POSSESSION = /\b(i have|i've got|ive got|i got|i own|we have|we've got|i can use|access to|there(?:'s| is)|i use|my setup|available|i do have|got a|got some|have a|have some|bring|brought)\b/;
const NEGATION = /\b(no|not|don'?t|dont|never|without|sold|lost|lack|do not|haven'?t)\b/;
const TEMPORARY = /\b(today|tonight|this week|right now|for now|hotel|travel(?:ling|ing)?|on the road|away|temporarily|just today)\b/;

/** Split into clauses so "I have a tee but no net" resolves both ways. */
function clauses(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[.;!?\n]|,| but | and then | however | although /)
    .map((c) => c.trim())
    .filter(Boolean);
}

/**
 * Parse an athlete's free-text statement into canonical equipment tokens.
 *
 * Returns `confidence: "none"` when nothing recognisable was said, and
 * `"low"` when the wording hedges — callers must ask for confirmation
 * instead of writing anything in that case.
 */
export function parseEquipmentStatement(raw: string): ParsedEquipmentStatement {
  const text = (raw ?? "").toLowerCase();
  const have = new Set<string>();
  const lacks = new Set<string>();
  const matches: Array<{ phrase: string; token: string; negated: boolean }> = [];

  for (const clause of clauses(text)) {
    const negated = NEGATION.test(clause);
    const claimed = new Set<string>();
    for (const def of EQUIPMENT_VOCABULARY) {
      for (const phrase of def.phrases) {
        const re = new RegExp(`(^|[^a-z])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`);
        if (!re.test(clause)) continue;
        // Longest phrase wins per token; skip a token already claimed here.
        if (claimed.has(def.token)) break;
        claimed.add(def.token);
        matches.push({ phrase, token: def.token, negated });
        if (negated) lacks.add(def.token);
        else have.add(def.token);
        break;
      }
    }
  }

  // A token can't be both had and lacked — an explicit negation wins.
  for (const t of lacks) have.delete(t);

  const anything = have.size > 0 || lacks.size > 0;
  let confidence: ParseConfidence = "none";
  if (anything) {
    const hedged = HEDGE.test(text) || text.trim().endsWith("?");
    const asserted = POSSESSION.test(text) || NEGATION.test(text) || /^[\s\w,/-]+$/.test(text.trim());
    confidence = hedged || !asserted ? "low" : "high";
  }

  return {
    have: [...have],
    lacks: [...lacks],
    scope: TEMPORARY.test(text) ? "session" : "persistent",
    confidence,
    matches,
  };
}

/** Merge a parsed statement into the athlete's existing stored equipment. */
export function mergeEquipment(
  existing: ReadonlyArray<string>,
  parsed: Pick<ParsedEquipmentStatement, "have" | "lacks">,
): string[] {
  const next = new Set(existing.filter((t) => LABEL_BY_TOKEN.has(t)));
  // "just bodyweight" is a declaration that replaces the inventory.
  if (parsed.have.includes("bodyweight")) return ["bodyweight"];
  for (const t of parsed.have) if (LABEL_BY_TOKEN.has(t)) next.add(t);
  for (const t of parsed.lacks) next.delete(t);
  if (next.size > 1) next.delete("bodyweight");
  return [...next];
}

/** True when an affirmative reply confirms a pending, understood statement. */
export function isAffirmation(raw: string): boolean {
  return /^\s*(y|ya|yes|yep|yeah|yup|correct|right|that'?s right|confirm|save it|do it|sounds good|ok|okay)\b/i.test(
    raw ?? "",
  );
}

/** True when a reply rejects a pending statement. */
export function isRejection(raw: string): boolean {
  return /^\s*(n|no|nope|nah|wrong|not right|cancel|don'?t)\b/i.test(raw ?? "");
}
