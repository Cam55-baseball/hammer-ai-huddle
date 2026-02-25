export interface ActivityFolder {
  id: string;
  owner_id: string;
  owner_type: 'coach' | 'player';
  name: string;
  description: string | null;
  label: string | null;
  sport: string;
  start_date: string | null;
  end_date: string | null;
  frequency_days: number[] | null;
  cycle_type: string | null;
  cycle_length_weeks: number | null;
  placement: 'before' | 'after' | 'separate_day' | 'layered';
  priority_level: number;
  status: 'draft' | 'active' | 'completed' | 'archived';
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityFolderItem {
  id: string;
  folder_id: string;
  title: string;
  description: string | null;
  item_type: string | null;
  assigned_days: number[] | null;
  cycle_week: number | null;
  order_index: number;
  exercises: any | null;
  attachments: FolderAttachment[] | null;
  duration_minutes: number | null;
  notes: string | null;
  completion_tracking: boolean;
  created_at: string;
}

export interface FolderAttachment {
  type: 'video' | 'pdf' | 'link';
  url: string;
  name: string;
}

export interface FolderAssignment {
  id: string;
  folder_id: string;
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined';
  accepted_at: string | null;
  declined_at: string | null;
  sent_at: string;
  player_notes: any | null;
  // Enriched fields
  folder?: ActivityFolder;
  sender?: { full_name: string; avatar_url: string | null };
  items?: ActivityFolderItem[];
}

export interface FolderItemCompletion {
  id: string;
  folder_item_id: string;
  user_id: string;
  folder_assignment_id: string | null;
  entry_date: string;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
}

export type FolderLabel = 'offseason' | 'in_season' | 'recovery' | 'preseason' | 'general';

export const FOLDER_LABELS: { value: FolderLabel; label: string }[] = [
  { value: 'offseason', label: 'Off-Season' },
  { value: 'in_season', label: 'In-Season' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'preseason', label: 'Pre-Season' },
  { value: 'general', label: 'General' },
];

export const ITEM_TYPES = [
  { value: 'exercise', label: 'Exercise' },
  { value: 'skill_work', label: 'Skill Work' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'activity', label: 'Activity' },
  { value: 'custom', label: 'Custom' },
];

export const PLACEMENT_OPTIONS = [
  { value: 'before', label: 'Before Workout' },
  { value: 'after', label: 'After Workout' },
  { value: 'separate_day', label: 'Separate Days' },
  { value: 'layered', label: 'Layered Within' },
];

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getCurrentCycleWeek(startDate: string, cycleLengthWeeks: number): number {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const daysSinceStart = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeksSinceStart = Math.floor(daysSinceStart / 7);
  return (weeksSinceStart % cycleLengthWeeks) + 1;
}
