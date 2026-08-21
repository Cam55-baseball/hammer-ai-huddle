/**
 * Pure helpers for computing engine-readiness of a video draft or saved video.
 * Single source of truth for the "is this ready for recommendations?" rule.
 *
 * The same logic is mirrored in the `library_videos_readiness` SQL view; keep
 * the two in sync if the rule ever changes.
 *
 * Two classes of video, two rule sets:
 *  - application (per-rep drill clips) → format + skill domain + description + 2 tags
 *  - foundation  (long-form A–Z)       → domain + scope + audience + triggers + description
 */

import type { FoundationMeta } from './foundationVideos';

export type VideoClass = 'application' | 'foundation';

export interface VideoDraft {
  videoFormat?: string | null;
  skillDomains?: string[] | null;
  aiDescription?: string | null;
  assignmentCount?: number | null;
  /** Defaults to 'application' when omitted (legacy callers). */
  videoClass?: VideoClass | null;
  foundationMeta?: Partial<FoundationMeta> | null;
}

export type MissingFieldKey =
  | 'video_format'
  | 'skill_domains'
  | 'ai_description'
  | 'tag_assignments'
  | 'foundation_domain'
  | 'foundation_scope'
  | 'foundation_audience'
  | 'foundation_triggers';

export interface MissingField {
  key: MissingFieldKey;
  message: string;
}

export const MISSING_LABELS: Record<MissingFieldKey, string> = {
  video_format: 'format',
  skill_domains: 'skill',
  ai_description: 'description',
  tag_assignments: 'tags',
  foundation_domain: 'topic',
  foundation_scope: 'scope',
  foundation_audience: 'audience',
  foundation_triggers: 'triggers',
};

export function computeMissingFields(draft: VideoDraft): MissingField[] {
  if ((draft.videoClass ?? 'application') === 'foundation') {
    return computeFoundationMissingFields(draft);
  }

  const missing: MissingField[] = [];
  if (!draft.videoFormat) {
    missing.push({ key: 'video_format', message: 'Add a format' });
  }
  if (!draft.skillDomains || draft.skillDomains.length === 0) {
    missing.push({ key: 'skill_domains', message: 'Add a skill' });
  }
  if (!draft.aiDescription || !draft.aiDescription.trim()) {
    missing.push({ key: 'ai_description', message: 'Write a description' });
  }
  if ((draft.assignmentCount ?? 0) < 2) {
    missing.push({ key: 'tag_assignments', message: 'Add at least 2 tags' });
  }
  return missing;
}

function computeFoundationMissingFields(draft: VideoDraft): MissingField[] {
  const m = draft.foundationMeta ?? null;
  const missing: MissingField[] = [];
  if (!m?.domain) missing.push({ key: 'foundation_domain', message: 'Pick a topic' });
  if (!m?.scope) missing.push({ key: 'foundation_scope', message: 'Pick a scope' });
  if (!m?.audience_levels || m.audience_levels.length === 0) {
    missing.push({ key: 'foundation_audience', message: 'Pick an audience level' });
  }
  if (!m?.refresher_triggers || m.refresher_triggers.length === 0) {
    missing.push({ key: 'foundation_triggers', message: 'Pick refresher triggers' });
  }
  if (!draft.aiDescription || !draft.aiDescription.trim()) {
    missing.push({ key: 'ai_description', message: 'Write a description' });
  }
  return missing;
}

export function isVideoReady(draft: VideoDraft): boolean {
  return computeMissingFields(draft).length === 0;
}
