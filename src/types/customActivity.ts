export type ActivityType = 
  | 'workout' 
  | 'running' 
  | 'meal' 
  | 'warmup' 
  | 'recovery' 
  | 'practice' 
  | 'short_practice' 
  | 'free_session';

export type IntensityLevel = 'light' | 'moderate' | 'high' | 'max';

export interface Exercise {
  id: string;
  name: string;
  type: 'strength' | 'cardio' | 'flexibility' | 'plyometric' | 'baseball' | 'core' | 'other';
  sets?: number;
  reps?: number | string; // can be "10-12" or number
  duration?: number; // in seconds
  rest?: number; // in seconds
  intensity?: number; // percentage 0-100
  weight?: number;
  weightUnit?: 'lbs' | 'kg';
  notes?: string;
  // Superset support
  supersetGroupId?: string; // Groups exercises into supersets
  supersetOrder?: number;   // Order within superset (1, 2, 3)
}

export interface MealItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

export interface Vitamin {
  id: string;
  name: string;
  dosage?: string;
  timing?: 'morning' | 'afternoon' | 'evening' | 'with_meal';
}

export interface Supplement {
  id: string;
  name: string;
  dosage?: string;
  timing?: string;
}

export interface HydrationData {
  amount: number;
  unit: 'oz' | 'ml' | 'cups' | 'liters';
  goal?: number;
  entries?: Array<{ id: string; time: string; amount: number }>;
}

export interface MealData {
  items: MealItem[];
  vitamins: Vitamin[];
  supplements: Supplement[];
  hydration?: HydrationData;
  totalCalories?: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFats?: number;
}

export interface RunningInterval {
  id: string;
  type: 'run' | 'walk' | 'sprint' | 'jog' | 'rest';
  duration?: number; // in seconds
  distance?: number;
  distanceUnit?: 'miles' | 'km' | 'meters';
  pace?: string;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'number' | 'time' | 'checkbox';
  notes?: string;
}

export interface EmbeddedRunningSession {
  id: string;
  distance_value?: number;
  distance_unit?: 'feet' | 'yards' | 'meters' | 'miles' | 'kilometers';
  time_goal?: string; // H:MM:SS.T format
  pace_goal?: string;
}

export interface CustomActivityTemplate {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  icon: string;
  color: string;
  exercises: Exercise[];
  meals: MealData;
  custom_fields: CustomField[];
  duration_minutes?: number;
  intensity?: IntensityLevel;
  distance_value?: number;
  distance_unit?: 'feet' | 'yards' | 'meters' | 'miles' | 'kilometers';
  pace_value?: string; // H:MM:SS.T format for time goals
  intervals: RunningInterval[];
  is_favorited: boolean;
  recurring_days: number[]; // 0-6 (Sunday-Saturday)
  recurring_active: boolean;
  sport: 'baseball' | 'softball';
  embedded_running?: EmbeddedRunningSession; // Deprecated - use embedded_running_sessions
  embedded_running_sessions?: EmbeddedRunningSession[];
  // Card customization
  display_nickname?: string;
  custom_logo_url?: string;
  // Reminder settings
  reminder_enabled?: boolean;
  reminder_time?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomActivityLog {
  id: string;
  user_id: string;
  template_id: string;
  entry_date: string;
  completed: boolean;
  completed_at?: string;
  actual_duration_minutes?: number;
  notes?: string;
  performance_data: Record<string, any>;
  created_at: string;
  template?: CustomActivityTemplate;
}

export interface CustomActivityWithLog {
  template: CustomActivityTemplate;
  log?: CustomActivityLog;
  isRecurring: boolean;
  isScheduledForToday: boolean;
}

// Icon options for activities
export const ACTIVITY_ICONS = [
  'dumbbell', 'flame', 'heart', 'zap', 'target', 'trophy',
  'timer', 'activity', 'footprints', 'utensils', 'moon', 'sun',
  'coffee', 'apple', 'salad', 'pill', 'stretch', 'bike',
  'baseball', 'users', 'clipboard', 'pencil', 'star', 'sparkles'
] as const;

// Color presets for activities
export const ACTIVITY_COLORS = [
  { name: 'Crimson', value: '#dc2626' },
  { name: 'Ocean', value: '#0ea5e9' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Sunset', value: '#f97316' },
  { name: 'Slate', value: '#64748b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Indigo', value: '#6366f1' },
] as const;
