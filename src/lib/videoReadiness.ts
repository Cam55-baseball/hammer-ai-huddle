/**
 * Pure helpers for computing engine-readiness of a video draft or saved video.
 * Single source of truth for the "is this ready for recommendations?" rule.
 *
 * The same logic is mirrored in the `library_videos_readiness` SQL view; keep
 * the two in sync if the rule ever changes.
 */

export interface VideoDraft {
  videoFormat?: string | null;
  skillDomains?: string[] | null;
  aiDescription?: string | null;
  assignmentCount?: number | null;
}

export interface MissingField {
  key: 'video_format' | 'skill_domains' | 'ai_description' | 'tag_assignments';
  message: string;
}

export const MISSING_LABELS: Record<MissingField['key'], string> = {
  video_format: 'format',
  skill_domains: 'skill',
  ai_description: 'description',
  tag_assignments: 'tags',
};

export function computeMissingFields(draft: VideoDraft): MissingField[] {
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

export function isVideoReady(draft: VideoDraft): boolean {
  return computeMissingFields(draft).length === 0;
}
