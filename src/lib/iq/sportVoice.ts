/**
 * Game IQ — sport-respective voice.
 * ------------------------------------------------------------------
 * Situation text is authored in baseball-default language. Softball is not
 * "baseball with different words" — a runner who leads off before release is
 * out, there is no stretch, the pitcher works from a circle, and the bases sit
 * at 60 feet. Teaching a softball athlete the baseball phrasing teaches the
 * wrong picture, which is exactly what Game IQ exists to prevent.
 *
 * This is a presentation-layer rewrite only: pure, deterministic, and applied
 * at render. Nothing is authored back into the ledger or the situation rows.
 */

type Rule = { re: RegExp; to: string };

/** Longest / most specific phrases first — first match wins per pass. */
const SOFTBALL_RULES: Rule[] = [
  { re: /\b60 feet,? 6 inches\b/gi, to: "43 feet" },
  { re: /\b60'6"?\b/g, to: "43 feet" },
  { re: /\b90 feet\b/gi, to: "60 feet" },
  { re: /\bmound visit\b/gi, to: "circle visit" },
  { re: /\bon the mound\b/gi, to: "in the circle" },
  { re: /\boff the mound\b/gi, to: "out of the circle" },
  { re: /\bthe mound\b/gi, to: "the circle" },
  { re: /\bmound\b/gi, to: "circle" },
  { re: /\bfrom the stretch\b/gi, to: "from the plate" },
  { re: /\bthe stretch\b/gi, to: "the set position" },
  { re: /\bwind-?up\b/gi, to: "windmill delivery" },
  { re: /\bbalks?\b/gi, to: "illegal pitch" },
  { re: /\bleads? off early\b/gi, to: "leaves before release" },
  { re: /\bleading off\b/gi, to: "leaving on release" },
  { re: /\bprimary lead\b/gi, to: "release jump" },
  { re: /\bsecondary lead\b/gi, to: "second-step jump" },
];

function matchCase(source: string, replacement: string): string {
  if (!source) return replacement;
  const firstAlpha = source.search(/[A-Za-z]/);
  if (firstAlpha < 0) return replacement;
  const isUpper = source[firstAlpha] === source[firstAlpha].toUpperCase();
  if (!isUpper) return replacement;
  const idx = replacement.search(/[A-Za-z]/);
  if (idx < 0) return replacement;
  return (
    replacement.slice(0, idx) +
    replacement[idx].toUpperCase() +
    replacement.slice(idx + 1)
  );
}

export type IqSport = "baseball" | "softball";

/**
 * Rewrite baseball-authored Game IQ copy into the athlete's sport voice.
 * Baseball is a pass-through. Pure and deterministic.
 */
export function iqVoice(
  text: string | null | undefined,
  sport: IqSport,
): string {
  if (!text) return text ?? "";
  if (sport !== "softball") return text;
  let out = text;
  for (const rule of SOFTBALL_RULES) {
    out = out.replace(rule.re, (m) => matchCase(m, rule.to));
  }
  return out;
}

/** Convenience for optional fields — preserves null so callers can branch. */
export function iqVoiceOrNull(
  text: string | null | undefined,
  sport: IqSport,
): string | null {
  if (text === null || text === undefined || text === "") return null;
  return iqVoice(text, sport);
}
