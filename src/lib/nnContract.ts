// Phase 12 — Non-Negotiable context contract.
// Single source of truth for what an NN card must contain before it can render.
// If any required field is missing or matches a forbidden shorthand pattern,
// `buildNNContext` returns null and the render guard drops the card.

export interface NNContext {
  title: string;
  purpose: string;
  action: string;
  successCriteria: string;
  source: string;
}

// Shorthand strings that must NEVER reach the UI as a title.
const FORBIDDEN_TITLE_PATTERNS: RegExp[] = [
  /^\s*phase\s*\d+/i,           // "PHASE 9 ...", "Phase 12 NN"
  /\bnn\s*:/i,                  // "NN: foo"
  /\bphase\s*\d+\s*nn\b/i,      // "Phase 9 NN"
];

const MIN_LEN = 4;

function clean(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function isForbiddenTitle(title: string): boolean {
  return FORBIDDEN_TITLE_PATTERNS.some((re) => re.test(title));
}

/**
 * Build a validated NN context from a raw template row.
 * Accepts loose `unknown` to tolerate legacy / partially-typed callers.
 *
 * Returns null if the template cannot be presented to a user with full clarity.
 * Callers MUST handle null by skipping the render.
 */
export function buildNNContext(tpl: any): NNContext | null {
  if (!tpl || typeof tpl !== 'object') return null;

  // Map preferred structured fields, with description -> action fallback
  // and template title as the only acceptable title source.
  const title = clean(tpl.title);
  const purpose = clean(tpl.purpose);
  const description = clean(tpl.description);
  const action = clean(tpl.action) || description;
  const successCriteria = clean(tpl.success_criteria);
  const source = clean(tpl.source) || 'Custom';

  // Hard requirements
  if (!title || title.length < MIN_LEN) return null;
  if (isForbiddenTitle(title)) return null;
  if (!action || action.length < MIN_LEN) return null;

  // Purpose + successCriteria are required for full structured rendering,
  // but we provide minimal safe defaults derived from the template so legacy
  // user-authored NNs (which only have title + description) still render
  // with a clear, honest body — never with "PHASE 9 NN" shorthand.
  const safePurpose = purpose || 'Locked-in daily standard.';
  const safeSuccess = successCriteria || 'Logged complete on the day.';

  return {
    title,
    purpose: safePurpose,
    action,
    successCriteria: safeSuccess,
    source,
  };
}
