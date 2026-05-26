/**
 * Plain-language swap table. Pure: same input → same output. Never alters
 * numeric values, confidence labels, or lineage tokens.
 */
const PLAIN: Record<string, string> = {
  "Survivability ceiling": "Safe-for-today limit",
  "Recovery debt": "Recovery still needed",
  "Hybrid ceiling": "Mixed-output limit",
  "Confidence": "How sure we are",
  "Lineage": "Why this answer",
};

export function simplify(text: string, on: boolean): string {
  if (!on) return text;
  let out = text;
  for (const [k, v] of Object.entries(PLAIN)) {
    out = out.split(k).join(v);
  }
  return out;
}
