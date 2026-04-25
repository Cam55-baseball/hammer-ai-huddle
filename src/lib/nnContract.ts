// Phase 12.1 — Strict Non-Negotiable contract.
// No defaults. No filler. No salvage. If a template can't be presented
// with full, specific, actionable context, it does not render.

export interface NNContext {
  title: string;
  purpose: string;
  action: string;
  successCriteria: string;
  source: string;
}

export interface NNFieldErrors {
  title: string | null;
  purpose: string | null;
  action: string | null;
  successCriteria: string | null;
}

export interface NNValidationResult {
  ok: boolean;
  errors: NNFieldErrors;
}

// Length thresholds (Phase 12.1)
const TITLE_MIN = 6;
const PURPOSE_MIN = 10;
const ACTION_MIN = 10;
const SUCCESS_MIN = 8;

// Shorthand patterns that must NEVER reach the UI as a title.
const FORBIDDEN_TITLE_PATTERNS: RegExp[] = [
  /^\s*phase\s*\d+/i,
  /\bnn\s*:/i,
  /\bphase\s*\d+\s*nn\b/i,
];

// Generic single/two-word titles that carry no information on their own.
// Compared against the entire trimmed, lowercased title.
const GENERIC_TITLE_BLOCKLIST = new Set<string>([
  'activity',
  'task',
  'standard',
  'non-negotiable',
  'non negotiable',
  'nn',
  'daily',
  'reset',
  'focus',
  'mental reset',
  'be disciplined',
  'stay focused',
  'discipline',
  'mindset',
]);

// Vague placeholders for purpose/action/success. Compared against the entire
// trimmed, lowercased value — single-word or stock-phrase entries fail.
const VAGUE_CONTENT_BLOCKLIST = new Set<string>([
  'stay focused',
  'be disciplined',
  'mental reset',
  'do it',
  'be consistent',
  'stay locked in',
  'lock in',
  'lock it in',
  'focus',
  'discipline',
  'reset',
  'be ready',
  'show up',
  'just do it',
  'get it done',
  'do the work',
  'do work',
  'work hard',
  'consistency',
  'mindset',
]);

function clean(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function isForbiddenTitle(title: string): boolean {
  if (FORBIDDEN_TITLE_PATTERNS.some((re) => re.test(title))) return true;
  if (GENERIC_TITLE_BLOCKLIST.has(title.toLowerCase())) return true;
  return false;
}

function isVagueContent(value: string): boolean {
  return VAGUE_CONTENT_BLOCKLIST.has(value.toLowerCase());
}

/**
 * Validate raw NN field values against the strict contract.
 * Used by the builder to drive disabled state + inline errors. Mirrors the
 * exact rules `buildNNContext` enforces, so anything the user can save
 * is guaranteed to render.
 */
export function validateNNFields(fields: {
  title: string;
  purpose: string;
  action: string;
  successCriteria: string;
}): NNValidationResult {
  const title = clean(fields.title);
  const purpose = clean(fields.purpose);
  const action = clean(fields.action);
  const successCriteria = clean(fields.successCriteria);

  const errors: NNFieldErrors = {
    title: null,
    purpose: null,
    action: null,
    successCriteria: null,
  };

  if (!title) {
    errors.title = 'Title is required.';
  } else if (title.length < TITLE_MIN) {
    errors.title = `Title must be at least ${TITLE_MIN} characters.`;
  } else if (isForbiddenTitle(title)) {
    errors.title = 'Title is too generic. Be specific (e.g. "Pre-Game Visualization").';
  }

  if (!purpose) {
    errors.purpose = 'Purpose is required.';
  } else if (purpose.length < PURPOSE_MIN) {
    errors.purpose = `Purpose must be at least ${PURPOSE_MIN} characters and explain why this exists.`;
  } else if (isVagueContent(purpose)) {
    errors.purpose = 'Purpose is too vague. Explain why this matters today.';
  }

  if (!action) {
    errors.action = 'Action is required.';
  } else if (action.length < ACTION_MIN) {
    errors.action = `Action must be at least ${ACTION_MIN} characters and describe exactly what to do.`;
  } else if (isVagueContent(action)) {
    errors.action = 'Action is too vague. Describe the exact steps.';
  }

  if (!successCriteria) {
    errors.successCriteria = 'Success Criteria is required.';
  } else if (successCriteria.length < SUCCESS_MIN) {
    errors.successCriteria = `Success Criteria must be at least ${SUCCESS_MIN} characters.`;
  } else if (isVagueContent(successCriteria)) {
    errors.successCriteria = 'Success Criteria is too vague. Describe how you know it\'s done.';
  }

  const ok =
    !errors.title && !errors.purpose && !errors.action && !errors.successCriteria;
  return { ok, errors };
}

/**
 * Build a validated NN context from a raw template row.
 * Returns null if the template fails the strict contract — no defaults,
 * no filler, no salvage. Callers MUST handle null by skipping the render.
 */
export function buildNNContext(tpl: any): NNContext | null {
  if (!tpl || typeof tpl !== 'object') return null;

  const title = clean(tpl.title);
  const purpose = clean(tpl.purpose);
  // Description fallback survives ONLY if it itself meets the strict bar.
  const rawAction = clean(tpl.action) || clean(tpl.description);
  const action = rawAction;
  const successCriteria = clean(tpl.success_criteria);
  const source = clean(tpl.source) || 'Custom';

  const { ok } = validateNNFields({ title, purpose, action, successCriteria });
  if (!ok) return null;

  return { title, purpose, action, successCriteria, source };
}
