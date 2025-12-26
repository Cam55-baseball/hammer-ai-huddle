import { CustomActivityTemplate } from './customActivity';

export type LockableField = 
  | 'title' 
  | 'description' 
  | 'type' 
  | 'timing' 
  | 'exercises' 
  | 'meals' 
  | 'running' 
  | 'custom_fields' 
  | 'schedule' 
  | 'appearance';

export const LOCKABLE_FIELDS: { key: LockableField; labelKey: string; descriptionKey: string }[] = [
  { key: 'title', labelKey: 'sentActivity.locks.title', descriptionKey: 'sentActivity.locks.titleDesc' },
  { key: 'description', labelKey: 'sentActivity.locks.description', descriptionKey: 'sentActivity.locks.descriptionDesc' },
  { key: 'type', labelKey: 'sentActivity.locks.type', descriptionKey: 'sentActivity.locks.typeDesc' },
  { key: 'timing', labelKey: 'sentActivity.locks.timing', descriptionKey: 'sentActivity.locks.timingDesc' },
  { key: 'exercises', labelKey: 'sentActivity.locks.exercises', descriptionKey: 'sentActivity.locks.exercisesDesc' },
  { key: 'meals', labelKey: 'sentActivity.locks.meals', descriptionKey: 'sentActivity.locks.mealsDesc' },
  { key: 'running', labelKey: 'sentActivity.locks.running', descriptionKey: 'sentActivity.locks.runningDesc' },
  { key: 'custom_fields', labelKey: 'sentActivity.locks.customFields', descriptionKey: 'sentActivity.locks.customFieldsDesc' },
  { key: 'schedule', labelKey: 'sentActivity.locks.schedule', descriptionKey: 'sentActivity.locks.scheduleDesc' },
  { key: 'appearance', labelKey: 'sentActivity.locks.appearance', descriptionKey: 'sentActivity.locks.appearanceDesc' },
];

export type LockPreset = 'none' | 'lock_all' | 'lock_structure' | 'lock_basics' | 'custom';

export const LOCK_PRESETS: { key: LockPreset; labelKey: string; fields: LockableField[] }[] = [
  { key: 'none', labelKey: 'sentActivity.presets.none', fields: [] },
  { key: 'lock_all', labelKey: 'sentActivity.presets.lockAll', fields: ['title', 'description', 'type', 'timing', 'exercises', 'meals', 'running', 'custom_fields', 'schedule', 'appearance'] },
  { key: 'lock_structure', labelKey: 'sentActivity.presets.lockStructure', fields: ['exercises', 'meals', 'running', 'custom_fields'] },
  { key: 'lock_basics', labelKey: 'sentActivity.presets.lockBasics', fields: ['title', 'type', 'description'] },
  { key: 'custom', labelKey: 'sentActivity.presets.custom', fields: [] },
];

export interface SentActivityTemplate {
  id: string;
  sender_id: string;
  template_id: string;
  template_snapshot: CustomActivityTemplate;
  recipient_id: string;
  locked_fields: LockableField[];
  status: 'pending' | 'accepted' | 'rejected';
  accepted_template_id?: string;
  message?: string;
  sent_at: string;
  responded_at?: string;
  // Joined data
  sender?: { full_name: string; avatar_url: string | null };
}

export interface FollowedPlayer {
  id: string;
  full_name: string;
  avatar_url: string | null;
  position: string | null;
}
