// Phase 12.1/12.2 — Strict Non-Negotiable contract.
// No defaults. No filler. No salvage. If a template can't be presented
// with full, specific, actionable context AND a measurable completion rule,
// it does not render.

import type { NNCompletionBinding } from '@/types/customActivity';
import { trackNNInvalidDropped } from './nnTelemetry';

export interface NNContext {
  title: string;
  purpose: string;
  action: string;
  successCriteria: string;
  source: string;
  // Phase 12.2 — every NN now carries a verifiable completion rule.
  completion: NNCompletionBinding;
}

export interface NNFieldErrors {
  title: string | null;
  purpose: string | null;
  action: string | null;
  successCriteria: string | null;
  completion: string | null;
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

// Phase 12.2 — manual binary completion gate
const BINARY_SUCCESS_MIN = 12;
const BINARY_VERB_RE = /\b(complete[d]?|finish(ed|es)?|log(ged)?|record(ed)?|mark(ed)?|did|performed|hit|reach(ed)?)\b/i;

const TIMER_MIN_SECONDS = 30;
const TIMER_MAX_SECONDS = 3600;
const COUNT_MIN = 1;
const COUNT_MAX = 500;
const COUNT_LABEL_MIN = 3;

const ALLOWED_IN_APP_EVENTS = new Set([
  'NN_COMPLETED',
  'STANDARD_MET',
  'NIGHT_CHECKIN_COMPLETED',
]);

// Shorthand patterns that must NEVER reach the UI as a title.
const FORBIDDEN_TITLE_PATTERNS: RegExp[] = [
  /^\s*phase\s*\d+/i,
  /\bnn\s*:/i,
  /\bphase\s*\d+\s*nn\b/i,
];

// Generic single/two-word titles that carry no information on their own.
const GENERIC_TITLE_BLOCKLIST = new Set<string>([
  'activity', 'task', 'standard', 'non-negotiable', 'non negotiable', 'nn',
  'daily', 'reset', 'focus', 'mental reset', 'be disciplined', 'stay focused',
  'discipline', 'mindset',
]);

// Vague placeholders for purpose/action/success.
const VAGUE_CONTENT_BLOCKLIST = new Set<string>([
  'stay focused', 'be disciplined', 'mental reset', 'do it', 'be consistent',
  'stay locked in', 'lock in', 'lock it in', 'focus', 'discipline', 'reset',
  'be ready', 'show up', 'just do it', 'get it done', 'do the work', 'do work',
  'work hard', 'consistency', 'mindset',
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

function isInteger(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && Math.trunc(n) === n;
}

/**
 * Validate a completion contract against the strict rules.
 * Returns null on success, or a human-readable error string on failure.
 *
 * `successCriteria` is required for the binary-rule loophole check.
 * `templateId` is required when validating an in_app NN_COMPLETED self-binding.
 */
export function validateNNCompletion(
  type: unknown,
  binding: unknown,
  successCriteria: string,
  templateId?: string | null,
): string | null {
  if (type !== 'in_app' && type !== 'manual') {
    return 'Choose how this Non-Negotiable will be verified.';
  }
  if (!binding || typeof binding !== 'object') {
    return 'Completion rule is missing.';
  }
  const b = binding as any;

  if (type === 'in_app') {
    if (b.kind !== 'in_app') return 'Completion rule does not match the chosen type.';
    if (typeof b.event !== 'string' || !ALLOWED_IN_APP_EVENTS.has(b.event)) {
      return 'Choose a tracked in-app event.';
    }
    if (b.event === 'NN_COMPLETED') {
      const matchTpl = b?.match?.templateId;
      // Allow the builder sentinel; the save flow resolves it to the new id.
      if (matchTpl !== '__self__' && (!templateId || matchTpl !== templateId)) {
        return 'In-app NN binding must point to this activity.';
      }
    }
    return null;
  }

  // manual
  if (b.kind !== 'manual') return 'Completion rule does not match the chosen type.';
  const rule = b.rule;
  if (!rule || typeof rule !== 'object') return 'Pick a manual completion rule.';

  if (rule.type === 'timer') {
    if (!isInteger(rule.min_seconds)) return 'Timer length must be a whole number of seconds.';
    if (rule.min_seconds < TIMER_MIN_SECONDS || rule.min_seconds > TIMER_MAX_SECONDS) {
      return `Timer must be between ${TIMER_MIN_SECONDS} and ${TIMER_MAX_SECONDS} seconds.`;
    }
    return null;
  }

  if (rule.type === 'count') {
    if (!isInteger(rule.min_count)) return 'Count target must be a whole number.';
    if (rule.min_count < COUNT_MIN || rule.min_count > COUNT_MAX) {
      return `Count must be between ${COUNT_MIN} and ${COUNT_MAX}.`;
    }
    const label = clean(rule.label);
    if (label.length < COUNT_LABEL_MIN) return 'Count label is too short.';
    if (isVagueContent(label)) return 'Count label is too vague.';
    return null;
  }

  if (rule.type === 'binary') {
    const sc = clean(successCriteria);
    if (sc.length < BINARY_SUCCESS_MIN || !BINARY_VERB_RE.test(sc)) {
      return 'Binary confirmation requires a measurable Success Criteria (e.g. "Completed 3 sets").';
    }
    const label = clean(rule.confirm_label);
    if (label.length < COUNT_LABEL_MIN) return 'Confirmation label is too short.';
    return null;
  }

  return 'Manual rule type is invalid.';
}

/**
 * Validate raw NN field values + completion contract against the strict rules.
 * Mirrors the exact rules `buildNNContext` enforces, so anything the user can
 * save is guaranteed to render.
 */
export function validateNNFields(fields: {
  title: string;
  purpose: string;
  action: string;
  successCriteria: string;
  completionType?: unknown;
  completionBinding?: unknown;
  templateId?: string | null;
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
    completion: null,
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

  // Phase 12.2 — only validate completion if we have a chance of producing one.
  // (If completion fields are intentionally omitted from the call site, treat
  // it as a hard miss.)
  errors.completion = validateNNCompletion(
    fields.completionType,
    fields.completionBinding,
    successCriteria,
    fields.templateId ?? null,
  );

  const ok =
    !errors.title && !errors.purpose && !errors.action &&
    !errors.successCriteria && !errors.completion;
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
  const action = clean(tpl.action) || clean(tpl.description);
  const successCriteria = clean(tpl.success_criteria);
  const source = clean(tpl.source) || 'Custom';

  const completionType = tpl.completion_type;
  const completionBinding = tpl.completion_binding;

  const { ok } = validateNNFields({
    title,
    purpose,
    action,
    successCriteria,
    completionType,
    completionBinding,
    templateId: typeof tpl.id === 'string' ? tpl.id : null,
  });
  if (!ok) return null;

  return {
    title,
    purpose,
    action,
    successCriteria,
    source,
    completion: completionBinding as NNCompletionBinding,
  };
}
